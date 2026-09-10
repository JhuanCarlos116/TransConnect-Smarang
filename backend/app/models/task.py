from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class MaintenanceTask(Base):
    __tablename__ = "maintenance_task"

    task_id: Mapped[str] = mapped_column(String, primary_key=True)
    halte_id: Mapped[str] = mapped_column(String, ForeignKey("halte_survey.halte_id"))
    # Set only when this task was dispatched directly from a citizen report
    # (POST /citizen-reports/{id}/dispatch) rather than typed up from scratch
    # by DISHUB -- lets the dashboard mark the halte on the map and, once
    # this task reaches "selesai", delete that report (see update_task_status
    # in routers/task.py). A task created the old way (TaskCreateSection)
    # has no citizen report behind it, so this stays None.
    citizen_report_id: Mapped[str | None] = mapped_column(
        String, ForeignKey("citizen_report.report_id"), nullable=True
    )

    description: Mapped[str] = mapped_column(String)
    # Plain text, not a foreign key to a staff account -- there is no
    # login/account system in this project (see AppHeader's history note on
    # the removed fake "Sesi Aktif (Admin)" menu), so a real relation here
    # would just be a different-shaped version of the same fabrication.
    assigned_to: Mapped[str | None] = mapped_column(String, nullable=True)
    status: Mapped[str] = mapped_column(String, default="belum_dikerjakan")  # belum_dikerjakan | proses | selesai

    # Submitted by whoever's doing the repair once they're in progress/done --
    # see PATCH /tasks/{task_id}/report. Separate from the DISHUB dispatcher's
    # own description above (what needs fixing) vs. what the technician
    # actually reports back (what was done, with proof).
    technician_report: Mapped[str | None] = mapped_column(String, nullable=True)
    technician_photo_url: Mapped[str | None] = mapped_column(String, nullable=True)
    # True only after DISHUB explicitly approves showing the technician's
    # photo on the public map (HaltePublicModal) -- set via a separate
    # approval action, not automatically when status becomes "selesai".
    approved_for_public: Mapped[bool] = mapped_column(Boolean, default=False)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
