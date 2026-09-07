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

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_session
from app.models.halte import HalteSurvey
from app.models.task import MaintenanceTask
from app.schemas.task import TaskCreate, TaskOut, TaskStatusUpdate

router = APIRouter()


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
