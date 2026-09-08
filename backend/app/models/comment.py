from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class HalteComment(Base):
    __tablename__ = "halte_comment"

    comment_id: Mapped[str] = mapped_column(String, primary_key=True)
    halte_id: Mapped[str] = mapped_column(String, ForeignKey("halte_survey.halte_id"))

    # Free text, not a foreign key to a user account -- there is no
    # login/account system in this project (see task.py's assigned_to for the
    # same reasoning), so a name here is just whatever the commenter types.
    author_name: Mapped[str] = mapped_column(String)
    body: Mapped[str] = mapped_column(String)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
