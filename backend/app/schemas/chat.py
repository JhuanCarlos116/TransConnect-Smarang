from pydantic import BaseModel


class ChatRequest(BaseModel):
    message: str


class RecommendationSummary(BaseModel):
    rank: int
    kelurahan: str | None
    population_gained: int
    nearest_existing_halte_m: int | None
    cumulative_population_served: int
    cumulative_coverage_pct: float
    coordinates: tuple[float, float]  # [lon, lat]


class ChatResponse(BaseModel):
    reply: str
    recommendations: list[RecommendationSummary]
