import type { HalteFeatureCollection } from "@/types/halte";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
const STATIC_FALLBACK_URL = "/data/halte-survey.geojson";

/**
 * Tries the FastAPI backend first; falls back to the static GeoJSON file
 * (frontend/public/data/halte-survey.geojson) if the backend is unreachable.
 * This lets frontend work continue without PostGIS/FastAPI running.
 */
export async function fetchHalteData(): Promise<HalteFeatureCollection> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/halte-survey`);
    if (!res.ok) throw new Error(`API responded with ${res.status}`);
    return (await res.json()) as HalteFeatureCollection;
  } catch (err) {
    console.warn("Backend API unavailable, falling back to static GeoJSON:", err);
    const res = await fetch(STATIC_FALLBACK_URL);
    return (await res.json()) as HalteFeatureCollection;
  }
}
