from datetime import datetime

from pydantic import BaseModel


class CitizenReportPhoto(BaseModel):
    """One photo of a report -- the original plus, when the detector drew
    anything, its annotated twin. See app/services/photo_detection.py."""

    url: str
    annotated_url: str | None = None


class CitizenReportOut(BaseModel):
    report_id: str
    halte_id: str
    reporter_name: str
    lat: float
    lon: float
    description: str
    photo_url: str | None
    photo_annotated_url: str | None = None
    # Every photo on the report, in submission order, with photo_url /
    # photo_annotated_url above being the first entry. Reports submitted before
    # multi-photo uploads existed are served as a one-entry list built from
    # those scalars (see _photo_list), so a reader only ever deals with the
    # list and older rows still appear.
    photos: list[CitizenReportPhoto] = []
    video_url: str | None
    status: str
    created_at: datetime

    # Detector output for photo_url (None when no photo was attached).
    # Kept in the response so the dashboard can show what the AI actually
    # saw -- and so a human can check it before trusting a survey value the
    # detector filled in. See app/services/photo_detection.py.
    ai_detections: dict | None = None
    ai_analyzed_at: datetime | None = None

    # Facility variables the detector newly filled in on halte_survey for
    # this report (facility -> "ada"). Empty when the photo added nothing.
    halte_updated: dict[str, str] = {}
