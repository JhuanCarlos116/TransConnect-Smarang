import type { IsochroneFeatureCollection } from "@/types/isochrone";

const STATIC_URL = "/data/halte_isochrones.geojson";

/**
 * 5/10/15-min walking catchment bands around the 42 surveyed halte — see
 * backend/scripts/build_isochrones.py. Static-only, same as
 * fetchPopulationData: re-run the script and redeploy if the halte survey
 * or pedestrian network changes.
 */
export async function fetchIsochrones(): Promise<IsochroneFeatureCollection> {
  const res = await fetch(STATIC_URL);
  return (await res.json()) as IsochroneFeatureCollection;
}
