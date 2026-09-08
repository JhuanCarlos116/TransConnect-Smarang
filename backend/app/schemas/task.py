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
    technician_report: str | None
    technician_photo_url: str | None
    approved_for_public: bool
    created_at: datetime
    updated_at: datetime


class ApprovedRepairPhoto(BaseModel):
    """Public-safe subset for HaltePublicModal -- just the approved photo and
    when it was reported, none of the internal task fields (description,
    assigned_to, status) a citizen has no reason to see."""

    technician_report: str
    technician_photo_url: str
    updated_at: datetime
