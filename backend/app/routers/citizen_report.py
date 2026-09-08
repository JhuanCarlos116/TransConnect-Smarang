"""Citizen-submitted halte/bus stop condition reports.

Separate from the "Laporan Warga" sample layer (community-reports.geojson,
the team's own 42 survey points, explicitly labeled as placeholder data in
that pipeline) -- this is the real submission path: a citizen taps a point
on the public map, writes a description, optionally attaches a photo, and
it's saved here as genuine citizen-submitted data.
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
from app.schemas.citizen_report import CitizenReportOut

router = APIRouter()

UPLOAD_DIR = Path(__file__).resolve().parent.parent.parent / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

MAX_PHOTO_BYTES = 5 * 1024 * 1024  # 5 MB
CONTENT_TYPE_TO_EXT = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp"}


def _to_out(row: CitizenReport) -> CitizenReportOut:
    point = to_shape(row.geom)
    return CitizenReportOut(
        report_id=row.report_id,
        lat=point.y,
        lon=point.x,
        description=row.description,
        photo_url=row.photo_url,
        status=row.status,
        created_at=row.created_at,
    )


@router.get("/citizen-reports", response_model=list[CitizenReportOut])
async def list_citizen_reports(session: AsyncSession = Depends(get_session)) -> list[CitizenReportOut]:
    result = await session.execute(select(CitizenReport).order_by(CitizenReport.created_at.desc()))
    return [_to_out(row) for row in result.scalars().all()]


@router.post("/citizen-reports", response_model=CitizenReportOut, status_code=201)
async def create_citizen_report(
    lat: float = Form(...),
    lon: float = Form(...),
    description: str = Form(...),
    photo: UploadFile | None = File(None),
    session: AsyncSession = Depends(get_session),
) -> CitizenReportOut:
    if not description.strip():
        raise HTTPException(status_code=400, detail="Deskripsi laporan tidak boleh kosong.")

    photo_url = None
    if photo is not None and photo.filename:
        ext = CONTENT_TYPE_TO_EXT.get(photo.content_type or "")
        if not ext:
            raise HTTPException(status_code=400, detail="Format foto harus JPEG, PNG, atau WebP.")
        contents = await photo.read()
        if len(contents) > MAX_PHOTO_BYTES:
            raise HTTPException(status_code=400, detail="Ukuran foto maksimal 5 MB.")
        filename = f"{uuid.uuid4()}.{ext}"
        (UPLOAD_DIR / filename).write_bytes(contents)
        photo_url = f"/uploads/{filename}"

    report = CitizenReport(
        report_id=str(uuid.uuid4()),
        description=description.strip(),
        photo_url=photo_url,
        geom=WKTElement(f"POINT({lon} {lat})", srid=4326),
    )
    session.add(report)
    await session.commit()
    await session.refresh(report)
    return _to_out(report)
