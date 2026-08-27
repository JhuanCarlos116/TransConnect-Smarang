import type { CommunityReportFeatureCollection } from "@/types/communityReport";

const STATIC_URL = "/data/community-reports.geojson";

/**
 * Community Maps ("laporan warga") data is placeholder for this demo — see
 * backend/scripts/build_community_reports.py. There's no backend endpoint
 * for it yet (no real citizen submissions to serve), so this only reads the
 * static file, unlike fetchHalteData's backend-first strategy.
 */
export async function fetchCommunityReports(): Promise<CommunityReportFeatureCollection> {
  const res = await fetch(STATIC_URL);
  return (await res.json()) as CommunityReportFeatureCollection;
}
