"""MVP condition-score heuristic for surveyed halte points.

Phase 1 reality: survey data comes from free-text MAPID Activities posts
(title + description), not a structured form. Trotoar and penerangan
*quality* (baik/cukup/buruk) was meant to come from photos via YOLOv8-seg,
which doesn't exist yet — so for now every variable is reduced to a
tri-state read purely off the description text:

    "ada"   — feature explicitly mentioned as present
    "tidak" — feature explicitly mentioned as absent
    "-"     — not mentioned at all (unknown, not "bad")

This is a placeholder heuristic, not the final methodology. It will be
superseded by YOLOv8-seg photo classification + Weighted Overlay/AHP in a
later phase. Team should spot-check extracted values against the original
descriptions before trusting them (see clean_survey_export.py).
"""

from typing import Literal

ConditionLabel = Literal["green", "yellow", "red"]
VariableState = Literal["ada", "tidak", "-"]

# weight per variable (must sum to 100), and points awarded per state
_WEIGHTS = {
    "sidewalk_condition": 40,  # trotoar — heaviest, most safety-critical
    "lighting": 20,
    "cctv": 15,
    "route_info_signage": 15,
    "canopy": 10,
}

_STATE_MULTIPLIER: dict[VariableState, float] = {
    "ada": 1.0,
    "-": 0.5,  # unknown treated as neutral, not penalized like "tidak"
    "tidak": 0.0,
}


def compute_condition_score(properties: dict) -> tuple[int, ConditionLabel]:
    """Compute a 0-100 condition score and green/yellow/red label from
    tri-state survey attributes: sidewalk_condition, lighting, cctv,
    route_info_signage, canopy (each "ada" | "tidak" | "-").
    """
    score = 0.0
    for variable, weight in _WEIGHTS.items():
        state = properties.get(variable, "-")
        score += weight * _STATE_MULTIPLIER.get(state, 0.5)

    score = round(score)

    if score >= 70:
        label: ConditionLabel = "green"
    elif score >= 40:
        label = "yellow"
    else:
        label = "red"

    return score, label
