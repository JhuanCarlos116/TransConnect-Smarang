from pydantic import BaseModel


class RouteRequest(BaseModel):
    lat: float
    lon: float


class RouteOption(BaseModel):
    halte_id: str
    nama_halte: str
    kelurahan: str
    condition_score: int
    condition_label: str
    distance_m: float
    walk_minutes: float
    # GeoJSON LineString, walking path from the requested point to this halte.
    route: dict


class SafeHalteRouteResponse(BaseModel):
    recommended: RouteOption
    # None when the nearest halte IS the recommended one -- no separate
    # "alternative" to show.
    nearest: RouteOption | None
    budget_minutes: int
    within_budget_count: int
