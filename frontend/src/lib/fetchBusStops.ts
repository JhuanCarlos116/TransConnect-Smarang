import type { BusStopFeatureCollection } from "@/types/busStop";

const STATIC_URL = "/data/bus_stops.geojson";

/**
 * Full halte/bus stop inventory for the 9 kelurahan -- see
 * backend/scripts/build_bus_stops.py. Static-only: this is a fixed
 * infrastructure inventory, not something the backend computes.
 */
export async function fetchBusStops(): Promise<BusStopFeatureCollection> {
  const res = await fetch(STATIC_URL);
  return (await res.json()) as BusStopFeatureCollection;
}
