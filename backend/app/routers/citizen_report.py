"""Citizen-submitted halte/bus stop condition reports.

Separate from the "Laporan Warga" sample layer (community-reports.geojson,
the team's own 42 survey points, explicitly labeled as placeholder data in
that pipeline) -- this is the real submission path: a citizen picks an
existing surveyed halte on a map, writes a description (+ optional photo/
video), and it's saved here as genuine citizen-submitted data, tied to that
halte so DISHUB's dashboard can show it under the halte it's about.
"""

import uuid
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

router = APIRouter()

UPLOAD_DIR = Path(__file__).resolve().parent.parent.parent / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

MAX_PHOTO_BYTES = 5 * 1024 * 1024  # 5 MB
MAX_VIDEO_BYTES = 25 * 1024 * 1024  # 25 MB -- video files run bigger than photos
PHOTO_CONTENT_TYPE_TO_EXT = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp"}
VIDEO_CONTENT_TYPE_TO_EXT = {"video/mp4": "mp4", "video/webm": "webm", "video/quicktime": "mov"}


def _to_out(row: CitizenReport) -> CitizenReportOut:
    point = to_shape(row.geom)
    return CitizenReportOut(
        report_id=row.report_id,
        halte_id=row.halte_id,
        reporter_name=row.reporter_name,
        lat=point.y,
        lon=point.x,
        description=row.description,
        photo_url=row.photo_url,
        video_url=row.video_url,
        status=row.status,
        created_at=row.created_at,
    )


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

    report = CitizenReport(
        report_id=str(uuid.uuid4()),
        halte_id=halte_id,
        reporter_name=reporter_name.strip(),
        description=description.strip(),
        photo_url=photo_url,
        video_url=video_url,
        geom=WKTElement(f"POINT({lon} {lat})", srid=4326),
    )
    session.add(report)
    await session.commit()
    await session.refresh(report)
    return _to_out(report)
