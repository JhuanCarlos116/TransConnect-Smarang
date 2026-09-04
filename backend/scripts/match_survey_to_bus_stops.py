"""Cross-references the two halte datasets so the dashboard can flag when a
bus stop inventory point and a community report likely describe the same
physical halte.

build_bus_stops.py already found (in its docstring) that only 14 of the 71
curated stops sit within 50 m of a surveyed point, median distance 272 m --
i.e. the two datasets mostly describe *different* halte, not duplicates. This
script recomputes that same 50 m match and, instead of leaving it as a
one-off note, writes it into both GeoJSON files so the map can show it:

- bus_stops.geojson gains `surveyed_report_id` / `match_distance_m` on the
  ~14 stops that have a nearby report.
- community-reports.geojson gains `matched_stop_id` / `match_distance_m` on
  the same pairs.

Matching is nearest-neighbour, one match per report, capped at 50 m -- wide
enough to absorb GPS noise between an independently-surveyed point and an
inventory point, narrow enough to stay well under the ~300 m typical spacing
between distinct stops in this network (so it will not accidentally pair two
different halte). If two reports both land within 50 m of the same stop, only
the closer one keeps the match.

Usage:
    python scripts/match_survey_to_bus_stops.py
"""

import json
from pathlib import Path

import geopandas as gpd

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
PROJECTED_CRS = "EPSG:32749"
MATCH_THRESHOLD_M = 50

BUS_STOPS_PATHS = [
    REPO_ROOT / "backend" / "data" / "processed" / "bus_stops.geojson",
    REPO_ROOT / "frontend" / "public" / "data" / "bus_stops.geojson",
]
REPORTS_PATHS = [
    REPO_ROOT / "backend" / "data" / "processed" / "community-reports.geojson",
    REPO_ROOT / "frontend" / "public" / "data" / "community-reports.geojson",
]


def main() -> None:
    stops_raw = json.loads(BUS_STOPS_PATHS[0].read_text(encoding="utf-8"))
    reports_raw = json.loads(REPORTS_PATHS[0].read_text(encoding="utf-8"))
    print(f"{len(stops_raw['features'])} bus stops, {len(reports_raw['features'])} community reports.")

    # geopandas is only used for the geometry math (CRS projection + nearest
    # join); output is written by patching the original raw dicts so other
    # columns (e.g. tanggal_lapor, a date) round-trip exactly as they were.
    stops_p = gpd.GeoDataFrame.from_features(stops_raw["features"], crs="EPSG:4326").to_crs(PROJECTED_CRS)
    reports_p = gpd.GeoDataFrame.from_features(reports_raw["features"], crs="EPSG:4326").to_crs(PROJECTED_CRS)

    nearest = gpd.sjoin_nearest(
        reports_p[["report_id", "geometry"]],
        stops_p[["stop_id", "geometry"]],
        distance_col="distance_m",
    )
    within = nearest[nearest["distance_m"] <= MATCH_THRESHOLD_M].sort_values("distance_m")

    # One report per stop: keep the closer report if two land on the same stop.
    within = within.drop_duplicates(subset="stop_id", keep="first")
    print(f"{len(within)} matches within {MATCH_THRESHOLD_M} m (median all-pairs distance is ~272 m per build_bus_stops.py).")

    report_to_stop = dict(zip(within["report_id"], zip(within["stop_id"], within["distance_m"])))
    stop_to_report = {stop_id: (report_id, dist) for report_id, (stop_id, dist) in report_to_stop.items()}

    for feature in stops_raw["features"]:
        sid = feature["properties"]["stop_id"]
        match = stop_to_report.get(sid)
        feature["properties"]["surveyed_report_id"] = match[0] if match else None
        feature["properties"]["match_distance_m"] = round(match[1], 1) if match else None

    for feature in reports_raw["features"]:
        rid = feature["properties"]["report_id"]
        match = report_to_stop.get(rid)
        feature["properties"]["matched_stop_id"] = match[0] if match else None
        feature["properties"]["match_distance_m"] = round(match[1], 1) if match else None

    for out_path in BUS_STOPS_PATHS:
        out_path.write_text(json.dumps(stops_raw, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"Wrote {out_path}")

    for out_path in REPORTS_PATHS:
        out_path.write_text(json.dumps(reports_raw, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"Wrote {out_path}")

    print()
    print("Matched pairs (stop_id -> report_id, distance):")
    for sid, (rid, dist) in sorted(stop_to_report.items()):
        print(f"  {sid} -> {rid}  ({dist:.1f} m)")


if __name__ == "__main__":
    main()
