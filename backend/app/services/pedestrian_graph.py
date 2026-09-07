"""Loads the routable pedestrian graph used by the Safe Transit Navigator
(app/routers/route.py).

Same graph-building approach as scripts/build_isochrones.py and
scripts/build_location_allocation.py (ox.graph_from_polygon over the 9
surveyed kelurahan, network_type="walk"), but those are one-off scripts that
build it once per run and exit. A live server needs the graph kept in memory
across requests instead of rebuilding it (a multi-second osmnx/Overpass call)
on every single route lookup -- so this module builds it once, lazily, and
caches the result at module scope for the lifetime of the process. See
app/main.py's lifespan handler, which calls get_graph() at startup so the
first real request isn't the one that pays for it.
"""

import networkx as nx
import osmnx as ox
import geopandas as gpd
from pathlib import Path
from shapely.ops import unary_union

BACKEND_ROOT = Path(__file__).resolve().parent.parent.parent
KELURAHAN_BOUNDARIES = BACKEND_ROOT / "data" / "reference" / "kelurahan_tembalang.geojson"

_graph: nx.MultiGraph | None = None


def _build_graph() -> nx.MultiGraph:
    ox.settings.use_cache = True
    ox.settings.log_console = False
    gdf = gpd.read_file(KELURAHAN_BOUNDARIES)
    boundary = unary_union(gdf.geometry)
    graph = ox.graph_from_polygon(boundary, network_type="walk", simplify=True)
    return ox.convert.to_undirected(graph)


def get_graph() -> nx.MultiGraph:
    global _graph
    if _graph is None:
        _graph = _build_graph()
    return _graph
