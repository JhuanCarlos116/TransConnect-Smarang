import type { StyleSpecification } from "maplibre-gl";

export const MAPID_API_KEY = process.env.NEXT_PUBLIC_MAPID_API_KEY ?? "";

// Centered roughly on Kecamatan Tembalang, Semarang.
export const DEFAULT_CENTER: [number, number] = [110.4381, -7.0537];
export const DEFAULT_ZOOM = 13;

export function mapStyleUrl(): string | StyleSpecification {
  if (MAPID_API_KEY) {
    return `https://v2.basemap.mapid.io/styles/street-v2.0/style.json?key=${MAPID_API_KEY}`;
  }
  // Clean fallback OpenStreetMap basemap style
  return {
    version: 8,
    sources: {
      "osm-tiles": {
        type: "raster",
        tiles: [
          "https://a.tile.openstreetmap.org/{z}/{x}/{y}.png",
          "https://b.tile.openstreetmap.org/{z}/{x}/{y}.png",
          "https://c.tile.openstreetmap.org/{z}/{x}/{y}.png",
        ],
        tileSize: 256,
        attribution: "&copy; OpenStreetMap contributors",
      },
    },
    layers: [
      {
        id: "osm-tiles-layer",
        type: "raster",
        source: "osm-tiles",
        minzoom: 0,
        maxzoom: 19,
      },
    ],
  };
}
