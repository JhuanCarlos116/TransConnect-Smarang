import type { KelurahanPopulationFeatureCollection } from "@/types/population";

const STATIC_URL = "/data/kelurahan_population.geojson";

/**
 * Population/density per kelurahan — see backend/scripts/build_population_layer.py.
 * Static-only for now, same as fetchCommunityReports: nothing backend-dynamic
 * about this yet (re-run the script and redeploy when the BPS table updates).
 */
export async function fetchPopulationData(): Promise<KelurahanPopulationFeatureCollection> {
  const res = await fetch(STATIC_URL);
  return (await res.json()) as KelurahanPopulationFeatureCollection;
}
