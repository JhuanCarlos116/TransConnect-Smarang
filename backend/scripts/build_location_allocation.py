"""Location Allocation Model (PRD roadmap item, after Network Isochrone Analysis).

Recommends where NEW halte should go, using the same routable pedestrian
graph as build_isochrones.py. This is a classical greedy Maximal Covering
Location Problem (MCLP) solver -- not machine learning, not YOLOv8. It picks
the candidate spots that cover the most currently-unserved population within
a walking budget, one at a time, until TOP_K stops are chosen.

Methodology (documented here, same spirit as build_isochrones.py, since
there's no fixed spec for this module in the PRD):

- Demand: kelurahan_population.geojson only gives one population figure per
  kelurahan (9 zones total), not per-block. To reason about coverage at
  street-network resolution we lay a GRID_SPACING_M grid over each kelurahan
  polygon and assign every cell a share of that kelurahan's population,
  proportional to the cell's area and the kelurahan's own recorded density
  (kepadatan_per_km2). This is a uniform-density assumption *within* each
  kelurahan -- an explicit modeling simplification, not fabricated data; the
  population and density figures themselves are the real BPS-sourced numbers
  already used by the population layer.
- "Served" = within a SERVED_THRESHOLD_MIN walk (network distance, same
  WALK_SPEED_M_PER_MIN as build_isochrones.py) of an EXISTING surveyed halte.
  5 minutes is the middle of the PRD's own 3/5/10-min isochrone bands, used
  here as the accessibility cutoff.
- Candidates: network nodes with street_count >= 3 (real intersections) --
  plausible stop locations, not the middle of a single straight block or a
  dead end.
- Selection: greedy MCLP. Repeatedly pick the candidate that covers the most
  weighted population NOT already covered by an existing halte or an
  already-picked candidate, until TOP_K picks are made. Greedy is the
  standard approximation for MCLP (provably within 1-1/e of optimal); an
  exact solver isn't worth it at this problem size.
- Same caveat as the isochrone module: this is walking-distance only, not
  safety-weighted, for the same reason (no segment-level condition data yet).

Usage:
    python scripts/build_location_allocation.py
"""

import json
from pathlib import Path

import geopandas as gpd
import networkx as nx
import osmnx as ox
from shapely.geometry import Point, mapping

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
KELURAHAN_BOUNDARIES = REPO_ROOT / "backend" / "data" / "reference" / "kelurahan_tembalang.geojson"
POPULATION = REPO_ROOT / "backend" / "data" / "processed" / "kelurahan_population.geojson"
HALTE_SURVEY = REPO_ROOT / "backend" / "data" / "processed" / "halte-survey.geojson"
OUT_PATHS = [
    REPO_ROOT / "backend" / "data" / "processed" / "halte_recommendations.geojson",
    REPO_ROOT / "frontend" / "public" / "data" / "halte_recommendations.geojson",
]

PROJECTED_CRS = "EPSG:32749"  # UTM 49S -- matches build_isochrones.py / build_population_layer.py
WALK_SPEED_M_PER_MIN = 83.3  # ~5 km/h, same assumption as build_isochrones.py
SERVED_THRESHOLD_MIN = 5
SERVED_BUDGET_M = SERVED_THRESHOLD_MIN * WALK_SPEED_M_PER_MIN
GRID_SPACING_M = 100
MIN_CANDIDATE_STREET_COUNT = 3
TOP_K = 5


def load_boundary_union():
    gdf = gpd.read_file(KELURAHAN_BOUNDARIES)
    return gdf


def build_graph(boundary_gdf) -> nx.MultiGraph:
    ox.settings.use_cache = True
    ox.settings.log_console = False
    from shapely.ops import unary_union

    graph = ox.graph_from_polygon(unary_union(boundary_gdf.geometry), network_type="walk", simplify=True)
    return ox.convert.to_undirected(graph)


def build_demand_grid(kelurahan_gdf: gpd.GeoDataFrame, population_gdf: gpd.GeoDataFrame) -> gpd.GeoDataFrame:
    """One weighted point per GRID_SPACING_M cell whose centroid falls inside a kelurahan,
    weight = that kelurahan's density * cell area (people represented by the cell)."""
    pop_by_name = population_gdf.set_index("kelurahan")["kepadatan_per_km2"]
    cell_area_km2 = (GRID_SPACING_M / 1000) ** 2

    points = []
    weights = []
    kelurahan_names = []

    for _, row in kelurahan_gdf.to_crs(PROJECTED_CRS).iterrows():
        name = row.get("kelurahan") or row.get("nama") or row.get("name")
        if name not in pop_by_name.index:
            continue
        density = pop_by_name[name]
        minx, miny, maxx, maxy = row.geometry.bounds
        x = minx
        while x < maxx:
            y = miny
            while y < maxy:
                pt = Point(x + GRID_SPACING_M / 2, y + GRID_SPACING_M / 2)
                if row.geometry.contains(pt):
                    points.append(pt)
                    weights.append(density * cell_area_km2)
                    kelurahan_names.append(name)
                y += GRID_SPACING_M
            x += GRID_SPACING_M

    grid = gpd.GeoDataFrame(
        {"weight": weights, "kelurahan": kelurahan_names}, geometry=points, crs=PROJECTED_CRS
    ).to_crs("EPSG:4326")
    return grid


def snap_to_nodes(graph, points_gdf: gpd.GeoDataFrame):
    return ox.distance.nearest_nodes(graph, X=points_gdf.geometry.x.values, Y=points_gdf.geometry.y.values)


def main() -> None:
    print("Loading kelurahan boundaries + population...")
    kelurahan_gdf = load_boundary_union()
    population_gdf = gpd.read_file(POPULATION)

    print("Rebuilding pedestrian graph (should hit OSM cache from build_pedestrian_network.py)...")
    graph = build_graph(kelurahan_gdf)
    print(f"Graph: {graph.number_of_nodes()} nodes, {graph.number_of_edges()} edges.")

    print(f"Laying a {GRID_SPACING_M}m demand grid over the 9 kelurahan...")
    demand_grid = build_demand_grid(kelurahan_gdf, population_gdf)
    print(f"{len(demand_grid)} demand cells, {demand_grid['weight'].sum():,.0f} total represented population.")

    demand_grid["node"] = snap_to_nodes(graph, demand_grid)
    demand_weight_by_node: dict[int, float] = {}
    for node, weight in zip(demand_grid["node"], demand_grid["weight"]):
        demand_weight_by_node[node] = demand_weight_by_node.get(node, 0.0) + weight

    print(f"Loading {HALTE_SURVEY.name} and snapping to the network...")
    halte_gdf = gpd.read_file(HALTE_SURVEY)
    halte_nodes = list(snap_to_nodes(graph, halte_gdf))

    print(f"Computing existing coverage (<= {SERVED_THRESHOLD_MIN} min walk of an existing halte)...")
    dist_to_nearest_halte = nx.multi_source_dijkstra_path_length(graph, halte_nodes, weight="length")
    covered_nodes = {n for n, d in dist_to_nearest_halte.items() if d <= SERVED_BUDGET_M}

    uncovered_weight_by_node = {n: w for n, w in demand_weight_by_node.items() if n not in covered_nodes}
    total_demand = sum(demand_weight_by_node.values())
    already_served = total_demand - sum(uncovered_weight_by_node.values())
    print(
        f"Already served by existing halte: {already_served:,.0f} / {total_demand:,.0f} "
        f"({100 * already_served / total_demand:.1f}%)"
    )

    print("Building candidate list (network intersections, street_count >= 3)...")
    nodes_gdf = ox.graph_to_gdfs(graph, edges=False)
    candidates = nodes_gdf[nodes_gdf["street_count"] >= MIN_CANDIDATE_STREET_COUNT].index.tolist()
    print(f"{len(candidates)} candidate intersections.")

    print("Scoring each candidate's reachable uncovered demand (this is the slow step)...")
    candidate_coverage: dict[int, set[int]] = {}
    for i, candidate in enumerate(candidates):
        lengths = nx.single_source_dijkstra_path_length(graph, candidate, cutoff=SERVED_BUDGET_M, weight="length")
        candidate_coverage[candidate] = {n for n in lengths if n in uncovered_weight_by_node}
        if (i + 1) % 500 == 0 or i == len(candidates) - 1:
            print(f"  ...{i + 1}/{len(candidates)} candidates scored")

    print(f"Greedily selecting top {TOP_K} new halte locations...")
    remaining_uncovered = dict(uncovered_weight_by_node)
    picked: list[dict] = []
    picked_nodes: set[int] = set()

    for rank in range(1, TOP_K + 1):
        best_node = None
        best_gain = -1.0
        for candidate, covered_set in candidate_coverage.items():
            if candidate in picked_nodes:
                continue
            gain = sum(remaining_uncovered.get(n, 0.0) for n in covered_set)
            if gain > best_gain:
                best_gain = gain
                best_node = candidate
        if best_node is None or best_gain <= 0:
            print(f"  Stopping at rank {rank - 1}: no candidate adds any new coverage.")
            break

        newly_covered = candidate_coverage[best_node]
        for n in newly_covered:
            remaining_uncovered.pop(n, None)
        picked_nodes.add(best_node)

        point = Point(nodes_gdf.loc[best_node, "x"], nodes_gdf.loc[best_node, "y"])
        kelurahan_match = kelurahan_gdf[kelurahan_gdf.geometry.contains(point)]
        kelurahan_name = (
            kelurahan_match.iloc[0].get("kelurahan")
            or kelurahan_match.iloc[0].get("nama")
            or kelurahan_match.iloc[0].get("name")
            if not kelurahan_match.empty
            else None
        )
        nearest_existing_m = dist_to_nearest_halte.get(best_node)

        picked.append(
            {
                "rank": rank,
                "node": best_node,
                "point": point,
                "kelurahan": kelurahan_name,
                "population_gained": round(best_gain),
                "nearest_existing_halte_m": round(nearest_existing_m) if nearest_existing_m is not None else None,
            }
        )
        print(f"  #{rank}: node {best_node} in {kelurahan_name} -- +{best_gain:,.0f} population newly covered")

    features = []
    cumulative = already_served
    for pick in picked:
        cumulative += pick["population_gained"]
        features.append(
            {
                "type": "Feature",
                "properties": {
                    "rank": pick["rank"],
                    "kelurahan": pick["kelurahan"],
                    "population_gained": pick["population_gained"],
                    "nearest_existing_halte_m": pick["nearest_existing_halte_m"],
                    "cumulative_population_served": round(cumulative),
                    "cumulative_coverage_pct": round(100 * cumulative / total_demand, 1),
                },
                "geometry": mapping(pick["point"]),
            }
        )

    collection = {
        "type": "FeatureCollection",
        "properties": {
            "method": "greedy_maximal_covering_location_problem",
            "served_threshold_minutes": SERVED_THRESHOLD_MIN,
            "total_demand_population": round(total_demand),
            "already_served_population": round(already_served),
        },
        "features": features,
    }

    for out_path in OUT_PATHS:
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(json.dumps(collection), encoding="utf-8")
        print(f"Wrote {out_path}")


if __name__ == "__main__":
    main()
