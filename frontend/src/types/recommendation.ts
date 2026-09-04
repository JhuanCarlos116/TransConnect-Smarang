export interface HalteRecommendationProperties {
  rank: number;
  kelurahan: string | null;
  population_gained: number;
  nearest_existing_halte_m: number | null;
  cumulative_population_served: number;
  cumulative_coverage_pct: number;
}

export interface HalteRecommendationFeature {
  type: "Feature";
  geometry: {
    type: "Point";
    coordinates: [number, number];
  };
  properties: HalteRecommendationProperties;
}

export interface HalteRecommendationFeatureCollection {
  type: "FeatureCollection";
  properties: {
    method: string;
    served_threshold_minutes: number;
    total_demand_population: number;
    already_served_population: number;
  };
  features: HalteRecommendationFeature[];
}
