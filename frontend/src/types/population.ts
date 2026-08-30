export interface KelurahanPopulationProperties {
  kelurahan: string;
  jumlah_penduduk: number;
  laju_pertumbuhan_persen_2010_2020: number | null;
  luas_km2: number;
  kepadatan_per_km2: number;
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
