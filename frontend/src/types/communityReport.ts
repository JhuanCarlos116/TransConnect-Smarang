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
