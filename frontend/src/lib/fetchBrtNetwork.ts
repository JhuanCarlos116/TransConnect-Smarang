import type { BrtHalteFeature, BrtNetwork, BrtRuteFeature } from "@/types/brt";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

/**
 * BRT Trans Semarang network (673 halte + 34 corridor lines) served by
 * backend/app/routers/brt.py from the `trans_semarang` schema in PostGIS.
 *
 * Unlike fetchHalteData there is no static fallback file: this layer is
 * extra context around the team's own 42-point survey, so if the endpoints
 * can't be reached the map should simply draw nothing rather than fail the
 * page. Callers get an empty network, not an exception.
 */
export async function fetchBrtNetwork(): Promise<BrtNetwork> {
  const empty: BrtNetwork = { halte: [], rute: [] };
  if (!API_BASE_URL) return empty;

  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/brt-network`);
    if (!res.ok) throw new Error(`API responded with ${res.status}`);
    const data = (await res.json()) as {
      type: "FeatureCollection";
      features: (BrtHalteFeature | BrtRuteFeature)[];
    };
    const features = data.features ?? [];
    return {
      halte: features.filter((f): f is BrtHalteFeature => f.geometry?.type === "Point"),
      rute: features.filter((f): f is BrtRuteFeature => f.geometry?.type === "LineString"),
    };
  } catch (err) {
    console.warn("BRT network layer unavailable, drawing nothing:", err);
    return empty;
  }
}
