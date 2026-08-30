import type { HalteFeatureCollection } from "@/types/halte";

// Only attempted when a base URL is actually configured. This used to
// default to http://localhost:8000, which is right for local dev but wrong
// once deployed: the browser of every visitor to an HTTPS site would try
// (and be blocked from) reaching its own machine's port 8000 before the
// fallback kicked in. Unset means "static deployment, no FastAPI".
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const STATIC_FALLBACK_URL = "/data/halte-survey.geojson";

/**
 * Tries the FastAPI backend first; falls back to the static GeoJSON file
 * (frontend/public/data/halte-survey.geojson) if the backend is unreachable.
 * This lets frontend work continue without PostGIS/FastAPI running.
 */
export async function fetchHalteData(): Promise<HalteFeatureCollection> {
  if (API_BASE_URL) {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/halte-survey`);
      if (!res.ok) throw new Error(`API responded with ${res.status}`);
      return (await res.json()) as HalteFeatureCollection;
    } catch (err) {
      console.warn("Backend API unavailable, falling back to static GeoJSON:", err);
    }
  }

  const res = await fetch(STATIC_FALLBACK_URL);
  return (await res.json()) as HalteFeatureCollection;
}
