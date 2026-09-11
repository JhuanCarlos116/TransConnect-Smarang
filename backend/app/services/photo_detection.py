"""Photo-based infrastructure detection for citizen reports.

The trained detector (see BACKEND-YOLOV5 / `transconnect-api`) reads nine
infrastructure classes off a photo: crosswalk, horizontal-directional-tile,
road, shelter, sidewalk, sign, street_light, vertical-directional-tile,
warning-tile. This module turns that raw class list into a facility-level
reading of the halte's five survey variables so a citizen's photo can feed
`halte_survey` instead of only sitting in an uploads folder.

The rule that shapes the whole module -- and the reason it is asymmetric:

    A photo can only ever prove PRESENCE, never ABSENCE.

If the detector finds a street light, that light exists. If it finds nothing,
the light may simply be out of frame, behind the photographer, or cropped --
photo 4 of the team's own survey set is a halte with an obvious curved
shelter roof that the model scored as *zero detections*. So this module only
ever writes "ada", and never writes "tidak": a missing detection leaves the
survey value untouched rather than recording a feature as absent. Absence is
a claim that needs full coverage of the halte, which a single handheld photo
does not have.

Likewise `cctv` carries 15% of the condition score but has no class in the
model at all, so photos can never inform it -- it stays whatever the field
survey said.
"""

import logging
from dataclasses import dataclass, field
from pathlib import Path

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

# Detector endpoint (container-to-container on proxy-net).
DETECT_URL = f"{settings.yolo_api_url.rstrip('/')}/detect"

# Same inference, but the detector returns the photo with its own boxes and
# labels drawn on it. The backend re-requests rather than drawing the boxes
# itself, so the picture DISHUB sees is literally the model's own output.
DETECT_ANNOTATED_URL = f"{settings.yolo_api_url.rstrip('/')}/detect/annotated"

# A detection below this confidence is treated as noise. Matches the
# detector's own default; raised here because a citizen photo is a single
# uncontrolled view, not a survey frame.
CONFIDENCE_THRESHOLD = 0.25

# Model class -> halte_survey variable. Classes absent from this map
# (crosswalk, road) are real detections but describe the street around the
# halte rather than one of the five scored facility variables, so they are
# recorded in ai_detections but never applied to the survey row.
CLASS_TO_FACILITY: dict[str, str] = {
    "sidewalk": "sidewalk_condition",
    "horizontal-directional-tile": "sidewalk_condition",
    "vertical-directional-tile": "sidewalk_condition",
    "warning-tile": "sidewalk_condition",
    "street_light": "lighting",
    "sign": "route_info_signage",
    "shelter": "canopy",
}

# `cctv` is intentionally missing: the model has no CCTV class, so a photo
# carries no information about it either way.


@dataclass
class PhotoAnalysis:
    """Result of running the detector over one report photo."""

    detections: list[dict] = field(default_factory=list)
    observed: dict[str, str] = field(default_factory=dict)  # facility -> "ada"
    error: str | None = None

    def as_jsonb(self) -> dict:
        return {
            "detections": self.detections,
            "observed": self.observed,
            "confidence_threshold": CONFIDENCE_THRESHOLD,
            "model": "transconnect-infra-9class",
            "error": self.error,
        }


def _run_detector(image_path: Path) -> list[dict]:
    """POST one image to the detector service and return its raw detections."""
    with image_path.open("rb") as fh:
        response = httpx.post(
            DETECT_URL,
            files={"file": (image_path.name, fh, "image/jpeg")},
            timeout=60.0,
        )
    response.raise_for_status()
    payload = response.json()
    return payload.get("detections", [])


def analyze_photo(image_path: Path, confidence_threshold: float = CONFIDENCE_THRESHOLD) -> PhotoAnalysis:
    """Read the infrastructure visible in one report photo.

    Never raises: a report whose photo the detector cannot process is still a
    valid report, so the failure is returned as `PhotoAnalysis.error` and
    persisted alongside the report rather than losing the citizen's
    submission. Callers apply `observed` only when it is non-empty.
    """
    analysis = PhotoAnalysis()
    try:
        raw = _run_detector(image_path)
    except Exception as exc:  # detector down, timeout, malformed image
        analysis.error = f"{type(exc).__name__}: {exc}"
        logger.warning("photo detection failed for %s: %s", image_path.name, analysis.error)
        return analysis

    analysis.detections = raw
    for detection in raw:
        confidence = float(detection.get("confidence", 0.0))
        if confidence < confidence_threshold:
            continue
        facility = CLASS_TO_FACILITY.get(detection.get("class", ""))
        if facility is not None:
            analysis.observed[facility] = "ada"
    return analysis


def render_annotated(image_path: Path) -> bytes | None:
    """Ask the detector for the same photo with its boxes drawn on it.

    Returns None when the detector cannot produce one. The annotated image is
    a display nicety for the dispatcher, so a failure here must never cost the
    citizen their report -- the raw photo is already saved and is what the
    report falls back to.
    """
    try:
        with image_path.open("rb") as fh:
            response = httpx.post(
                DETECT_ANNOTATED_URL,
                files={"file": (image_path.name, fh, "image/jpeg")},
                timeout=60.0,
            )
        response.raise_for_status()
        return response.content
    except Exception as exc:  # detector down, timeout, malformed image
        logger.warning("annotated render failed for %s: %s: %s", image_path.name, type(exc).__name__, exc)
        return None
