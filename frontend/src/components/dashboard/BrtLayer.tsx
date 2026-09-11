"use client";

import { useCallback, useEffect, useRef } from "react";
import * as maplibregl from "maplibre-gl";

import { BUS_STOP_POINT_LAYER_ID } from "@/components/dashboard/BusStopLayer";
import { koridorColorExpression, koridorTags, BRT_HALTE_COLOR } from "@/lib/brtCorridorStyle";
import { corridorFilterFor } from "@/lib/corridorFilter";
import { fetchBrtNetwork } from "@/lib/fetchBrtNetwork";
import type { BrtHalteFeature } from "@/types/brt";

const RUTE_SOURCE_ID = "brt-network-rute";
const HALTE_SOURCE_ID = "brt-network-halte";
export const BRT_RUTE_LAYER_ID = "brt-network-rute-lines";
export const BRT_HALTE_LAYER_ID = "brt-network-halte-points";

interface BrtLayerProps {
  map: maplibregl.Map;
  visible: boolean;
  /** Corridor tags DISHUB has filtered out. Only the corridor LINES can be
   * filtered -- the 673 halte points carry no corridor tag in the source data
   * -- so while a filter is active the halte dots are hidden rather than left
   * on screen looking like they belong to the selected corridors. Reasoning
   * and the measurement behind it: lib/corridorFilter.ts. */
  hidden?: string[];
  /** Reports the corridor tags this layer styled, in the same order it gave
   * them colours. The sidebar legend colours its rows from this list, so the
   * legend cannot disagree with the map and there is still only one fetch. */
  onCorridors?: (koridors: string[]) => void;
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
export default function BrtLayer({ map, visible, hidden = [], onCorridors }: BrtLayerProps) {
  const loadedRef = useRef(false);
  const visibleRef = useRef(visible);
  // The fetch resolves after the dispatcher may already have folded the layer
  // away or ticked corridors off, so both values are read from refs by the
  // effect below and by the fetch callback rather than closed over.
  const hiddenRef = useRef(hidden);
  // The corridor list only exists once the fetch has returned; the filter needs
  // it to tell "nothing hidden" (no filter at all) from "nothing visible"
  // (filter that must match no line).
  const koridorsRef = useRef<string[]>([]);
  // In a ref so an inline arrow from the caller cannot re-run the fetch effect
  // below (deps are [map] only) and re-add the sources.
  const onCorridorsRef = useRef(onCorridors);

  useEffect(() => {
    onCorridorsRef.current = onCorridors;
  }, [onCorridors]);

  /**
   * Pushes the current visibility + corridor filter onto both layers.
   *
   * One function for all three inputs (folded away, corridor filter, fetch
   * landed) because they interact: the halte dots have no corridor tag, so
   * they follow `visible AND nothing filtered out`. Splitting this into two
   * effects is what let the dots and the lines disagree in the first place.
   */
  const applyState = useCallback(() => {
    const lines = visibleRef.current ? "visible" : "none";
    if (map.getLayer(BRT_RUTE_LAYER_ID)) {
      map.setLayoutProperty(BRT_RUTE_LAYER_ID, "visibility", lines);
      map.setFilter(
        BRT_RUTE_LAYER_ID,
        corridorFilterFor(hiddenRef.current, koridorsRef.current) as never,
      );
    }
    if (map.getLayer(BRT_HALTE_LAYER_ID)) {
      const dots = visibleRef.current && hiddenRef.current.length === 0 ? "visible" : "none";
      map.setLayoutProperty(BRT_HALTE_LAYER_ID, "visibility", dots);
    }
  }, [map]);

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

      // One list, used for the colour expression and for the legend rows.
      const koridors = koridorTags(rute);
      koridorsRef.current = koridors;

      map.addSource(RUTE_SOURCE_ID, { type: "geojson", data: { type: "FeatureCollection", features: rute } as never });
      map.addLayer({
        id: BRT_RUTE_LAYER_ID,
        type: "line",
        source: RUTE_SOURCE_ID,
        layout: { visibility: initial, "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": koridorColorExpression(koridors) as never,
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
          "circle-color": BRT_HALTE_COLOR,
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
      // toggle may already have been flipped, or corridors already ticked off.
      applyState();

      // After the lines exist: the legend explains drawn corridors, so it must
      // not list any the map failed to add.
      onCorridorsRef.current?.(koridors);
    });

    return () => {
      popup.remove();
    };
  }, [map]);

  // Applies every later toggle/filter change. Runs after the fetch effect on
  // mount, where it is harmless: applyState checks getLayer before touching
  // anything, and the fetch callback calls it again once the layers exist.
  useEffect(() => {
    visibleRef.current = visible;
    hiddenRef.current = hidden;
    applyState();
  }, [visible, hidden, applyState]);

  return null;
}
