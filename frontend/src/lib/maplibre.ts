export const MAPID_API_KEY = process.env.NEXT_PUBLIC_MAPID_API_KEY ?? "";

// Centered roughly on Kecamatan Tembalang, Semarang.
export const DEFAULT_CENTER: [number, number] = [110.4381, -7.0537];
export const DEFAULT_ZOOM = 13;

export function mapStyleUrl(): string {
  return `https://v2.basemap.mapid.io/styles/street-v2.0/style.json?key=${MAPID_API_KEY}`;
}
