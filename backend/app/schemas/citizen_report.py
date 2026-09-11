from datetime import datetime

from pydantic import BaseModel


class CitizenReportOut(BaseModel):
    report_id: str
    halte_id: str
    reporter_name: str
    lat: float
    lon: float
    description: str
    photo_url: str | None
    photo_annotated_url: str | None = None
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
