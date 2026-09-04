export interface ChatMessage {
  role: "user" | "assistant";
  text: string;
}

export interface ChatRecommendation {
  rank: number;
  kelurahan: string | null;
  population_gained: number;
  nearest_existing_halte_m: number | null;
  cumulative_population_served: number;
  cumulative_coverage_pct: number;
  coordinates: [number, number];
}

export interface ChatApiResponse {
  reply: string;
  recommendations: ChatRecommendation[];
}
