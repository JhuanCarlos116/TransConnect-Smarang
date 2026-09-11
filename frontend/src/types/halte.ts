export type ConditionLabel = "green" | "yellow" | "red";

export interface HalteMediaItem {
  url: string;
  type: "photo" | "video";
}

export interface HalteProperties {
  halte_id: string;
  nama_halte: string;
  kelurahan: string;
  kecamatan: string;

  cctv: "ada" | "tidak" | "-";
  lighting: "ada" | "tidak" | "-";
  sidewalk_condition: "ada" | "tidak" | "-";
  route_info_signage: "ada" | "tidak" | "-";
  canopy: "ada" | "tidak" | "-";

  // Photos and (18 of 42 points) one video, in original upload order.
  media: HalteMediaItem[];
  survey_date: string | null;
  catatan_lapangan: string | null;

  condition_score: number;
  condition_label: ConditionLabel;

  // Per-variable provenance: "ai" = the photo detector filled this in,
  // "manual" = a DISHUB admin corrected it. Absent = the field survey's own
  // reading. Drives the small badges next to each facility row, so a
  // dispatcher can tell at a glance which values were machine-written and
  // therefore worth double-checking.
  facility_sources: Partial<Record<FacilityVariable, FacilitySource>>;
}

export type FacilityVariable = "sidewalk_condition" | "lighting" | "cctv" | "route_info_signage" | "canopy";
export type FacilitySource = "ai" | "manual";
export type FacilityState = "ada" | "tidak" | "-";

export interface HalteFeature {
  type: "Feature";
  geometry: {
    type: "Point";
    coordinates: [number, number];
  };
  properties: HalteProperties;
}

export interface HalteFeatureCollection {
  type: "FeatureCollection";
  features: HalteFeature[];
}
