"""Policy & Task Dispatcher Dashboard (PRD roadmap item, after Safe Transit
Navigator).

Every task is created from a specific surveyed halte (see POST /tasks) so it
always traces back to a real field finding -- condition_score, catatan_lapangan
-- rather than being an unlinked ad-hoc to-do. "assigned_to" is a plain text
field, not a foreign key to a staff account: this project has no login/account
system (see AppHeader's own history note on the fake "Sesi Aktif (Admin)"
profile menu it removed for exactly this reason), so a real relation here
would just be a differently-shaped version of the same fabrication.
"""

import json
import uuid

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_session
from app.models.citizen_report import CitizenReport
from app.models.halte import HalteSurvey
from app.models.task import MaintenanceTask
from app.routers.citizen_report import PHOTO_CONTENT_TYPE_TO_EXT, VIDEO_CONTENT_TYPE_TO_EXT, _save_upload
from app.schemas.task import ApprovedRepairPhoto, FacilityState, TaskCreate, TaskOut, TaskStatusUpdate
from app.services.condition_score import FACILITY_VARIABLES, compute_condition_score

router = APIRouter()

MAX_TECHNICIAN_PHOTO_BYTES = 5 * 1024 * 1024  # 5 MB, same cap as citizen_report's photo
MAX_TECHNICIAN_VIDEO_BYTES = 25 * 1024 * 1024  # 25 MB, same cap as citizen_report's video


def _to_out(task: MaintenanceTask, halte: HalteSurvey) -> TaskOut:
    return TaskOut(
        task_id=task.task_id,
        halte_id=task.halte_id,
        citizen_report_id=task.citizen_report_id,
        nama_halte=halte.nama_halte,
        kelurahan=halte.kelurahan,
        condition_label=halte.condition_label,
        description=task.description,
        assigned_to=task.assigned_to,
        status=task.status,
        technician_report=task.technician_report,
        technician_photo_url=task.technician_photo_url,
        technician_video_url=task.technician_video_url,
        approved_for_public=task.approved_for_public,
        facility_updates=task.facility_updates,
        facility_updates_approved=task.facility_updates_approved,
        created_at=task.created_at,
        updated_at=task.updated_at,
    )


@router.get("/tasks", response_model=list[TaskOut])
async def list_tasks(halte_id: str | None = None, session: AsyncSession = Depends(get_session)) -> list[TaskOut]:
    query = (
        select(MaintenanceTask, HalteSurvey)
        .join(HalteSurvey, MaintenanceTask.halte_id == HalteSurvey.halte_id)
        .order_by(MaintenanceTask.created_at.desc())
    )
    if halte_id is not None:
        query = query.where(MaintenanceTask.halte_id == halte_id)
    result = await session.execute(query)
    return [_to_out(task, halte) for task, halte in result.all()]


@router.get("/halte/{halte_id}/repair-photos", response_model=list[ApprovedRepairPhoto])
async def list_approved_repair_photos(
    halte_id: str, session: AsyncSession = Depends(get_session)
) -> list[ApprovedRepairPhoto]:
    """Public-facing (HaltePublicModal) -- only DISHUB-approved technician
    photos for this halte, none of the surrounding task/dispatch detail."""
    result = await session.execute(
        select(MaintenanceTask)
        .where(MaintenanceTask.halte_id == halte_id, MaintenanceTask.approved_for_public.is_(True))
        .order_by(MaintenanceTask.updated_at.desc())
    )
    return [
        ApprovedRepairPhoto(
            technician_report=task.technician_report or "",
            technician_photo_url=task.technician_photo_url,
            updated_at=task.updated_at,
        )
        for task in result.scalars().all()
        if task.technician_photo_url
    ]


@router.post("/tasks", response_model=TaskOut, status_code=201)
async def create_task(body: TaskCreate, session: AsyncSession = Depends(get_session)) -> TaskOut:
    halte = await session.get(HalteSurvey, body.halte_id)
    if halte is None:
        raise HTTPException(status_code=404, detail="Halte tidak ditemukan.")

    citizen_report = None
    if body.citizen_report_id is not None:
        citizen_report = await session.get(CitizenReport, body.citizen_report_id)
        if citizen_report is None:
            raise HTTPException(status_code=404, detail="Laporan warga tidak ditemukan.")

    task = MaintenanceTask(
        task_id=str(uuid.uuid4()),
        halte_id=body.halte_id,
        citizen_report_id=body.citizen_report_id,
        description=body.description,
        assigned_to=body.assigned_to,
    )
    session.add(task)

    # Marks the report "diproses" so the dashboard map marker (BusStopLayer)
    # and CitizenReportSection both know it's been dispatched, not just sitting
    # unactioned -- see update_task_status below for what happens when this
    # task is later marked done.
    if citizen_report is not None:
        citizen_report.status = "diproses"

    await session.commit()
    await session.refresh(task)
    return _to_out(task, halte)


@router.patch("/tasks/{task_id}", response_model=TaskOut)
async def update_task_status(
    task_id: str, body: TaskStatusUpdate, session: AsyncSession = Depends(get_session)
) -> TaskOut:
    task = await session.get(MaintenanceTask, task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Tugas tidak ditemukan.")

    task.status = body.status

    # Closing the loop DISHUB asked for: once a task dispatched from a
    # citizen report is marked done, the report itself is done being tracked
    # -- delete it outright so it drops off both the map marker and
    # CitizenReportSection's list, rather than lingering in a third status.
    # citizen_report_id must be cleared on the task first: it's a foreign key
    # into citizen_report, so deleting the row it still points to violates
    # that constraint otherwise. TaskOut keeps the field on the response as
    # None here rather than the id that's no longer resolvable to anything.
    if body.status == "selesai" and task.citizen_report_id is not None:
        citizen_report = await session.get(CitizenReport, task.citizen_report_id)
        task.citizen_report_id = None
        if citizen_report is not None:
            await session.delete(citizen_report)

    await session.commit()
    await session.refresh(task)

    halte = await session.get(HalteSurvey, task.halte_id)
    return _to_out(task, halte)


def _parse_facility_updates(raw: str) -> dict[str, FacilityState]:
    try:
        parsed = json.loads(raw)
    except (json.JSONDecodeError, TypeError) as exc:
        raise HTTPException(status_code=400, detail="Format data fasilitas tidak valid.") from exc

    if not isinstance(parsed, dict) or not parsed:
        raise HTTPException(
            status_code=400, detail="Pilih minimal satu fasilitas yang statusnya dilaporkan berubah."
        )

    for key, value in parsed.items():
        if key not in FACILITY_VARIABLES:
            raise HTTPException(status_code=400, detail=f"Fasilitas '{key}' tidak dikenali.")
        if value not in ("ada", "tidak"):
            raise HTTPException(
                status_code=400, detail=f"Status fasilitas '{key}' harus 'ada' atau 'tidak'."
            )

    return parsed


@router.patch("/tasks/{task_id}/report", response_model=TaskOut)
async def submit_technician_report(
    task_id: str,
    report: str = Form(...),
    facility_updates: str = Form(...),
    video: UploadFile = File(...),
    photo: UploadFile | None = File(None),
    session: AsyncSession = Depends(get_session),
) -> TaskOut:
    """Technician's own report on a task in progress/done -- separate from
    the dispatcher's original description (what needs fixing). A report is
    only considered complete with proof: video is required (photo stays
    optional, as before). facility_updates is the technician's own read of
    which of the 5 survey facilities changed and to what -- neither this nor
    the video/photo take effect on halte_survey immediately; DISHUB reviews
    and applies them via PATCH /tasks/{task_id}/approve-facility-update.
    Submitting a new photo here does NOT make it public on its own either;
    see /approve below (a separate, narrower gate that predates this one).
    """
    task = await session.get(MaintenanceTask, task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Tugas tidak ditemukan.")
    if not report.strip():
        raise HTTPException(status_code=400, detail="Laporan petugas tidak boleh kosong.")
    if not video.filename:
        raise HTTPException(status_code=400, detail="Video laporan wajib dilampirkan.")

    parsed_facility_updates = _parse_facility_updates(facility_updates)

    task.technician_report = report.strip()
    task.technician_video_url = await _save_upload(
        video,
        VIDEO_CONTENT_TYPE_TO_EXT,
        MAX_TECHNICIAN_VIDEO_BYTES,
        "Format video harus MP4, WebM, atau MOV.",
        "Ukuran video maksimal 25 MB.",
    )
    task.facility_updates = parsed_facility_updates
    # A freshly submitted batch always needs a fresh look from DISHUB, even
    # if an earlier batch on this same task was already approved.
    task.facility_updates_approved = False

    if photo is not None and photo.filename:
        task.technician_photo_url = await _save_upload(
            photo,
            PHOTO_CONTENT_TYPE_TO_EXT,
            MAX_TECHNICIAN_PHOTO_BYTES,
            "Format foto harus JPEG, PNG, atau WebP.",
            "Ukuran foto maksimal 5 MB.",
        )
        # A newly submitted photo needs re-approval before it goes public --
        # otherwise a technician could quietly swap the photo an admin
        # already approved.
        task.approved_for_public = False

    await session.commit()
    await session.refresh(task)

    halte = await session.get(HalteSurvey, task.halte_id)
    return _to_out(task, halte)


@router.delete("/tasks/{task_id}", status_code=204)
async def delete_task(task_id: str, session: AsyncSession = Depends(get_session)) -> None:
    """Lets DISHUB clear a "selesai" task off the board once it's been dealt
    with -- see TaskBoard.tsx's delete button, shown only in that column.
    Not restricted to "selesai" here: the dashboard is the one place that
    decides when deleting makes sense, this endpoint just performs it.
    """
    task = await session.get(MaintenanceTask, task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Tugas tidak ditemukan.")

    await session.delete(task)
    await session.commit()


@router.patch("/tasks/{task_id}/approve", response_model=TaskOut)
async def approve_technician_photo(task_id: str, session: AsyncSession = Depends(get_session)) -> TaskOut:
    """DISHUB's explicit approval step -- only after this does the
    technician's photo appear on the public map (HaltePublicModal shows
    approved_for_public photos alongside the halte's own survey media).
    """
    task = await session.get(MaintenanceTask, task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Tugas tidak ditemukan.")
    if not task.technician_photo_url:
        raise HTTPException(status_code=400, detail="Tugas ini belum punya foto laporan petugas.")

    task.approved_for_public = True
    await session.commit()
    await session.refresh(task)

    halte = await session.get(HalteSurvey, task.halte_id)
    return _to_out(task, halte)


@router.patch("/tasks/{task_id}/approve-facility-update", response_model=TaskOut)
async def approve_facility_update(task_id: str, session: AsyncSession = Depends(get_session)) -> TaskOut:
    """DISHUB's approval for the technician's proposed facility ada/tidak
    values (see submit_technician_report) -- a separate, broader gate from
    /approve above, which only ever governs the public repair-photo strip.
    Approving here is what actually writes the technician's findings onto
    halte_survey: the facility values themselves, the recomputed condition
    score, and the technician's photo/video prepended to halte.media so the
    halte's own display reflects the latest known state rather than the
    original survey photos alone.
    """
    task = await session.get(MaintenanceTask, task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Tugas tidak ditemukan.")
    if not task.facility_updates:
        raise HTTPException(status_code=400, detail="Tugas ini belum punya usulan perubahan fasilitas.")

    halte = await session.get(HalteSurvey, task.halte_id)
    if halte is None:
        raise HTTPException(status_code=404, detail="Halte tidak ditemukan.")

    for facility, value in task.facility_updates.items():
        setattr(halte, facility, value)

    halte.condition_score, halte.condition_label = compute_condition_score(
        {facility: getattr(halte, facility) for facility in FACILITY_VARIABLES}
    )
    # Reassign the whole dicts/lists: SQLAlchemy does not track changes made
    # in-place inside a JSONB value, so mutating them directly would not
    # persist (same reasoning as _apply_to_survey in citizen_report.py).
    halte.facility_sources = {
        **(halte.facility_sources or {}),
        **{f: "manual" for f in task.facility_updates},
    }

    existing_urls = {m.get("url") for m in (halte.media or [])}
    new_media: list[dict] = []
    if task.technician_video_url and task.technician_video_url not in existing_urls:
        new_media.append({"url": task.technician_video_url, "type": "video"})
    if task.technician_photo_url and task.technician_photo_url not in existing_urls:
        new_media.append({"url": task.technician_photo_url, "type": "photo"})
    if new_media:
        halte.media = [*new_media, *(halte.media or [])]

    task.facility_updates_approved = True

    await session.commit()
    await session.refresh(task)
    await session.refresh(halte)

    return _to_out(task, halte)
