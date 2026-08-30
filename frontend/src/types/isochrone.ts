export interface IsochroneBandProperties {
  minutes: 5 | 10 | 15;
  halte_count: number;
  area_km2: number;
}

export interface IsochroneBandFeature {
  type: "Feature";
  geometry: {
    type: "Polygon" | "MultiPolygon";
    coordinates: number[][][] | number[][][][];
  };
  properties: IsochroneBandProperties;
}

export interface IsochroneFeatureCollection {
  type: "FeatureCollection";
  features: IsochroneBandFeature[];
}
