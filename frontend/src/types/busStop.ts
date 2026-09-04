export interface BusStopProperties {
  stop_id: string;
  kelurahan: string;
  // Set when a community report (see CommunityReportProperties) sits within
  // 50m of this stop -- see backend/scripts/match_survey_to_bus_stops.py.
  // Most stops have no match: the two datasets mostly describe different
  // physical halte, not duplicates.
  surveyed_report_id: string | null;
  match_distance_m: number | null;
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
