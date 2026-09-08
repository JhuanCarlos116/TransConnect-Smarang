from datetime import datetime

from geoalchemy2 import Geometry
from sqlalchemy import DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class CitizenReport(Base):
    """A real report submitted by a citizen through the public map's "Buat
    Laporan" form -- distinct from community-reports.geojson, which is the
    team's own 42 survey points shown as explicitly-labeled sample/placeholder
    data. Rows here are genuine, whatever a citizen actually submits.
    """

    __tablename__ = "citizen_report"

    report_id: Mapped[str] = mapped_column(String, primary_key=True)
    description: Mapped[str] = mapped_column(String)
    # Relative path under /uploads, e.g. "/uploads/<uuid>.jpg" -- None if the
    # reporter didn't attach a photo.
    photo_url: Mapped[str | None] = mapped_column(String, nullable=True)
    status: Mapped[str] = mapped_column(String, default="baru")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    geom: Mapped[str] = mapped_column(Geometry(geometry_type="POINT", srid=4326))
