"use client";

import { useEffect, useRef } from "react";
import * as maplibregl from "maplibre-gl";

import { BUS_STOP_POINT_LAYER_ID } from "@/components/dashboard/BusStopLayer";
import { koridorColorExpression, koridorTags } from "@/lib/brtCorridorStyle";
import { fetchBrtNetwork } from "@/lib/fetchBrtNetwork";
import type { BrtHalteFeature } from "@/types/brt";

const RUTE_SOURCE_ID = "brt-network-rute";
const HALTE_SOURCE_ID = "brt-network-halte";
export const BRT_RUTE_LAYER_ID = "brt-network-rute-lines";
export const BRT_HALTE_LAYER_ID = "brt-network-halte-points";

interface BrtLayerProps {
  map: maplibregl.Map;
  visible: boolean;
}

/**
 * "Jaringan BRT Trans Semarang" -- the existing BRT network as context under
 * the team's own survey. 673 halte points and 34 corridor lines (17 corridors
 * x 2 directions), read from PostGIS via /api/v1/brt-network.
 *
 * Two deliberate choices worth keeping:
 *
 * 1. It always renders BENEATH "Titik Bus Stop / Halte". The whole value of
 *    this layer is context for the 42 surveyed halte, so those must stay the
 *    visually dominant marks. Mount order can't guarantee that -- each layer
 *    adds itself once its own fetch resolves, so whichever fetch wins would
 *    end up on top. Hence the explicit moveLayer below, which is correct in
 *    both orderings.
 *
 * 2. Halte points only appear from zoom 11 up. Zoomed out, 673 near-identical
 *    dots across Semarang read as noise; the corridors still show the network
 *    shape at any zoom.
 */
export default function BrtLayer({ map, visible }: BrtLayerProps) {
  const loadedRef = useRef(false);
  const visibleRef = useRef(visible);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;

    const popup = new maplibregl.Popup({
      closeButton: false,
      closeOnClick: false,
      offset: 10,
    });

    fetchBrtNetwork().then(({ halte, rute }) => {
      const initial = visibleRef.current ? "visible" : "none";

      map.addSource(RUTE_SOURCE_ID, { type: "geojson", data: { type: "FeatureCollection", features: rute } as never });
      map.addLayer({
        id: BRT_RUTE_LAYER_ID,
        type: "line",
        source: RUTE_SOURCE_ID,
        layout: { visibility: initial, "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": koridorColorExpression(koridorTags(rute)) as never,
          "line-width": ["interpolate", ["linear"], ["zoom"], 10, 1.2, 14, 2.6, 17, 4] as never,
          "line-opacity": 0.65,
        },
      });

      map.addSource(HALTE_SOURCE_ID, { type: "geojson", data: { type: "FeatureCollection", features: halte } as never });
      map.addLayer({
        id: BRT_HALTE_LAYER_ID,
        type: "circle",
        source: HALTE_SOURCE_ID,
        minzoom: 11,
        layout: { visibility: initial },
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 11, 2.5, 14, 4, 17, 6] as never,
          "circle-color": "#0f766e",
          "circle-stroke-width": 1.2,
          "circle-stroke-color": "#fff",
          "circle-opacity": 0.85,
        },
      });

      // Keep the survey beneath-fix: only meaningful if the survey layer is
      // already on the map. If it lands later it appends on top by itself,
      // so this single check covers both orderings.
      if (map.getLayer(BUS_STOP_POINT_LAYER_ID)) {
        map.moveLayer(BRT_RUTE_LAYER_ID, BUS_STOP_POINT_LAYER_ID);
        map.moveLayer(BRT_HALTE_LAYER_ID, BUS_STOP_POINT_LAYER_ID);
      }

      const showHaltePopup = (e: maplibregl.MapLayerMouseEvent) => {
        const clicked = e.features?.[0];
        if (!clicked || clicked.geometry.type !== "Point") return;
        const p = clicked.properties as BrtHalteFeature["properties"] | undefined;
        if (!p) return;
        map.getCanvas().style.cursor = "pointer";
        const alias = p.alias && p.alias !== p.nama_halte ? `<br/><span style="opacity:.7">${p.alias}</span>` : "";
        const jenis = p.jenis_shel ? `<br/><span style="opacity:.7">Shelter ${p.jenis_shel}</span>` : "";
        popup
          .setLngLat(e.lngLat)
          .setHTML(
            `<div style="font-size:12px;line-height:1.35"><strong>${p.nama_halte}</strong>${alias}${jenis}` +
              `<br/><span style="opacity:.7">Halte BRT Trans Semarang</span></div>`,
          )
          .addTo(map);
      };
      const hideHaltePopup = () => {
        map.getCanvas().style.cursor = "";
        popup.remove();
      };
      map.on("mousemove", BRT_HALTE_LAYER_ID, showHaltePopup);
      map.on("mouseleave", BRT_HALTE_LAYER_ID, hideHaltePopup);

      // Same desync guard as the survey layer: the fetch resolves after the
      // toggle may already have been flipped.
      const current = visibleRef.current ? "visible" : "none";
      map.setLayoutProperty(BRT_RUTE_LAYER_ID, "visibility", current);
      map.setLayoutProperty(BRT_HALTE_LAYER_ID, "visibility", current);
    });

    return () => {
      popup.remove();
    };
  }, [map]);

  useEffect(() => {
    visibleRef.current = visible;
    for (const id of [BRT_RUTE_LAYER_ID, BRT_HALTE_LAYER_ID]) {
      if (map.getLayer(id)) {
        map.setLayoutProperty(id, "visibility", visible ? "visible" : "none");
      }
    }
  }, [map, visible]);

  return null;
}
