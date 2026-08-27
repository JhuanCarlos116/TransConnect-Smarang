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
