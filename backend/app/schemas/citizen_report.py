from datetime import datetime

from pydantic import BaseModel


class CitizenReportOut(BaseModel):
    report_id: str
    lat: float
    lon: float
    description: str
    photo_url: str | None
    status: str
    created_at: datetime
