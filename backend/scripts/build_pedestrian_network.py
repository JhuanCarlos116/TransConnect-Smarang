"""Builds a routable pedestrian street network for the 9 surveyed kelurahan,
pulled straight from OpenStreetMap via osmnx — this is the base graph the
Network Isochrone Analysis module will run shortest/reachability paths on.

Why OSM instead of the team's manually-joined "Jalan Temcy" GeoJSON:
OSM's `highway` tag already classifies every way (footway, residential,
trunk, ...), so osmnx's `network_type="walk"` filter picks pedestrian-
passable roads automatically — no manual per-segment digitizing needed.
It also builds a properly noded graph (segments snap together at real
intersections), avoiding the disconnected-network problem found when
inspecting the team's file (32 separate components, 25 isolated segments,
likely introduced by the QGIS join against kelurahan boundaries). This also
matches the PRD's own stated source for this dataset (OpenStreetMap /
Geoportal Kota).

Output is backend-only (not copied to frontend/public) — this graph is
meant to be consumed server-side by the isochrone/routing service, not
rendered directly as a map layer.

Usage:
    python scripts/build_pedestrian_network.py
"""

import json
from pathlib import Path

import geopandas as gpd
import osmnx as ox
from shapely.ops import unary_union

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
KELURAHAN_BOUNDARIES = REPO_ROOT / "backend" / "data" / "reference" / "kelurahan_tembalang.geojson"
EDGES_OUT = REPO_ROOT / "backend" / "data" / "processed" / "pedestrian_network_edges.geojson"
NODES_OUT = REPO_ROOT / "backend" / "data" / "processed" / "pedestrian_network_nodes.geojson"


def load_boundary():
    gdf = gpd.read_file(KELURAHAN_BOUNDARIES)
    return unary_union(gdf.geometry)


def build_graph(boundary):
    ox.settings.use_cache = True
    ox.settings.log_console = False
    graph = ox.graph_from_polygon(boundary, network_type="walk", simplify=True)
    return graph


def main() -> None:
    print("Dissolving the 9 kelurahan boundaries into one polygon...")
    boundary = load_boundary()

    print("Downloading walkable street network from OpenStreetMap (Overpass API)...")
    graph = build_graph(boundary)

    nodes_gdf, edges_gdf = ox.graph_to_gdfs(graph)
    print(f"Graph: {len(nodes_gdf)} nodes, {len(edges_gdf)} edges.")

    components = list(ox.convert.to_undirected(graph).edges())
    import networkx as nx

    n_components = nx.number_connected_components(ox.convert.to_undirected(graph))
    print(f"Connected components: {n_components} (1 = fully routable, no isolated pockets)")

    highway_counts = edges_gdf["highway"].apply(lambda v: v if isinstance(v, str) else str(v)).value_counts()
    print("\nEdge count by OSM highway type:")
    print(highway_counts.to_string())

    total_km = edges_gdf["length"].sum() / 1000
    print(f"\nTotal network length: {total_km:.1f} km")

    EDGES_OUT.parent.mkdir(parents=True, exist_ok=True)
    edges_out = edges_gdf.reset_index()[["u", "v", "key", "highway", "name", "length", "geometry"]].copy()
    edges_out["highway"] = edges_out["highway"].apply(lambda v: v if isinstance(v, str) else json.dumps(v))
    edges_out["name"] = edges_out["name"].apply(lambda v: v if isinstance(v, str) or v is None else json.dumps(v))
    edges_out.to_file(EDGES_OUT, driver="GeoJSON")
    print(f"\nWrote {len(edges_out)} edges to {EDGES_OUT}")

    nodes_out = nodes_gdf.reset_index()[["osmid", "x", "y", "street_count", "geometry"]]
    nodes_out.to_file(NODES_OUT, driver="GeoJSON")
    print(f"Wrote {len(nodes_out)} nodes to {NODES_OUT}")


if __name__ == "__main__":
    main()
