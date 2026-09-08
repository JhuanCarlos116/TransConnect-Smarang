import type { RouteOption, SafeHalteRouteResponse } from "@/types/safeRoute";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

function requireApiBase(): string {
  if (!API_BASE_URL) {
    throw new Error(
      "Fitur navigasi butuh backend lokal aktif. Set NEXT_PUBLIC_API_BASE_URL di frontend/.env.local, lalu jalankan `uvicorn app.main:app` di backend.",
    );
  }
  return API_BASE_URL;
}

async function parseOrThrow<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { detail?: string } | null;
    throw new Error(body?.detail ?? `Backend merespons status ${res.status}`);
  }
  return (await res.json()) as T;
}

/**
 * Safe Transit Navigator -- see backend/app/routers/route.py. Like the chat
 * endpoint, there is no static-file fallback: computing a route needs the
 * live pedestrian graph the FastAPI backend keeps in memory, not something
 * that can be precomputed into a static file for an arbitrary starting point.
 */
export async function fetchSafeRoute(lat: number, lon: number): Promise<SafeHalteRouteResponse> {
  const res = await fetch(`${requireApiBase()}/api/v1/route/safe-halte`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lat, lon }),
  });
  return parseOrThrow<SafeHalteRouteResponse>(res);
}

/** Walking directions to one specific halte -- see POST /route/to-halte. */
export async function fetchRouteToHalte(lat: number, lon: number, halteId: string): Promise<RouteOption> {
  const res = await fetch(`${requireApiBase()}/api/v1/route/to-halte`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lat, lon, halte_id: halteId }),
  });
  return parseOrThrow<RouteOption>(res);
}
