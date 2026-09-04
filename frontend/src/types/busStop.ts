export interface BusStopProperties {
  stop_id: string;
  kelurahan: string;
}

export interface BusStopFeature {
  type: "Feature";
  geometry: {
    type: "Point";
    coordinates: [number, number];
  };
  properties: BusStopProperties;
}

export interface BusStopFeatureCollection {
  type: "FeatureCollection";
  properties: {
    source: string;
    total_stops: number;
  };
  features: BusStopFeature[];
}
