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
    # Every repair photo on the task, in submission order; technician_photo_url
    # above is its first entry. Tasks reported before multi-photo uploads
    # existed are served as a one-entry list (see _task_photo_urls in
    # routers/task.py), so a reader only ever deals with the list.
    technician_photo_urls: list[str] = []
    technician_video_url: str | None
    approved_for_public: bool
    # Explicit "no" from DISHUB, as opposed to "not reviewed yet" -- the two
    # are indistinguishable from approved_for_public alone, and the review
    # block in HalteDetailModal has to tell them apart to stop showing a
    # decision that was already made as if it were still pending.
    technician_photo_rejected: bool
    # The same decision for the repair video -- kept separate so the video can
    # be turned down on its own (see models/task.py).
    technician_video_rejected: bool
    facility_updates: dict[str, FacilityState] | None
    facility_updates_approved: bool
    facility_updates_rejected: bool
    # Whether an approved facility_updates batch can still be undone (see
    # revert-facility-update) -- exposed as a plain flag rather than the
    # snapshot itself, since the frontend only needs to know whether to show
    # the "Kembalikan" button.
    facility_updates_revertible: bool
    created_at: datetime
    updated_at: datetime


class ApprovedRepairPhoto(BaseModel):
    """Public-safe subset for HaltePublicModal -- just the approved photo and
    when it was reported, none of the internal task fields (description,
    assigned_to, status) a citizen has no reason to see."""

    technician_report: str
    technician_photo_url: str
    # All of the task's approved repair photos, in submission order;
    # technician_photo_url above is the first one. The public strip renders
    # every entry rather than only the first.
    technician_photo_urls: list[str] = []
    updated_at: datetime
