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

    # Per-variable provenance: facility -> "ai" (the photo detector filled it
    # in) or "manual" (a DISHUB admin corrected it). A variable missing from
    # this map is the field survey's own reading. Read-only here: only the
    # server writes provenance, never a client.
    facility_sources: dict[str, Literal["ai", "manual"]] = {}


class FacilityUpdate(BaseModel):
    """Manual correction of a halte's facility availability by DISHUB.

    Every field is optional -- the dashboard sends only what the admin
    actually changed. Values are constrained to the same tri-state the survey
    uses, so a typo cannot write a value the scorer would read as unknown
    (compute_condition_score falls back to the neutral 0.5 for anything it
    does not recognise).

    This exists because the detector is still error-prone: it can only ever
    prove PRESENCE (see photo_detection.py), and its weakest classes are the
    ones feeding lighting and route_info_signage. A human has to be able to
    overrule it.
    """

    sidewalk_condition: Literal["ada", "tidak", "-"] | None = None
    lighting: Literal["ada", "tidak", "-"] | None = None
    cctv: Literal["ada", "tidak", "-"] | None = None
    route_info_signage: Literal["ada", "tidak", "-"] | None = None
    canopy: Literal["ada", "tidak", "-"] | None = None


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
