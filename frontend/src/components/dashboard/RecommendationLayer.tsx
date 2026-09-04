"use client";

import { useEffect, useRef } from "react";
import * as maplibregl from "maplibre-gl";

import { fetchHalteRecommendations } from "@/lib/fetchHalteRecommendations";
import type { HalteRecommendationFeatureCollection } from "@/types/recommendation";

const SOURCE_ID = "halte-recommendations";
export const RECOMMENDATION_POINT_LAYER_ID = "halte-recommendations-points";
const LABEL_LAYER_ID = "halte-recommendations-labels";

interface RecommendationLayerProps {
  map: maplibregl.Map;
  visible: boolean;
}

/**
 * New-halte recommendations from the Location Allocation Model. Styled
 * distinctly from the real surveyed halte (amber diamond + rank number,
 * dashed white outline) -- these are proposed, unbuilt locations, not
 * infrastructure that exists yet, and should never be visually confused
 * with the green/yellow/red condition-scored survey points.
 */
export default function RecommendationLayer({ map, visible }: RecommendationLayerProps) {
  const loadedRef = useRef(false);
  const visibleRef = useRef(visible);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;

    fetchHalteRecommendations().then((data: HalteRecommendationFeatureCollection) => {
      const initialVisibility = visibleRef.current ? "visible" : "none";

      map.addSource(SOURCE_ID, { type: "geojson", data: data as never });

      map.addLayer({
        id: RECOMMENDATION_POINT_LAYER_ID,
        type: "circle",
        source: SOURCE_ID,
        layout: { visibility: initialVisibility },
        paint: {
          "circle-radius": 10,
          "circle-color": "#f59e0b",
          "circle-stroke-width": 2,
          "circle-stroke-color": "#fff",
        },
      });

      map.addLayer({
        id: LABEL_LAYER_ID,
        type: "symbol",
        source: SOURCE_ID,
        layout: {
          visibility: initialVisibility,
          "text-field": ["get", "rank"],
          "text-size": 11,
        },
        paint: {
          "text-color": "#fff",
        },
      });

      map.on("mouseenter", RECOMMENDATION_POINT_LAYER_ID, () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", RECOMMENDATION_POINT_LAYER_ID, () => {
        map.getCanvas().style.cursor = "";
      });

      map.on("click", RECOMMENDATION_POINT_LAYER_ID, (e: maplibregl.MapLayerMouseEvent) => {
        const feature = e.features?.[0];
        if (!feature || feature.geometry.type !== "Point") return;
        const p = feature.properties as Record<string, number | string | null>;
        const coordinates = feature.geometry.coordinates.slice() as [number, number];

        const nearestText = p.nearest_existing_halte_m != null ? `${p.nearest_existing_halte_m} m` : "-";

        const container = document.createElement("div");
        // Explicit dark colors -- raw HTML, outside Tailwind's reach, otherwise
        // falls back to MapLibre's low-contrast popup default (same fix as the
        // other raw-HTML popups in this app). Close button styled the same way
        // as MapInfoPopup's and HalteDetailModal's, instead of MapLibre's
        // plain default "x", via closeButton: false below.
        container.innerHTML =
          `<div style="font-family:system-ui,sans-serif;font-size:13px;min-width:200px;color:var(--color-on-surface)">` +
          `<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px">` +
          `<div style="font-weight:700;font-size:15px;color:var(--color-on-surface)">Rekomendasi Halte Baru #${p.rank}</div>` +
          `<button data-close aria-label="Tutup" class="text-alert-red hover:text-on-error border border-alert-red rounded-lg p-1 hover:bg-alert-red transition-colors cursor-pointer" style="display:flex;align-items:center">` +
          `<span class="material-symbols-outlined" style="font-size:16px">close</span></button></div>` +
          `<div style="margin-bottom:2px"><span style="color:var(--color-on-surface-variant)">Kelurahan:</span> <b>${p.kelurahan ?? "-"}</b></div>` +
          `<div style="margin-bottom:2px"><span style="color:var(--color-on-surface-variant)">Estimasi penduduk baru terlayani:</span> <b>${Number(p.population_gained).toLocaleString("id-ID")} jiwa</b></div>` +
          `<div style="margin-bottom:2px"><span style="color:var(--color-on-surface-variant)">Jarak ke halte existing terdekat:</span> <b>${nearestText}</b></div>` +
          `<div style="margin-bottom:6px"><span style="color:var(--color-on-surface-variant)">Kontribusi kumulatif:</span> <b>${p.cumulative_coverage_pct}% penduduk Tembalang terlayani</b></div>` +
          `<div style="font-size:11px;color:var(--color-on-surface-variant);border-top:1px solid #e5e7eb;padding-top:6px">Hasil algoritma Location Allocation Model (Maximal Coverage) dari data kepadatan penduduk + jaringan pejalan kaki -- bukan lokasi final, perlu verifikasi lapangan.</div>` +
          `</div>`;

        const popup = new maplibregl.Popup({ offset: 10, closeButton: false })
          .setLngLat(coordinates)
          .setDOMContent(container)
          .addTo(map);
        container.querySelector("[data-close]")?.addEventListener("click", () => popup.remove());
      });
    });
  }, [map]);

  useEffect(() => {
    visibleRef.current = visible;
    if (!map.getLayer(RECOMMENDATION_POINT_LAYER_ID)) return;
    const visibility = visible ? "visible" : "none";
    map.setLayoutProperty(RECOMMENDATION_POINT_LAYER_ID, "visibility", visibility);
    map.setLayoutProperty(LABEL_LAYER_ID, "visibility", visibility);
  }, [map, visible]);

  return null;
}
