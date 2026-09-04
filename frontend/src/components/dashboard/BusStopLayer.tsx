"use client";

import { useEffect, useRef } from "react";
import * as maplibregl from "maplibre-gl";

import { fetchBusStops } from "@/lib/fetchBusStops";
import type { BusStopFeatureCollection, BusStopProperties } from "@/types/busStop";

const SOURCE_ID = "bus-stops";
export const BUS_STOP_POINT_LAYER_ID = "bus-stops-points";

interface BusStopLayerProps {
  map: maplibregl.Map;
  visible: boolean;
}

/**
 * The full halte/bus stop inventory for the 9 kelurahan (71 points), as
 * opposed to the 42 points the team actually surveyed -- those live on the
 * "Laporan Warga" layer on this dashboard.
 *
 * Deliberately one flat neutral color: these points carry no condition data
 * (the source export has no properties at all beyond coordinates), so
 * coloring them on the green/yellow/red condition scale would imply an
 * assessment that does not exist for them.
 */
export default function BusStopLayer({ map, visible }: BusStopLayerProps) {
  const loadedRef = useRef(false);
  const visibleRef = useRef(visible);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;

    fetchBusStops().then((data: BusStopFeatureCollection) => {
      const initialVisibility = visibleRef.current ? "visible" : "none";

      map.addSource(SOURCE_ID, { type: "geojson", data: data as never });

      map.addLayer({
        id: BUS_STOP_POINT_LAYER_ID,
        type: "circle",
        source: SOURCE_ID,
        layout: { visibility: initialVisibility },
        paint: {
          "circle-radius": 6,
          "circle-color": "#546e7a",
          "circle-stroke-width": 2,
          "circle-stroke-color": "#fff",
        },
      });

      map.on("mouseenter", BUS_STOP_POINT_LAYER_ID, () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", BUS_STOP_POINT_LAYER_ID, () => {
        map.getCanvas().style.cursor = "";
      });

      map.on("click", BUS_STOP_POINT_LAYER_ID, (e: maplibregl.MapLayerMouseEvent) => {
        const feature = e.features?.[0];
        if (!feature || feature.geometry.type !== "Point") return;
        const p = feature.properties as unknown as BusStopProperties;
        const coordinates = feature.geometry.coordinates.slice() as [number, number];

        // Most stops have no nearby report -- see match_survey_to_bus_stops.py.
        // Only ~13/71 land within 50m of one, so this is the exception, not
        // the rule, and it is a *possible* match, not a confirmed one (two
        // independently-captured GPS points, never the same measurement).
        const footerHtml = p.surveyed_report_id
          ? `Kemungkinan sudah disurvei (±${p.match_distance_m}m dari titik ini) — cek kondisinya di layer Laporan Warga.`
          : `Titik inventaris infrastruktur — belum disurvei kondisinya. Titik yang sudah disurvei ada di layer Laporan Warga.`;

        const container = document.createElement("div");
        container.innerHTML =
          `<div style="font-family:system-ui,sans-serif;font-size:13px;min-width:190px;color:var(--color-on-surface)">` +
          `<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px">` +
          `<div style="font-weight:700;font-size:15px;color:var(--color-on-surface)">Halte / Bus Stop</div>` +
          `<button data-close aria-label="Tutup" class="text-alert-red hover:text-on-error border border-alert-red rounded-lg p-1 hover:bg-alert-red transition-colors cursor-pointer" style="display:flex;align-items:center">` +
          `<span class="material-symbols-outlined" style="font-size:16px">close</span></button></div>` +
          `<div style="margin-bottom:2px"><span style="color:var(--color-on-surface-variant)">Kode:</span> <b>${p.stop_id}</b></div>` +
          `<div style="margin-bottom:6px"><span style="color:var(--color-on-surface-variant)">Kelurahan:</span> <b>${p.kelurahan}</b></div>` +
          `<div style="font-size:11px;color:var(--color-on-surface-variant);border-top:1px solid #e5e7eb;padding-top:6px">${footerHtml}</div>` +
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
    if (!map.getLayer(BUS_STOP_POINT_LAYER_ID)) return;
    map.setLayoutProperty(BUS_STOP_POINT_LAYER_ID, "visibility", visible ? "visible" : "none");
  }, [map, visible]);

  return null;
}
