from geoalchemy2 import Geometry
from sqlalchemy import Date, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class HalteSurvey(Base):
    __tablename__ = "halte_survey"

    halte_id: Mapped[str] = mapped_column(String, primary_key=True)
    nama_halte: Mapped[str] = mapped_column(String)
    kelurahan: Mapped[str] = mapped_column(String)
    kecamatan: Mapped[str] = mapped_column(String, default="Tembalang")

    cctv: Mapped[str] = mapped_column(String)  # "ada" | "tidak" | "-"
    lighting: Mapped[str] = mapped_column(String)  # "ada" | "tidak" | "-"
    sidewalk_condition: Mapped[str] = mapped_column(String)  # "ada" | "tidak" | "-"
    route_info_signage: Mapped[str] = mapped_column(String)  # "ada" | "tidak" | "-"
    canopy: Mapped[str] = mapped_column(String)  # "ada" | "tidak" | "-"

    # Every point has 2-5 field photos, and 18 of the 42 have one video, in
    # original upload order -- [{"url": ..., "type": "photo" | "video"}].
    # JSONB rather than ARRAY(String) since each item carries a type tag,
    # not just a bare URL.
    media: Mapped[list[dict]] = mapped_column(JSONB, default=list)
    survey_date: Mapped[str | None] = mapped_column(Date, nullable=True)
    catatan_lapangan: Mapped[str | None] = mapped_column(String, nullable=True)

    condition_score: Mapped[int] = mapped_column()
    condition_label: Mapped[str] = mapped_column(String)  # "green" | "yellow" | "red"

    geom: Mapped[str] = mapped_column(Geometry(geometry_type="POINT", srid=4326))
