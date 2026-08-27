export type ConditionLabel = "green" | "yellow" | "red";

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

  photo_url: string | null;
  survey_date: string | null;
  catatan_lapangan: string | null;

  condition_score: number;
  condition_label: ConditionLabel;
}

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
