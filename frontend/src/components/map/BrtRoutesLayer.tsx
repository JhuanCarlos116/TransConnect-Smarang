"use client";

import { useEffect, useRef } from "react";
import * as maplibregl from "maplibre-gl";

import { HALTE_POINT_LAYER_ID } from "@/components/map/HalteLayer";
import { koridorColorExpression, koridorTags } from "@/lib/brtCorridorStyle";
import { fetchBrtNetwork } from "@/lib/fetchBrtNetwork";
import type { BrtRuteFeature } from "@/types/brt";

const SOURCE_ID = "brt-rute-public";
export const BRT_PUBLIC_RUTE_LAYER_ID = "brt-rute-public-lines";

/**
 * The existing BRT corridors as context on the PUBLIC map -- route lines only.
 *
 * Why only the lines, when the dashboard layer also draws 673 halte points:
 * this page's job is the team's own 42-point condition survey. The corridors
 * are context so a citizen (and the judges) can see which route a surveyed
 * halte actually sits on; the full BRT halte set would be visual competition
 * for the 42 markers that carry the actual assessment, and those already show
 * their condition through the green/yellow/red palette.
 *
 * Data comes from the same endpoint as the dashboard layer (/api/v1/brt-network,
 * backed by the trans_semarang schema in PostGIS) and the same corridor colours
 * (lib/brtCorridorStyle.ts) -- so the public map cannot disagree with the
 * dashboard about where a corridor runs or what colour it is.
 *
 * Two things are deliberately NOT here:
 *  - no toggle: the public page has no layer panel, and this is context, not a
 *    choice the citizen is asked to make
 *  - no error state: fetchBrtNetwork resolves to an empty network if the
 *    endpoint is unreachable, so the page draws the survey without corridors
 *    rather than failing to load
 */
export default function BrtRoutesLayer({ map }: { map: maplibregl.Map }) {
  const loadedRef = useRef(false);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;

    const popup = new maplibregl.Popup({
      closeButton: false,
      closeOnClick: false,
      offset: 10,
    });

    fetchBrtNetwork().then(({ rute }) => {
      if (rute.length === 0) return;

      map.addSource(SOURCE_ID, {
        type: "geojson",
        data: { type: "FeatureCollection", features: rute } as never,
      });

      map.addLayer({
        id: BRT_PUBLIC_RUTE_LAYER_ID,
        type: "line",
        source: SOURCE_ID,
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": koridorColorExpression(koridorTags(rute)) as never,
          // Thinner and softer than the dashboard's 1.2/2.6/4 at the same zooms:
          // here the corridors sit under 42 markers that must stay legible.
          "line-width": ["interpolate", ["linear"], ["zoom"], 10, 0.8, 14, 1.8, 17, 3] as never,
          "line-opacity": 0.55,
        },
      });

      // Corridors must render BENEATH the surveyed halte. Mount order can't
      // guarantee it (each layer adds itself when its own fetch resolves, and
      // MapLibre's stylesheet loader can also resolve out of order), so ask for
      // it explicitly. If the survey layer lands afterwards it appends on top
      // by itself, so this one check covers both orderings.
      if (map.getLayer(HALTE_POINT_LAYER_ID)) {
        map.moveLayer(BRT_PUBLIC_RUTE_LAYER_ID, HALTE_POINT_LAYER_ID);
      }

      const showPopup = (e: maplibregl.MapLayerMouseEvent) => {
        const clicked = e.features?.[0];
        if (!clicked) return;
        const p = clicked.properties as BrtRuteFeature["properties"] | undefined;
        if (!p) return;
        map.getCanvas().style.cursor = "pointer";
        const koridor = p.koridor ? `Koridor ${p.koridor} · ` : "";
        const km = typeof p.length_km === "number" ? `<br/><span style="opacity:.7">${p.length_km.toFixed(1)} km</span>` : "";
        popup
          .setLngLat(e.lngLat)
          .setHTML(
            `<div style="font-size:12px;line-height:1.35"><strong>${p.rute}</strong><br/>` +
              `<span style="opacity:.7">${koridor}Jaringan BRT Trans Semarang</span>${km}</div>`,
          )
          .addTo(map);
      };
      const hidePopup = () => {
        map.getCanvas().style.cursor = "";
        popup.remove();
      };
      map.on("mousemove", BRT_PUBLIC_RUTE_LAYER_ID, showPopup);
      map.on("mouseleave", BRT_PUBLIC_RUTE_LAYER_ID, hidePopup);
    });

    return () => {
      popup.remove();
    };
  }, [map]);

  return null;
}

/**
 * Companion legend for the layer above. Kept in this file so the swatch colour
 * and the line colour can only ever be changed together. Without it these
 * coloured lines read as an unexplained overlay on a citizen-facing map.
 */
export function BrtRoutesLegend() {
  return (
    <div className="w-36 rounded-lg border border-border-low bg-surface/95 p-2 shadow-sm backdrop-blur-sm md:w-48 md:p-3">
      <h4 className="mb-1 text-[11px] font-bold text-on-surface md:mb-2 md:text-label-sm">Jaringan BRT Eksisting</h4>
      <div className="flex items-center gap-1.5 md:gap-2">
        <span
          className="inline-block h-[3px] w-5 shrink-0 rounded-full md:w-6"
          style={{ backgroundColor: "#1d4ed8" }}
        />
        <span className="text-[11px] text-on-surface-variant md:text-label-sm">
          Rute koridor
          <br />
          (warna per koridor)
        </span>
      </div>
    </div>
  );
}
