import type { CitizenReport, CitizenReportCreateInput } from "@/types/citizenReport";
import { uploadStatusMessage } from "@/lib/uploadError";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

/**
 * Real citizen-submitted reports -- see backend/app/routers/citizen_report.py.
 * No static-file fallback: submitting (and listing what's been submitted) is
 * inherently live, mutable data, not something precomputable.
 */
function requireApiBase(): string {
  if (!API_BASE_URL) {
    throw new Error(
      "Fitur laporan butuh backend lokal aktif. Set NEXT_PUBLIC_API_BASE_URL di frontend/.env.local, lalu jalankan `uvicorn app.main:app` di backend.",
    );
  }
  return API_BASE_URL;
}

/**
 * @param opts.signal lets the caller bound how long the upload may take -- see
 *   UPLOAD_TIMEOUT_MS. Without it a request that will never finish leaves the
 *   form spinning forever with nothing to show the person.
 */
export async function createCitizenReport(
  input: CitizenReportCreateInput,
  opts: { signal?: AbortSignal } = {},
): Promise<CitizenReport> {
  const formData = new FormData();
  formData.append("lat", String(input.lat));
  formData.append("lon", String(input.lon));
  formData.append("halte_id", input.halteId);
  formData.append("reporter_name", input.reporterName);
  formData.append("description", input.description);
  if (input.photos?.length) {
    // One repeated part per file, all named "photos" -- the backend reads them
    // as a list (see the `photos` parameter in routers/citizen_report.py).
    input.photos.forEach((file) => formData.append("photos", file));
  }
  if (input.video) formData.append("video", input.video);

  const res = await fetch(`${requireApiBase()}/api/v1/citizen-reports`, {
    method: "POST",
    body: formData,
    signal: opts.signal,
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { detail?: string } | null;
    throw new Error(
      body?.detail ?? uploadStatusMessage(res.status) ?? `Backend merespons status ${res.status}`,
    );
  }

  return (await res.json()) as CitizenReport;
}

export async function fetchCitizenReportsByHalte(halteId: string): Promise<CitizenReport[]> {
  const res = await fetch(`${requireApiBase()}/api/v1/citizen-reports?halte_id=${encodeURIComponent(halteId)}`);
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { detail?: string } | null;
    throw new Error(body?.detail ?? `Backend merespons status ${res.status}`);
  }
  return (await res.json()) as CitizenReport[];
}

/**
 * Every citizen report across all halte, unfiltered -- used by the dashboard
 * map (BusStopLayer) to mark which halte have an unactioned ("baru") report,
 * so a dispatcher sees it on the map itself rather than having to open every
 * halte's detail panel to check.
 */
export async function fetchAllCitizenReports(): Promise<CitizenReport[]> {
  const res = await fetch(`${requireApiBase()}/api/v1/citizen-reports`);
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { detail?: string } | null;
    throw new Error(body?.detail ?? `Backend merespons status ${res.status}`);
  }
  return (await res.json()) as CitizenReport[];
}
