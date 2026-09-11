/** Types for the BRT Trans Semarang reference layer (backend/app/routers/brt.py). */

export interface BrtHalteProperties {
  halte_id: string;
  no: number | null;
  nama_halte: string;
  /** Local name the corridor is known by, e.g. "Terminal Penggaron". */
  alias: string | null;
  /** "Permanen" | "Portable" | stray values ("-", "Garasi") in the source. */
  jenis_shel: string | null;
}

export interface BrtRuteProperties {
  rute_id: number;
  /** Short corridor tag: "1".."8", "1M", "F1A".."F4B". */
  koridor: string | null;
  /** Full direction name, e.g. "Rute Koridor 5 Menuju Meteseh". */
  rute: string;
  length_km: number | null;
}

export interface BrtHalteFeature {
  type: "Feature";
  geometry: { type: "Point"; coordinates: [number, number] };
  properties: BrtHalteProperties;
}

export interface BrtRuteFeature {
  type: "Feature";
  geometry: { type: "LineString"; coordinates: [number, number][] };
  properties: BrtRuteProperties;
}

export interface BrtNetwork {
  halte: BrtHalteFeature[];
  rute: BrtRuteFeature[];
}
