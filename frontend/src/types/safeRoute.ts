import type { ConditionLabel } from "@/types/halte";

export interface RouteOption {
  halte_id: string;
  nama_halte: string;
  kelurahan: string;
  condition_score: number;
  condition_label: ConditionLabel;
  distance_m: number;
  walk_minutes: number;
  // GeoJSON LineString
  route: {
    type: "LineString";
    coordinates: [number, number][];
  };
}

export interface SafeHalteRouteResponse {
  recommended: RouteOption;
  // Present only when the nearest halte differs from the recommended one.
  nearest: RouteOption | null;
  budget_minutes: number;
  within_budget_count: number;
}
