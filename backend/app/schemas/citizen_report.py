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
    video_url: str | None
    status: str
    created_at: datetime
