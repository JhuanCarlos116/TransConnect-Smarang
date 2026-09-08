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

import uuid

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_session
from app.models.halte import HalteSurvey
from app.models.task import MaintenanceTask
from app.routers.citizen_report import PHOTO_CONTENT_TYPE_TO_EXT, _save_upload
from app.schemas.task import ApprovedRepairPhoto, TaskCreate, TaskOut, TaskStatusUpdate

router = APIRouter()

MAX_TECHNICIAN_PHOTO_BYTES = 5 * 1024 * 1024  # 5 MB, same cap as citizen_report's photo


def _to_out(task: MaintenanceTask, halte: HalteSurvey) -> TaskOut:
    return TaskOut(
        task_id=task.task_id,
        halte_id=task.halte_id,
        nama_halte=halte.nama_halte,
        kelurahan=halte.kelurahan,
        condition_label=halte.condition_label,
        description=task.description,
        assigned_to=task.assigned_to,
        status=task.status,
        technician_report=task.technician_report,
        technician_photo_url=task.technician_photo_url,
        approved_for_public=task.approved_for_public,
        created_at=task.created_at,
        updated_at=task.updated_at,
    )


@router.get("/tasks", response_model=list[TaskOut])
async def list_tasks(session: AsyncSession = Depends(get_session)) -> list[TaskOut]:
    result = await session.execute(
        select(MaintenanceTask, HalteSurvey)
        .join(HalteSurvey, MaintenanceTask.halte_id == HalteSurvey.halte_id)
        .order_by(MaintenanceTask.created_at.desc())
    )
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

    task = MaintenanceTask(
        task_id=str(uuid.uuid4()),
        halte_id=body.halte_id,
        description=body.description,
        assigned_to=body.assigned_to,
    )
    session.add(task)
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
    await session.commit()
    await session.refresh(task)

    halte = await session.get(HalteSurvey, task.halte_id)
    return _to_out(task, halte)


@router.patch("/tasks/{task_id}/report", response_model=TaskOut)
async def submit_technician_report(
    task_id: str,
    report: str = Form(...),
    photo: UploadFile | None = File(None),
    session: AsyncSession = Depends(get_session),
) -> TaskOut:
    """Technician's own report on a task in progress/done -- separate from
    the dispatcher's original description (what needs fixing). Submitting a
    new photo here does NOT make it public on its own; see /approve below.
    """
    task = await session.get(MaintenanceTask, task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Tugas tidak ditemukan.")
    if not report.strip():
        raise HTTPException(status_code=400, detail="Laporan petugas tidak boleh kosong.")

    task.technician_report = report.strip()
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
