"""Safe Transit Navigator (PRD roadmap item, after Weighted Overlay & AHP).

Definition of "safe" used here, and why: our only condition data is
per-halte-point (condition_score from the field survey), not per street
segment -- so a segment-level "avoid unlit streets" routing cost is not
something we can honestly compute (the same limitation build_isochrones.py
and build_location_allocation.py already document for the same reason).
Rather than invent a distance/safety weighted-sum with an arbitrary
trade-off between meters and condition points, this asks one explicit
question instead: among the surveyed halte a pedestrian could realistically
reach within WALK_BUDGET_MIN minutes of walking, which one has the best
condition score? The route itself is still the plain shortest walking path --
it is the *destination* that gets chosen for safety, not the path taken to
reach it.

The nearest halte overall is always returned too (even if outside the
budget, even if its condition is worse), so a citizen can see both and judge
the trade-off themselves rather than trust one silent "best" answer.
"""

import networkx as nx
import osmnx as ox
from fastapi import APIRouter, Depends, HTTPException
from geoalchemy2.shape import to_shape
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_session
from app.models.halte import HalteSurvey
from app.schemas.route import RouteOption, RouteRequest, SafeHalteRouteResponse
from app.services.pedestrian_graph import get_graph

router = APIRouter()

WALK_SPEED_M_PER_MIN = 83.3  # ~5 km/h -- same constant as build_isochrones.py / build_location_allocation.py
WALK_BUDGET_MIN = 15  # wider than the isochrones' 5-min "already served" cutoff: this is
# "how far would someone reasonably walk for a meaningfully safer halte", not "is one nearby at all"
WALK_BUDGET_M = WALK_BUDGET_MIN * WALK_SPEED_M_PER_MIN


def _route_geojson(graph: nx.MultiGraph, node_path: list[int]) -> dict:
    coords = [[graph.nodes[n]["x"], graph.nodes[n]["y"]] for n in node_path]
    return {"type": "LineString", "coordinates": coords}


def _to_option(graph: nx.MultiGraph, user_node: int, row: HalteSurvey, halte_node: int, distance_m: float) -> RouteOption:
    path = nx.shortest_path(graph, user_node, halte_node, weight="length")
    return RouteOption(
        halte_id=row.halte_id,
        nama_halte=row.nama_halte,
        kelurahan=row.kelurahan,
        condition_score=row.condition_score,
        condition_label=row.condition_label,
        distance_m=round(distance_m, 1),
        walk_minutes=round(distance_m / WALK_SPEED_M_PER_MIN, 1),
        route=_route_geojson(graph, path),
    )


@router.post("/route/safe-halte", response_model=SafeHalteRouteResponse)
async def safe_halte_route(
    body: RouteRequest, session: AsyncSession = Depends(get_session)
) -> SafeHalteRouteResponse:
    graph = get_graph()

    result = await session.execute(select(HalteSurvey))
    halte_rows = list(result.scalars().all())
    if not halte_rows:
        raise HTTPException(status_code=503, detail="Belum ada data halte tersurvei.")

    user_node = ox.distance.nearest_nodes(graph, X=body.lon, Y=body.lat)

    # Reachability + network distance to every node in one Dijkstra run from
    # the user's snapped position, instead of one shortest-path-length call
    # per halte -- same graph, so this is strictly less work.
    lengths = nx.single_source_dijkstra_path_length(graph, user_node, weight="length")

    # Batched, like build_isochrones.py's nearest_nodes call for all 42 halte
    # at once -- 42 individual nearest_nodes calls would each redo the same
    # KDTree lookup setup osmnx does internally.
    xs = [to_shape(row.geom).x for row in halte_rows]
    ys = [to_shape(row.geom).y for row in halte_rows]
    halte_nodes = ox.distance.nearest_nodes(graph, X=xs, Y=ys)

    candidates: list[tuple[HalteSurvey, int, float]] = []
    for row, node in zip(halte_rows, halte_nodes):
        distance_m = lengths.get(node)
        if distance_m is None:
            continue  # not reachable on this network component from the user's point
        candidates.append((row, node, distance_m))

    if not candidates:
        raise HTTPException(
            status_code=404,
            detail="Tidak ada halte tersurvei yang bisa dijangkau lewat jaringan jalan dari titik ini.",
        )

    nearest_row, nearest_node, nearest_dist = min(candidates, key=lambda c: c[2])

    within_budget = [c for c in candidates if c[2] <= WALK_BUDGET_M]
    if within_budget:
        # Best condition_score wins; nearest distance breaks a tie.
        best_row, best_node, best_dist = max(within_budget, key=lambda c: (c[0].condition_score, -c[2]))
    else:
        best_row, best_node, best_dist = nearest_row, nearest_node, nearest_dist

    recommended = _to_option(graph, user_node, best_row, best_node, best_dist)
    nearest = (
        None
        if best_row.halte_id == nearest_row.halte_id
        else _to_option(graph, user_node, nearest_row, nearest_node, nearest_dist)
    )

    return SafeHalteRouteResponse(
        recommended=recommended,
        nearest=nearest,
        budget_minutes=WALK_BUDGET_MIN,
        within_budget_count=len(within_budget),
    )
