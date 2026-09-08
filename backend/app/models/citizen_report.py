from datetime import datetime

from geoalchemy2 import Geometry
from sqlalchemy import DateTime, ForeignKey, String, func
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
    # Relative paths under /uploads, e.g. "/uploads/<uuid>.jpg" -- None if the
    # reporter didn't attach that media type.
    photo_url: Mapped[str | None] = mapped_column(String, nullable=True)
    video_url: Mapped[str | None] = mapped_column(String, nullable=True)
    status: Mapped[str] = mapped_column(String, default="baru")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # Kept alongside halte_id (rather than derived from the halte's own
    # location) so a report always records exactly where the citizen tapped,
    # even if that's a few meters off from the halte's surveyed point.
    geom: Mapped[str] = mapped_column(Geometry(geometry_type="POINT", srid=4326))
