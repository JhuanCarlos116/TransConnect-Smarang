from typing import Literal

from pydantic import BaseModel


class HalteMediaItem(BaseModel):
    url: str
    type: Literal["photo", "video"]


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

    # Photos and, for 18 of the 42 points, one video -- in original upload
    # order. See clean_survey_export.py's pick_media.
    media: list[HalteMediaItem] = []
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
