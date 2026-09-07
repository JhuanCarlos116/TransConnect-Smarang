export interface KelurahanPopulationProperties {
  kelurahan: string;
  jumlah_penduduk: number;
  laju_pertumbuhan_persen_2010_2020: number | null;
  luas_km2: number;
  kepadatan_per_km2: number;
  // Count of the 42 surveyed halte that fall inside this kelurahan -- see
  // backend/scripts/add_survey_coverage_to_population.py. Tandang is 0: a
  // real field-coverage gap, not a bug.
  halte_survey_count: number;
}

export interface KelurahanPopulationFeature {
  type: "Feature";
  geometry: {
    type: "Polygon" | "MultiPolygon";
    coordinates: number[][][] | number[][][][];
  };
  properties: KelurahanPopulationProperties;
}

export interface KelurahanPopulationFeatureCollection {
  type: "FeatureCollection";
  features: KelurahanPopulationFeature[];
}
