"""One-off cleaning script: raw MAPID Activities API response -> clean GeoJSON.

The team's 40-point halte survey was submitted via MAPID Apps' "Activities"
(Community Maps) feature, tagged #timGOPEK — free-text title + description,
not a structured form. So this script does two things:

1. Reshapes the raw API response (see fetch_activities.md / the curl in the
   README) into our GeoJSON schema.
2. HEURISTICALLY extracts the 5 tri-state attributes (cctv, lighting,
   sidewalk_condition, route_info_signage, canopy -> "ada"/"tidak"/"-") from
   the free-text description, since there's no structured field for them.
3. Assigns `kelurahan`: prefers an explicit name mentioned in the text (the
   surveyor was physically there), and only falls back to a point-in-polygon
   lookup against backend/data/reference/kelurahan_tembalang.geojson (OSM
   admin boundaries) when the text says nothing. A text/geometry disagreement
   is printed as a NOTE and resolved in favor of the text, since OSM's
   crowd-sourced kelurahan edges in this area have been observed to disagree
   with on-the-ground naming (e.g. a stop titled "Kedungmundu" whose GPS point
   falls just inside OSM's "Sambiroto" polygon).
4. Overrides the 5 tri-state attributes with hand-verified values from
   backend/data/reference/manual_corrections.json when the halte_id is known
   there (someone on the team read that record's catatan_lapangan and fixed
   the heuristic's guess). This is what makes re-pulling data from MAPID safe:
   MAPID Apps lets people keep editing/posting, so every re-pull reprocesses
   ALL activities from scratch, but already-reviewed points keep their
   verified values instead of reverting to the (unreliable) auto-guess.

Any halte_id NOT found in manual_corrections.json is a record nobody has
reviewed yet — its 5 attributes are still just the heuristic's first guess.
The script prints these at the end so the team knows exactly which new
points need a human to read catatan_lapangan and add an entry to
manual_corrections.json before the data is trusted.

The extraction heuristic itself is NOT reliable enough to trust blindly for
new points — it's a first pass. This matches the PRD's own requirement that
survey data be validated by the team, not just by a model's confidence score.

Usage:
    python scripts/clean_survey_export.py path/to/tembalang_activities.json

Where the input file is the raw JSON saved by the curl command in the
project README (POST .../web/competition/activities, hashtag #timGOPEK).
"""

import json
import sys
from pathlib import Path

from shapely.geometry import Point, shape

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from app.services.condition_score import compute_condition_score  # noqa: E402

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
PROCESSED_OUT = REPO_ROOT / "backend" / "data" / "processed" / "halte-survey.geojson"
FRONTEND_OUT = REPO_ROOT / "frontend" / "public" / "data" / "halte-survey.geojson"
KELURAHAN_BOUNDARIES = REPO_ROOT / "backend" / "data" / "reference" / "kelurahan_tembalang.geojson"
MANUAL_CORRECTIONS = REPO_ROOT / "backend" / "data" / "reference" / "manual_corrections.json"

# --- Free-text attribute extraction -----------------------------------

NEGATION_WORDS = [
    "tidak ada",
    "tidak tersedia",
    "tidak menyediakan",
    "tidak terdapat",
    "tidak dilengkapi",
    "belum ada",
    "belum tersedia",
    "tanpa",
    "nihil",
    "tak ada",
    "tak tersedia",
    # single-word "tidak"/"tak" as a fallback, checked last so the more
    # specific phrases above match first (doesn't change the outcome, just
    # kept for clarity)
    "tidak",
    "tak",
]

KEYWORDS = {
    "cctv": ["cctv"],
    "lighting": ["penerangan", "lampu jalan", "pencahayaan", "lampu"],
    "sidewalk_condition": ["trotoar", "pedestrian", "jalur pejalan kaki"],
    "route_info_signage": ["informasi rute", "info rute", "papan rute", "rute perjalanan", "rute"],
    "canopy": ["kanopi", "peneduh", "naungan", "pohon"],
}

KNOWN_KELURAHAN = [
    "Tembalang",
    "Bulusan",
    "Kramas",
    "Meteseh",
    "Mangunharjo",
    "Sendangmulyo",
    "Sambiroto",
    "Kedungmundu",
    "Tandang",
]


def extract_variable(text: str, keywords: list[str], max_window: int = 90) -> str:
    """Find the earliest mention of any keyword, then look backward (up to
    max_window chars, not crossing a preceding '.') for a negation cue.
    Returns "ada" / "tidak" / "-" (never mentioned).
    """
    text_lower = text.lower()
    best_idx = None
    for keyword in keywords:
        idx = text_lower.find(keyword.lower())
        if idx != -1 and (best_idx is None or idx < best_idx):
            best_idx = idx

    if best_idx is None:
        return "-"

    search_start = max(0, best_idx - max_window)
    preceding = text_lower[search_start:best_idx]
    last_period = preceding.rfind(".")
    if last_period != -1:
        preceding = preceding[last_period + 1 :]

    if any(neg in preceding for neg in NEGATION_WORDS):
        return "tidak"
    return "ada"


def pick_photo_urls(medias: list[str]) -> list[str]:
    """MAPID Apps always puts an auto-generated map-location thumbnail
    (.png) first in `medias`, followed by the actual field photos (.jpg,
    usually several per point -- the team took 2-5 per halte) and sometimes
    videos (.mp4). Skip the map thumbnail and any video, keep every photo.

    Was pick_photo_url (singular), returning only the first match -- silently
    dropping every other photo the team took at each point down to one.
    """
    return [url for url in medias if url.lower().split("?")[0].endswith((".jpg", ".jpeg"))]


def load_manual_corrections() -> dict[str, dict[str, str]]:
    if not MANUAL_CORRECTIONS.exists():
        return {}
    return json.loads(MANUAL_CORRECTIONS.read_text(encoding="utf-8"))


def guess_kelurahan_from_text(text: str) -> str | None:
    text_lower = text.lower()
    for name in KNOWN_KELURAHAN:
        if name.lower() in text_lower:
            return name
    return None


def load_kelurahan_polygons() -> list[tuple[str, "shape"]]:
    if not KELURAHAN_BOUNDARIES.exists():
        return []
    data = json.loads(KELURAHAN_BOUNDARIES.read_text(encoding="utf-8"))
    return [(f["properties"]["name"], shape(f["geometry"])) for f in data["features"]]


def guess_kelurahan_from_point(lon: float, lat: float, polygons: list[tuple[str, "shape"]]) -> str | None:
    """Text (the surveyor was physically there) is trusted over this geometry
    lookup — crowd-sourced OSM kelurahan boundaries can be imprecise at edges.
    This is only used to fill gaps where the text says nothing at all.
    """
    point = Point(lon, lat)
    for name, polygon in polygons:
        if polygon.contains(point):
            return name
    return None


# --- Main cleaning pipeline ---------------------------------------------


def clean(raw_activities: list[dict]) -> tuple[dict, list[tuple[str, str]]]:
    polygons = load_kelurahan_polygons()
    corrections = load_manual_corrections()
    unreviewed: list[tuple[str, str]] = []
    features = []
    for activity in raw_activities:
        title = activity.get("title", "")
        description = activity.get("description", "")
        combined_text = f"{title}. {description}"
        lon, lat = activity["geometry"]["coordinates"]

        from_text = guess_kelurahan_from_text(combined_text)
        from_point = guess_kelurahan_from_point(lon, lat, polygons)
        if from_text and from_point and from_text != from_point:
            print(
                f"NOTE kelurahan disagreement for '{title.strip()}': "
                f"text says {from_text!r}, boundary geometry says {from_point!r} — keeping text."
            )
        kelurahan = from_text or from_point or "-"

        properties = {
            "halte_id": activity["_id"],
            "nama_halte": title,
            "kelurahan": kelurahan,
            "kecamatan": "Tembalang",
            "cctv": extract_variable(combined_text, KEYWORDS["cctv"]),
            "lighting": extract_variable(combined_text, KEYWORDS["lighting"]),
            "sidewalk_condition": extract_variable(combined_text, KEYWORDS["sidewalk_condition"]),
            "route_info_signage": extract_variable(combined_text, KEYWORDS["route_info_signage"]),
            "canopy": extract_variable(combined_text, KEYWORDS["canopy"]),
            "photo_urls": pick_photo_urls(activity.get("medias") or []),
            "survey_date": (activity.get("created_at") or "")[:10] or None,
            "catatan_lapangan": description,
        }

        halte_id = activity["_id"]
        if halte_id in corrections:
            properties.update(corrections[halte_id])
        else:
            unreviewed.append((halte_id, title.strip()))

        score, label = compute_condition_score(properties)
        properties["condition_score"] = score
        properties["condition_label"] = label

        features.append(
            {
                "type": "Feature",
                "geometry": activity["geometry"],
                "properties": properties,
            }
        )

    return {"type": "FeatureCollection", "features": features}, unreviewed


def main() -> None:
    if len(sys.argv) != 2:
        print("Usage: python scripts/clean_survey_export.py path/to/tembalang_activities.json")
        sys.exit(1)

    raw_path = Path(sys.argv[1])
    raw_response = json.loads(raw_path.read_text(encoding="utf-8"))
    activities = raw_response["data"]["activities"]

    feature_collection, unreviewed = clean(activities)

    for out_path in (PROCESSED_OUT, FRONTEND_OUT):
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(json.dumps(feature_collection, indent=2, ensure_ascii=False), encoding="utf-8")
        print(f"Wrote {len(feature_collection['features'])} features to {out_path}")

    unknown_kelurahan = sum(1 for f in feature_collection["features"] if f["properties"]["kelurahan"] == "-")
    if unknown_kelurahan:
        print(
            f"WARNING: {unknown_kelurahan} feature(s) have kelurahan=\"-\" — "
            "name not found in text AND coordinates fall outside all 9 kelurahan "
            f"polygons in {KELURAHAN_BOUNDARIES.name} (check for a bad GPS point)."
        )
    if unreviewed:
        print(
            f"\n{len(unreviewed)} NEW point(s) not found in {MANUAL_CORRECTIONS.name} — "
            "their cctv/lighting/sidewalk_condition/route_info_signage/canopy are still just the "
            "heuristic's first guess. Read each one's catatan_lapangan and add a verified entry to "
            f"{MANUAL_CORRECTIONS.name} (keyed by halte_id), then re-run this script:"
        )
        for halte_id, nama in unreviewed:
            print(f"  - {halte_id}  {nama}")
    else:
        print(f"\nAll points are covered by {MANUAL_CORRECTIONS.name} — nothing new to review.")

    print("Reminder: spot-check condition_score/condition_label against catatan_lapangan before trusting them.")


if __name__ == "__main__":
    main()
