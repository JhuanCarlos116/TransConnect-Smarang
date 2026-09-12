from datetime import datetime
from typing import Literal

from pydantic import BaseModel

TaskStatus = Literal["belum_dikerjakan", "proses", "selesai"]
FacilityState = Literal["ada", "tidak"]


class TaskCreate(BaseModel):
    halte_id: str
    description: str
    assigned_to: str | None = None
    # Set when this task is dispatched straight from a citizen report
    # (CitizenReportSection's "Dispatch ke Tugas" button) rather than typed
    # up from scratch in TaskCreateSection -- see POST /tasks.
    citizen_report_id: str | None = None


class TaskStatusUpdate(BaseModel):
    status: TaskStatus


class TaskOut(BaseModel):
    task_id: str
    halte_id: str
    citizen_report_id: str | None
    nama_halte: str
    kelurahan: str
    condition_label: str
    description: str
    assigned_to: str | None
    status: TaskStatus
    technician_report: str | None
    technician_photo_url: str | None
    technician_video_url: str | None
    approved_for_public: bool
    facility_updates: dict[str, FacilityState] | None
    facility_updates_approved: bool
    created_at: datetime
    updated_at: datetime


class ApprovedRepairPhoto(BaseModel):
    """Public-safe subset for HaltePublicModal -- just the approved photo and
    when it was reported, none of the internal task fields (description,
    assigned_to, status) a citizen has no reason to see."""

    technician_report: str
    technician_photo_url: str
    updated_at: datetime
