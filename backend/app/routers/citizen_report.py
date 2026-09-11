"""Citizen-submitted halte/bus stop condition reports.

Separate from the "Laporan Warga" sample layer (community-reports.geojson,
the team's own 42 survey points, explicitly labeled as placeholder data in
that pipeline) -- this is the real submission path: a citizen picks an
existing surveyed halte on a map, writes a description (+ optional photo/
video), and it's saved here as genuine citizen-submitted data, tied to that
halte so DISHUB's dashboard can show it under the halte it's about.
"""

import uuid
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from geoalchemy2 import WKTElement
from geoalchemy2.shape import to_shape
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_session
from app.models.citizen_report import CitizenReport
from app.models.halte import HalteSurvey
from app.schemas.citizen_report import CitizenReportOut
from app.services.condition_score import FACILITY_VARIABLES, UNKNOWN_STATE, compute_condition_score
from app.services.photo_detection import analyze_photo, render_annotated

router = APIRouter()

UPLOAD_DIR = Path(__file__).resolve().parent.parent.parent / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

MAX_PHOTO_BYTES = 5 * 1024 * 1024  # 5 MB
MAX_VIDEO_BYTES = 25 * 1024 * 1024  # 25 MB -- video files run bigger than photos
PHOTO_CONTENT_TYPE_TO_EXT = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp"}
VIDEO_CONTENT_TYPE_TO_EXT = {"video/mp4": "mp4", "video/webm": "webm", "video/quicktime": "mov"}


def _to_out(row: CitizenReport, halte_updated: dict[str, str] | None = None) -> CitizenReportOut:
    point = to_shape(row.geom)
    return CitizenReportOut(
        report_id=row.report_id,
        halte_id=row.halte_id,
        reporter_name=row.reporter_name,
        lat=point.y,
        lon=point.x,
        description=row.description,
        photo_url=row.photo_url,
        photo_annotated_url=row.photo_annotated_url,
        video_url=row.video_url,
        status=row.status,
        created_at=row.created_at,
        ai_detections=row.ai_detections,
        ai_analyzed_at=row.ai_analyzed_at,
        # On the POST response the caller passes what it just applied. On a GET
        # it is read back out of the stored analysis, so the dashboard can show
        # "this photo changed these variables" for reports submitted earlier in
        # the session too, not just the one being created right now.
        halte_updated=halte_updated if halte_updated is not None else (row.ai_detections or {}).get("applied", {}),
    )


def _apply_to_survey(halte: HalteSurvey, observed: dict[str, str]) -> dict[str, str]:
    """Write detector findings onto the halte's survey row.

    Only fills variables the field survey left unknown (UNKNOWN_STATE), so a
    citizen photo can add evidence but can never overwrite or weaken a value
    a surveyor actually recorded -- and, per photo_detection's presence-only
    rule, never marks something absent. Re-scores the halte only when
    something actually changed, so a photo that tells us nothing new leaves
    the stored score untouched.

    Anything written is tagged `"ai"` in facility_sources, which is what lets
    the dashboard mark a value as machine-written so a dispatcher knows which
    ones are worth double-checking (the model gets lighting and signage wrong
    most often, and has no CCTV class at all).
    """
    applied: dict[str, str] = {}
    for facility, value in observed.items():
        if getattr(halte, facility, None) == UNKNOWN_STATE:
            setattr(halte, facility, value)
            applied[facility] = value

    if applied:
        halte.condition_score, halte.condition_label = compute_condition_score(
            {facility: getattr(halte, facility) for facility in FACILITY_VARIABLES}
        )
        # Reassign the whole dict: SQLAlchemy does not track changes made
        # inside a JSONB value, so an in-place update would not persist.
        halte.facility_sources = {**(halte.facility_sources or {}), **{f: "ai" for f in applied}}
    return applied


async def _save_upload(
    upload: UploadFile, content_type_to_ext: dict[str, str], max_bytes: int, bad_format_detail: str, too_big_detail: str
) -> str:
    ext = content_type_to_ext.get(upload.content_type or "")
    if not ext:
        raise HTTPException(status_code=400, detail=bad_format_detail)
    contents = await upload.read()
    if len(contents) > max_bytes:
        raise HTTPException(status_code=400, detail=too_big_detail)
    filename = f"{uuid.uuid4()}.{ext}"
    (UPLOAD_DIR / filename).write_bytes(contents)
    return f"/uploads/{filename}"


@router.get("/citizen-reports", response_model=list[CitizenReportOut])
async def list_citizen_reports(
    halte_id: str | None = None, session: AsyncSession = Depends(get_session)
) -> list[CitizenReportOut]:
    query = select(CitizenReport).order_by(CitizenReport.created_at.desc())
    if halte_id is not None:
        query = query.where(CitizenReport.halte_id == halte_id)
    result = await session.execute(query)
    return [_to_out(row) for row in result.scalars().all()]


@router.post("/citizen-reports", response_model=CitizenReportOut, status_code=201)
async def create_citizen_report(
    lat: float = Form(...),
    lon: float = Form(...),
    halte_id: str = Form(...),
    reporter_name: str = Form(...),
    description: str = Form(...),
    photo: UploadFile | None = File(None),
    video: UploadFile | None = File(None),
    session: AsyncSession = Depends(get_session),
) -> CitizenReportOut:
    if not description.strip():
        raise HTTPException(status_code=400, detail="Deskripsi laporan tidak boleh kosong.")
    if not reporter_name.strip():
        raise HTTPException(status_code=400, detail="Nama pelapor tidak boleh kosong.")

    halte = await session.get(HalteSurvey, halte_id)
    if halte is None:
        raise HTTPException(status_code=404, detail="Halte tidak ditemukan.")

    photo_url = None
    if photo is not None and photo.filename:
        photo_url = await _save_upload(
            photo,
            PHOTO_CONTENT_TYPE_TO_EXT,
            MAX_PHOTO_BYTES,
            "Format foto harus JPEG, PNG, atau WebP.",
            "Ukuran foto maksimal 5 MB.",
        )

    video_url = None
    if video is not None and video.filename:
        video_url = await _save_upload(
            video,
            VIDEO_CONTENT_TYPE_TO_EXT,
            MAX_VIDEO_BYTES,
            "Format video harus MP4, WebM, atau MOV.",
            "Ukuran video maksimal 25 MB.",
        )

    # Read the photo with the infrastructure detector before saving the
    # report, so the halte's survey row can be updated with whatever the
    # photo proves. analyze_photo never raises -- if the detector is down the
    # report is still saved, with the failure recorded in ai_detections.
    ai_detections = None
    ai_analyzed_at = None
    halte_updated: dict[str, str] = {}
    annotated_url = None
    if photo_url is not None:
        saved_photo = UPLOAD_DIR / Path(photo_url).name
        analysis = analyze_photo(saved_photo)
        ai_detections = analysis.as_jsonb()
        ai_analyzed_at = datetime.now(timezone.utc)
        halte_updated = _apply_to_survey(halte, analysis.observed)
        # Stored with the analysis so a GET can report what this photo changed
        # on the survey row, not only the POST that applied it.
        ai_detections["applied"] = halte_updated

        # The annotated copy is what DISHUB sees: the dispatcher looks at one
        # picture and sees what the model saw, instead of cross-reading a
        # class list against a raw photo. Only rendered when there is
        # something to draw -- otherwise it would just duplicate photo_url.
        # A failure here costs the annotation, never the report.
        if analysis.detections:
            annotated_bytes = render_annotated(saved_photo)
            if annotated_bytes:
                annotated_name = f"{Path(photo_url).stem}.annotated.jpg"
                (UPLOAD_DIR / annotated_name).write_bytes(annotated_bytes)
                annotated_url = f"/uploads/{annotated_name}"

    report = CitizenReport(
        report_id=str(uuid.uuid4()),
        halte_id=halte_id,
        reporter_name=reporter_name.strip(),
        description=description.strip(),
        photo_url=photo_url,
        photo_annotated_url=annotated_url,
        video_url=video_url,
        geom=WKTElement(f"POINT({lon} {lat})", srid=4326),
        ai_detections=ai_detections,
        ai_analyzed_at=ai_analyzed_at,
    )
    session.add(report)
    await session.commit()
    await session.refresh(report)
    return _to_out(report, halte_updated)
