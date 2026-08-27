from typing import Literal

from pydantic import BaseModel


class HalteProperties(BaseModel):
    halte_id: str
    nama_halte: str
    kelurahan: str
    kecamatan: str = "Tembalang"

    cctv: Literal["ada", "tidak", "-"]
    lighting: Literal["ada", "tidak", "-"]
    sidewalk_condition: Literal["ada", "tidak", "-"]
    route_info_signage: Literal["ada", "tidak", "-"]
    canopy: Literal["ada", "tidak", "-"]

    photo_url: str | None = None
    survey_date: str | None = None
    catatan_lapangan: str | None = None  # original MAPID Activity description, for spot-checking the extracted values above

    condition_score: int
    condition_label: Literal["green", "yellow", "red"]


class PointGeometry(BaseModel):
    type: Literal["Point"] = "Point"
    coordinates: tuple[float, float]  # [lon, lat]


class HalteFeature(BaseModel):
    type: Literal["Feature"] = "Feature"
    geometry: PointGeometry
    properties: HalteProperties


class HalteFeatureCollection(BaseModel):
    type: Literal["FeatureCollection"] = "FeatureCollection"
    features: list[HalteFeature]
