from datetime import datetime

from geoalchemy2 import Geometry
from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class CitizenReport(Base):
    """A real report submitted by a citizen through the public map's "Buat
    Laporan" page -- distinct from community-reports.geojson, which is the
    team's own 42 survey points shown as explicitly-labeled sample/placeholder
    data. Rows here are genuine, whatever a citizen actually submits.

    Tied to a specific surveyed halte (like MaintenanceTask's halte_id) --
    the report page has the citizen pick an existing halte on a map rather
    than drop an arbitrary point, so DISHUB's dashboard can show "Laporan
    Warga" grouped under the halte it's about, the same way it already does
    for field survey notes.
    """

    __tablename__ = "citizen_report"

    report_id: Mapped[str] = mapped_column(String, primary_key=True)
    halte_id: Mapped[str] = mapped_column(String, ForeignKey("halte_survey.halte_id"))

    # Plain text, not a foreign key to an account -- there is no login/account
    # system in this project (see task.py's assigned_to for the same reasoning).
    reporter_name: Mapped[str] = mapped_column(String)
    description: Mapped[str] = mapped_column(String)
    # Every photo the reporter attached, in the order they were picked:
    # [{"url": "/uploads/<uuid>.jpg", "annotated_url": "/uploads/<uuid>.annotated.jpg"|None}, ...].
    # THIS list is the authoritative record of what was submitted. The two
    # scalar columns below hold the FIRST entry and are kept only because a
    # number of readers were written against a single-photo report (the
    # dashboard's report card, the cleanup hook that reclaims orphaned files,
    # the approved-photo strip). Every write path sets the list and the
    # scalars together from the same save result, so the two cannot disagree;
    # any new reader should use `photos` and treat the scalars as "primary
    # photo" shorthand.
    photos: Mapped[list | None] = mapped_column(JSONB, nullable=True)

    # Relative paths under /uploads, e.g. "/uploads/<uuid>.jpg" -- None if the
    # reporter didn't attach that media type.
    photo_url: Mapped[str | None] = mapped_column(String, nullable=True)
    # The same photo with the detector's boxes drawn on it, rendered by the
    # detector itself (see photo_detection.render_annotated). This is what the
    # dashboard shows DISHUB -- a dispatcher should see what the model saw,
    # not have to reconstruct it from a class list. None when the photo
    # produced no detection or the render failed; photo_url is always kept, so
    # the raw evidence never depends on the detector being up.
    photo_annotated_url: Mapped[str | None] = mapped_column(String, nullable=True)
    video_url: Mapped[str | None] = mapped_column(String, nullable=True)
    # "baru" (not yet dispatched -- shown on the dashboard map as a marker
    # needing attention) -> "diproses" (a MaintenanceTask now exists for it,
    # see POST /citizen-reports/{id}/dispatch). There is no "selesai" status:
    # once the dispatched task reaches "selesai" the row is deleted outright
    # (see update_task_status in routers/task.py) rather than kept around in
    # a third state, per the dispatcher workflow this models.
    status: Mapped[str] = mapped_column(String, default="baru")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # Kept alongside halte_id (rather than derived from the halte's own
    # location) so a report always records exactly where the citizen tapped,
    # even if that's a few meters off from the halte's surveyed point.
    geom: Mapped[str] = mapped_column(Geometry(geometry_type="POINT", srid=4326))

    # Raw output of the YOLO infrastructure detector on photo_url, plus the
    # facility-level reading derived from it. Stored per-report so the
    # original evidence behind any halte_survey value the detector filled in
    # stays auditable -- see app/services/photo_detection.py.
    # Shape: {"detections": [...], "observed": {...}, "model": "...", "error": str|None}
    ai_detections: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    ai_analyzed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

