"""Network Isochrone Analysis (PRD roadmap item, after Community Maps).

Computes walking-time catchment areas ("isochrones") around the 42 surveyed
halte, using the routable pedestrian graph built by build_pedestrian_network.py.
Output answers: "which parts of the 9 surveyed kelurahan are within a 3 / 5 /
10-minute walk of an EXISTING halte?" — the gap between this and the
population layer is what the next roadmap module (Location Allocation) will
use to recommend where new stops are needed.

Methodology (documented here since there's no isochrone spec in the PRD):
- Catchment is measured from each existing halte outward along the real
  street network (not straight-line/"as the crow flies" circles like the
  mockup's placeholder SVG) — a 15-min isochrone can be a very different
  shape than a circle wherever the network is sparse or blocked (river,
  toll road).
- Thresholds: 3 / 5 / 10 minutes, as specified by the PRD (Tabel 5 and the
  "Modul Network Isochrone Analysis" acceptance criteria). That works out to
  roughly 250m / 415m / 830m of network distance at an average adult walking
  pace. Converted to a budget using WALK_SPEED_M_PER_MIN below.
- Cost = pure walking distance/time on the network. NOT safety-weighted
  (e.g. penalizing unlit segments) — our condition data (CCTV/lighting/
  sidewalk) is recorded per-halte-point from the survey, not per road
  segment, so there is nothing to attach a safety cost to yet. Once YOLOv8
  produces segment-level attributes this can become a weighted cost; until
  then, a fake safety weight would be worse than an honest distance-only one.
- Each band is CUMULATIVE ("reachable within <= N min"), not an exclusive
  ring (3-5min, 5-10min) — simpler to compute and to render (draw 10min
  first, 5min on top, 3min on top of that), and is the standard way
  isochrones are visualized. Bands are the union across all 42 halte, so a
  resident only needs to be near *any* one halte to be counted covered.

Usage:
    python scripts/build_isochrones.py
"""

import json
from pathlib import Path

import geopandas as gpd
import networkx as nx
import osmnx as ox
from shapely.geometry import mapping
from shapely.ops import unary_union

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
KELURAHAN_BOUNDARIES = REPO_ROOT / "backend" / "data" / "reference" / "kelurahan_tembalang.geojson"
HALTE_SURVEY = REPO_ROOT / "backend" / "data" / "processed" / "halte-survey.geojson"
OUT_PATHS = [
    REPO_ROOT / "backend" / "data" / "processed" / "halte_isochrones.geojson",
    REPO_ROOT / "frontend" / "public" / "data" / "halte_isochrones.geojson",
]

PROJECTED_CRS = "EPSG:32749"  # UTM 49S — matches build_population_layer.py, accurate meters for Semarang
WALK_SPEED_M_PER_MIN = 83.3  # ~5 km/h, standard pedestrian-accessibility assumption
THRESHOLDS_MIN = [3, 5, 10]  # per PRD Tabel 5 — keep in sync with the PRD if changed
CORRIDOR_HALF_WIDTH_M = 20  # buffers each reachable street to a ~40m-wide walkable corridor


def load_boundary():
    gdf = gpd.read_file(KELURAHAN_BOUNDARIES)
    return unary_union(gdf.geometry)


def build_graph(boundary):
    ox.settings.use_cache = True
    ox.settings.log_console = False
    graph = ox.graph_from_polygon(boundary, network_type="walk", simplify=True)
    return ox.convert.to_undirected(graph)


def load_halte_points():
    gdf = gpd.read_file(HALTE_SURVEY)
    return gdf


def main() -> None:
    print("Rebuilding pedestrian graph (should hit OSM cache from build_pedestrian_network.py)...")
    boundary = load_boundary()
    graph = build_graph(boundary)
    print(f"Graph: {graph.number_of_nodes()} nodes, {graph.number_of_edges()} edges.")

    halte = load_halte_points()
    print(f"Snapping {len(halte)} halte points to nearest network node...")
    nearest_nodes = ox.distance.nearest_nodes(graph, X=halte.geometry.x.values, Y=halte.geometry.y.values)

    # Project just once: reachable-edge geometries get buffered in meters, then
    # the finished per-band polygon is reprojected back to WGS84 for storage.
    edges_gdf = ox.graph_to_gdfs(graph, nodes=False)
    edges_projected = edges_gdf.to_crs(PROJECTED_CRS)

    band_geoms: dict[int, list] = {m: [] for m in THRESHOLDS_MIN}

    for i, node in enumerate(nearest_nodes):
        lengths = nx.single_source_dijkstra_path_length(graph, node, cutoff=None, weight="length")
        for minutes in THRESHOLDS_MIN:
            budget_m = minutes * WALK_SPEED_M_PER_MIN
            reachable = {n for n, d in lengths.items() if d <= budget_m}
            if not reachable:
                continue
            mask = edges_projected.index.get_level_values("u").isin(reachable) & edges_projected.index.get_level_values(
                "v"
            ).isin(reachable)
            reachable_edges = edges_projected[mask]
            if reachable_edges.empty:
                continue
            corridor = reachable_edges.geometry.buffer(CORRIDOR_HALF_WIDTH_M)
            band_geoms[minutes].extend(corridor.tolist())
        if (i + 1) % 10 == 0 or i == len(nearest_nodes) - 1:
            print(f"  ...{i + 1}/{len(nearest_nodes)} halte processed")

    features = []
    for minutes in THRESHOLDS_MIN:
        merged = unary_union(band_geoms[minutes])
        merged_gdf = gpd.GeoSeries([merged], crs=PROJECTED_CRS).to_crs("EPSG:4326")
        area_km2 = gpd.GeoSeries([merged], crs=PROJECTED_CRS).area.iloc[0] / 1_000_000
        print(f"{minutes} min band: {area_km2:.2f} km2 covered")
        features.append(
            {
                "type": "Feature",
                "properties": {
                    "minutes": minutes,
                    "halte_count": len(halte),
                    "area_km2": round(area_km2, 3),
                },
                "geometry": mapping(merged_gdf.iloc[0]),
            }
        )

    # Largest band first so the frontend can add-layer in this order and get
    # correct z-stacking (10min underneath, 3min on top) without re-sorting.
    features.sort(key=lambda f: -f["properties"]["minutes"])
    collection = {"type": "FeatureCollection", "features": features}

    for out_path in OUT_PATHS:
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(json.dumps(collection), encoding="utf-8")
        print(f"Wrote {out_path}")


if __name__ == "__main__":
    main()
