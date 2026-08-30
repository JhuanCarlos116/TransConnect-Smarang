"""One-off script: BPS population table (xlsx) + kelurahan boundary -> a
population/density GeoJSON, for use as a demand-weight input in the
Location Allocation Model (and as a population-density layer on the map).

The team's survey (and this whole project, per the PRD) is scoped to 9 of
Kecamatan Tembalang's 12 kelurahan — the ones the surveyed BRT corridor
actually passes through. The source BPS table
("DATA PENDUDUK DAN LAJU PERTUMBUHAN PENDUDUK KECAMATAN TEMBALANG",
periode 2010-2020) covers all 12; this script keeps only the 9 that match
backend/data/reference/kelurahan_tembalang.geojson and prints a NOTE
listing the 3 it drops (Jangli, Rowosari, Sendangguwo), so that's a visible
decision, not a silent one.

Also computes `kepadatan_per_km2` (population / polygon area), not just raw
headcount, since kelurahan areas differ a lot and the Location Allocation
Model needs density, not size-biased population counts.

Usage:
    python scripts/build_population_layer.py "path/to/Data kependudukan.xlsx"
"""

import json
import sys
from pathlib import Path

import geopandas as gpd
import pandas as pd

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
KELURAHAN_BOUNDARIES = REPO_ROOT / "backend" / "data" / "reference" / "kelurahan_tembalang.geojson"
PROCESSED_OUT = REPO_ROOT / "backend" / "data" / "processed" / "kelurahan_population.geojson"
FRONTEND_OUT = REPO_ROOT / "frontend" / "public" / "data" / "kelurahan_population.geojson"

# Semarang falls in UTM zone 49S. Used only to compute polygon area in km²
# accurately — the output GeoJSON itself stays in WGS84 lon/lat like every
# other layer in this project.
METRIC_CRS = "EPSG:32749"


def load_population_table(xlsx_path: Path) -> dict[str, dict]:
    """Reads the BPS sheet. Rows are matched by "No." being a real number
    (1-12), which naturally skips the title/header rows above and the
    "Tembalang" kecamatan-wide total row below (its "No." cell is blank) —
    more robust than hardcoding row indices.
    """
    df = pd.read_excel(xlsx_path, header=None)
    records: dict[str, dict] = {}
    for _, row in df.iterrows():
        no, kelurahan, penduduk, laju = row[0], row[1], row[2], row[3]
        if not isinstance(no, (int, float)) or pd.isna(no) or not isinstance(kelurahan, str):
            continue
        records[kelurahan.strip().title()] = {
            "jumlah_penduduk": int(penduduk),
            "laju_pertumbuhan_persen_2010_2020": None if pd.isna(laju) else round(float(laju), 2),
        }
    return records


def build(xlsx_path: Path) -> dict:
    population = load_population_table(xlsx_path)
    gdf = gpd.read_file(KELURAHAN_BOUNDARIES)
    area_km2 = gdf.to_crs(METRIC_CRS).geometry.area / 1e6

    features = []
    unmatched = []
    for (_, row), luas_km2 in zip(gdf.iterrows(), area_km2):
        name = row["name"]
        pop_info = population.get(name)
        if pop_info is None:
            unmatched.append(name)
            jumlah_penduduk = laju = kepadatan = None
        else:
            jumlah_penduduk = pop_info["jumlah_penduduk"]
            laju = pop_info["laju_pertumbuhan_persen_2010_2020"]
            kepadatan = round(jumlah_penduduk / luas_km2, 1)

        features.append(
            {
                "type": "Feature",
                "geometry": row.geometry.__geo_interface__,
                "properties": {
                    "kelurahan": name,
                    "jumlah_penduduk": jumlah_penduduk,
                    "laju_pertumbuhan_persen_2010_2020": laju,
                    "luas_km2": round(luas_km2, 3),
                    "kepadatan_per_km2": kepadatan,
                },
            }
        )

    if unmatched:
        print(f"WARNING: no population row matched for kelurahan in the boundary file: {unmatched}")

    out_of_scope = sorted(set(population) - set(gdf["name"]))
    if out_of_scope:
        print(
            f"NOTE: {len(out_of_scope)} kelurahan from the BPS table are outside the 9-kelurahan "
            f"survey scope and were dropped (expected): {out_of_scope}"
        )

    return {"type": "FeatureCollection", "features": features}


def main() -> None:
    if len(sys.argv) != 2:
        print('Usage: python scripts/build_population_layer.py "path/to/Data kependudukan.xlsx"')
        sys.exit(1)

    feature_collection = build(Path(sys.argv[1]))

    for out_path in (PROCESSED_OUT, FRONTEND_OUT):
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(json.dumps(feature_collection, indent=2, ensure_ascii=False), encoding="utf-8")
        print(f"Wrote {len(feature_collection['features'])} kelurahan to {out_path}")

    densities = [f["properties"]["kepadatan_per_km2"] for f in feature_collection["features"]]
    if all(d is not None for d in densities):
        ranked = sorted(feature_collection["features"], key=lambda f: f["properties"]["kepadatan_per_km2"], reverse=True)
        print("\nKepadatan (jiwa/km²), tertinggi -> terendah:")
        for f in ranked:
            p = f["properties"]
            print(f"  {p['kelurahan']:<15} {p['kepadatan_per_km2']:>8.1f}  ({p['jumlah_penduduk']} jiwa / {p['luas_km2']} km²)")


if __name__ == "__main__":
    main()
