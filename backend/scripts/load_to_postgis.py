"""One-off loader: cleaned GeoJSON (produced by clean_survey_export.py) -> PostGIS.

Usage:
    python scripts/load_to_postgis.py

Reads backend/data/processed/halte-survey.geojson and (re)creates the
halte_survey table in the database pointed to by DATABASE_URL (backend/.env).
"""

import json
import sys
from pathlib import Path

import geopandas as gpd
from sqlalchemy import Date, create_engine
from sqlalchemy.dialects.postgresql import JSONB

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from app.config import settings  # noqa: E402

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
GEOJSON_PATH = REPO_ROOT / "backend" / "data" / "processed" / "halte-survey.geojson"


def main() -> None:
    if not GEOJSON_PATH.exists():
        print(f"{GEOJSON_PATH} not found — run clean_survey_export.py first.")
        sys.exit(1)

    gdf = gpd.read_file(GEOJSON_PATH)
    gdf = gdf.rename(columns={"geometry": "geom"}).set_geometry("geom")

    # geopandas reads `media` back as a Python list-of-dicts column; left as
    # object dtype, to_postgis stringifies it with str() (single-quoted repr,
    # not valid JSON) and infers a plain text column -- the app.models.halte
    # SQLAlchemy model expects a real jsonb column. json.dumps + an explicit
    # dtype makes to_postgis create/fill it correctly instead.
    gdf["media"] = gdf["media"].apply(json.dumps)

    # to_postgis needs a sync (psycopg2) engine, not the async one used by the API.
    sync_url = settings.database_url.replace("postgresql+asyncpg", "postgresql+psycopg2")
    engine = create_engine(sync_url)

    gdf.to_postgis(
        "halte_survey",
        engine,
        if_exists="replace",
        index=False,
        dtype={"media": JSONB, "survey_date": Date},
    )
    print(f"Loaded {len(gdf)} halte points into halte_survey.")


if __name__ == "__main__":
    main()
