"""Curates the team's full bus stop / halte inventory down to the 9 surveyed
kelurahan.

Source (backend/data/raw/bus_stops_raw.geojson, not committed -- raw exports
are gitignored) is a 673-point dump covering a much wider area than the study
area, and carries NO properties at all: every feature is a bare Point. This
script keeps only the points that fall inside the 9 kelurahan of Kecamatan
Tembalang and tags each with the kelurahan it landed in plus a stable id.

Note this inventory is largely disjoint from the team's own 42 survey points
(only 14 of the curated stops sit within 50 m of a surveyed point, median
distance 272 m) -- the two datasets complement rather than duplicate each
other, so no de-duplication is attempted here.

Usage:
    python scripts/build_bus_stops.py
"""

import json
from pathlib import Path

import geopandas as gpd

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
RAW_SOURCE = REPO_ROOT / "backend" / "data" / "raw" / "bus_stops_raw.geojson"
KELURAHAN_BOUNDARIES = REPO_ROOT / "backend" / "data" / "reference" / "kelurahan_tembalang.geojson"
OUT_PATHS = [
    REPO_ROOT / "backend" / "data" / "processed" / "bus_stops.geojson",
    REPO_ROOT / "frontend" / "public" / "data" / "bus_stops.geojson",
]


def main() -> None:
    if not RAW_SOURCE.exists():
        print(f"ERROR: {RAW_SOURCE} not found — drop the raw bus stop export there first.")
        raise SystemExit(1)

    stops = gpd.read_file(RAW_SOURCE)
    kelurahan = gpd.read_file(KELURAHAN_BOUNDARIES)[["name", "geometry"]]
    print(f"Read {len(stops)} raw stops, {len(kelurahan)} kelurahan boundaries.")

    inside = gpd.sjoin(stops[["geometry"]], kelurahan, how="inner", predicate="within")
    print(f"{len(inside)} stops fall inside the 9 kelurahan ({len(stops) - len(inside)} dropped as out of area).")

    # Sorted by kelurahan then coordinates so ids stay stable across re-runs
    # even if the raw file's feature order changes.
    inside = inside.assign(lon=inside.geometry.x, lat=inside.geometry.y).sort_values(["name", "lon", "lat"])

    features = []
    for i, (_, row) in enumerate(inside.iterrows(), start=1):
        features.append(
            {
                "type": "Feature",
                "properties": {
                    "stop_id": f"BS-{i:03d}",
                    "kelurahan": row["name"],
                },
                "geometry": {"type": "Point", "coordinates": [row["lon"], row["lat"]]},
            }
        )

    collection = {
        "type": "FeatureCollection",
        "properties": {
            "source": "Inventaris halte/bus stop Tim GOPEK, dikurasi ke 9 kelurahan Kecamatan Tembalang",
            "total_stops": len(features),
        },
        "features": features,
    }

    for out_path in OUT_PATHS:
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(json.dumps(collection, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"Wrote {len(features)} stops to {out_path}")

    print()
    print("Stops per kelurahan:")
    print(inside["name"].value_counts().to_string())


if __name__ == "__main__":
    main()
