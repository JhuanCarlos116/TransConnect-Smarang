import type { ConditionLabel } from "@/types/halte";

export type VerificationStatus = "verified" | "pending";

export interface CommunityReportProperties {
  report_id: string;
  judul: string;
  deskripsi: string;
  kelurahan: string;
  photo_url: string | null;
  pelapor: string;
  tanggal_lapor: string | null;
  verification_status: VerificationStatus;
  verified_by: string | null;
  // Carried over from the survey these sample reports are derived from --
  // on the DISHUB dashboard this layer owns the condition legend, since the
  // halte layer there shows the unassessed bus stop inventory instead.
  condition_score: number | null;
  condition_label: ConditionLabel | null;
  // Set when a bus stop inventory point (see BusStopProperties) sits within
  // 50m of this report -- see backend/scripts/match_survey_to_bus_stops.py.
  // Most reports have no match: the two datasets mostly describe different
  // physical halte, not duplicates.
  matched_stop_id: string | null;
  match_distance_m: number | null;
}

export interface CommunityReportFeature {
  type: "Feature";
  geometry: {
    type: "Point";
    coordinates: [number, number];
  };
  properties: CommunityReportProperties;
}

export interface CommunityReportFeatureCollection {
  type: "FeatureCollection";
  features: CommunityReportFeature[];
}
