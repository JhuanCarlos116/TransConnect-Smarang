from datetime import datetime
from typing import Literal

from pydantic import BaseModel

TaskStatus = Literal["belum_dikerjakan", "proses", "selesai"]


class TaskCreate(BaseModel):
    halte_id: str
    description: str
    assigned_to: str | None = None


class TaskStatusUpdate(BaseModel):
    status: TaskStatus


class TaskOut(BaseModel):
    task_id: str
    halte_id: str
    nama_halte: str
    kelurahan: str
    condition_label: str
    description: str
    assigned_to: str | None
    status: TaskStatus
    created_at: datetime
    updated_at: datetime
