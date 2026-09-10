"""BRT Trans Semarang network layer (read-only reference data).

Why this is raw SQL instead of an ORM model like the rest of app/models:
these three tables are loaded by an external script
(transconnect-deploy/load_brt_transconnect.py) into the `trans_semarang`
schema, NOT by the team's geopandas loader and NOT by the API. Declaring them
as SQLAlchemy models would mean Base.metadata.create_all() in main.py's
lifespan tries to create them on startup -- and if the schema is missing it
raises, which takes the entire API down (every route 502s, not just this one).

A decorative context layer must never be able to break the app, so these
queries are written defensively: if the tables aren't there yet, the endpoint
returns an empty FeatureCollection and the map simply draws nothing.

Data provenance: "Rute BRT Trans Semarang 2", an ArcGIS Online web map whose
features were embedded inline (no feature service). Extracted with
/deploy/extract_arcgis_webmap.py, reprojected EPSG:3857 -> 4326, and loaded
here. Geometry is authoritative -- the source's own Latitude__/Longitude
columns disagree with it by a mean of 128 m (max 1.15 km) and are not loaded.
"""

import json
import logging

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.exc import ProgrammingError
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_session

router = APIRouter()
logger = logging.getLogger(__name__)

SCHEMA = "trans_semarang"

_HALTE_SQL = f"""
SELECT json_build_object(
    'type', 'FeatureCollection',
    'features', COALESCE(json_agg(json_build_object(
        'type', 'Feature',
        'geometry', ST_AsGeoJSON(geom)::json,
        'properties', json_build_object(
            'halte_id',   halte_id,
            'no',         no,
            'nama_halte', nama_halte,
            'alias',      alias,
            'jenis_shel', jenis_shel
        )
    )), '[]'::json)
)::text
FROM {SCHEMA}.halte_brt;
"""

_RUTE_SQL = f"""
SELECT json_build_object(
    'type', 'FeatureCollection',
    'features', COALESCE(json_agg(json_build_object(
        'type', 'Feature',
        'geometry', ST_AsGeoJSON(geom)::json,
        'properties', json_build_object(
            'rute_id',   rute_id,
            'koridor',   koridor,
            'rute',      rute,
            'length_km', length_km
        )
    )), '[]'::json)
)::text
FROM {SCHEMA}.rute_brt;
"""


async def _run(session: AsyncSession, sql: str, label: str) -> dict:
    """Run one GeoJSON query, degrading to an empty collection on any DB
    error (most likely: the layer hasn't been loaded yet)."""
    try:
        result = await session.execute(text(sql))
        raw = result.scalar()
    except ProgrammingError as exc:
        logger.warning("brt layer '%s' unavailable, returning empty: %s", label, exc)
        return {"type": "FeatureCollection", "features": []}

    if raw is None:
        return {"type": "FeatureCollection", "features": []}
    # asyncpg hands json back as a string depending on the driver/typecode
    # path; parse explicitly rather than assuming a dict.
    return json.loads(raw) if isinstance(raw, str) else raw


@router.get("/brt-network")
async def get_brt_network(session: AsyncSession = Depends(get_session)) -> dict:
    """The whole BRT Trans Semarang network as one payload: 673 halte points
    plus 34 corridor lines (17 corridors x 2 directions).

    Deliberately a single response so the frontend's toggle only needs one
    request and can't end up showing corridors without their halte.
    """
    halte = await _run(session, _HALTE_SQL, "halte_brt")
    rute = await _run(session, _RUTE_SQL, "rute_brt")
    return {
        "type": "FeatureCollection",
        "features": halte["features"] + rute["features"],
    }
