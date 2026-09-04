import type { HalteRecommendationFeatureCollection } from "@/types/recommendation";

const STATIC_URL = "/data/halte_recommendations.geojson";

/**
 * New-halte recommendations from the Location Allocation Model (greedy
 * Maximal Covering Location Problem) -- see
 * backend/scripts/build_location_allocation.py. Static-only, same as
 * fetchPopulationData: re-run the script and redeploy when the halte survey
 * or population figures change.
 */
export async function fetchHalteRecommendations(): Promise<HalteRecommendationFeatureCollection> {
  const res = await fetch(STATIC_URL);
  return (await res.json()) as HalteRecommendationFeatureCollection;
}
