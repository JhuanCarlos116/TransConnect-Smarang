import type { SafeHalteRouteResponse } from "@/types/safeRoute";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

/**
 * Safe Transit Navigator -- see backend/app/routers/route.py. Like the chat
 * endpoint, there is no static-file fallback: computing a route needs the
 * live pedestrian graph the FastAPI backend keeps in memory, not something
 * that can be precomputed into a static file for an arbitrary starting point.
 */
export async function fetchSafeRoute(lat: number, lon: number): Promise<SafeHalteRouteResponse> {
  if (!API_BASE_URL) {
    throw new Error(
      "Fitur navigasi butuh backend lokal aktif. Set NEXT_PUBLIC_API_BASE_URL di frontend/.env.local, lalu jalankan `uvicorn app.main:app` di backend.",
    );
  }

  const res = await fetch(`${API_BASE_URL}/api/v1/route/safe-halte`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lat, lon }),
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { detail?: string } | null;
    throw new Error(body?.detail ?? `Backend merespons status ${res.status}`);
  }

  return (await res.json()) as SafeHalteRouteResponse;
}
