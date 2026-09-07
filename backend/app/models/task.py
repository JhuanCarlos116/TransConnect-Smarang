from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class MaintenanceTask(Base):
    __tablename__ = "maintenance_task"

    task_id: Mapped[str] = mapped_column(String, primary_key=True)
    halte_id: Mapped[str] = mapped_column(String, ForeignKey("halte_survey.halte_id"))

    description: Mapped[str] = mapped_column(String)
    # Plain text, not a foreign key to a staff account -- there is no
    # login/account system in this project (see AppHeader's history note on
    # the removed fake "Sesi Aktif (Admin)" menu), so a real relation here
    # would just be a different-shaped version of the same fabrication.
    assigned_to: Mapped[str | None] = mapped_column(String, nullable=True)
    status: Mapped[str] = mapped_column(String, default="belum_dikerjakan")  # belum_dikerjakan | proses | selesai

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
