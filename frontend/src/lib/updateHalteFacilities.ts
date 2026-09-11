import type { FacilityState, FacilityVariable, HalteFeature } from "@/types/halte";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

/**
 * Manual correction of a halte's facility availability by DISHUB -- see
 * PATCH /halte-survey/{id}/facilities in backend/app/routers/halte.py.
 *
 * This exists because the photo detector is not trustworthy enough to be the
 * last word: it can only ever prove PRESENCE (a missing class means "not in
 * frame", not "absent"), and the two variables it reads worst -- `lighting`
 * and `route_info_signage` -- are exactly the ones most often left unknown by
 * the field survey. So a human overrule is a first-class action, not an
 * escape hatch, and the backend records every value written this way as
 * "manual" so the dashboard can show it.
 *
 * Returns the whole updated feature, so the caller can drop it straight into
 * the map's state instead of refetching all 42 points.
 */
export async function updateHalteFacilities(
  halteId: string,
  changes: Partial<Record<FacilityVariable, FacilityState>>,
): Promise<HalteFeature> {
  if (!API_BASE_URL) {
    throw new Error(
      "Koreksi fasilitas butuh backend aktif. Set NEXT_PUBLIC_API_BASE_URL di frontend/.env.local, lalu jalankan `uvicorn app.main:app` di backend.",
    );
  }

  const res = await fetch(`${API_BASE_URL}/api/v1/halte-survey/${encodeURIComponent(halteId)}/facilities`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(changes),
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { detail?: string } | null;
    throw new Error(body?.detail ?? `Backend merespons status ${res.status}`);
  }
  return (await res.json()) as HalteFeature;
}
