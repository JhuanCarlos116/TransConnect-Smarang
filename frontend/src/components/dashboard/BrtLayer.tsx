"use client";

import { useEffect, useRef } from "react";
import * as maplibregl from "maplibre-gl";

import { BUS_STOP_POINT_LAYER_ID } from "@/components/dashboard/BusStopLayer";
import { koridorColorExpression, koridorTags, BRT_HALTE_COLOR } from "@/lib/brtCorridorStyle";
import { rutePopupHtml } from "@/lib/brtRutePopup";
import { fetchBrtNetwork } from "@/lib/fetchBrtNetwork";
import type { BrtHalteFeature, BrtRuteProperties } from "@/types/brt";

const RUTE_SOURCE_ID = "brt-network-rute";
const HALTE_SOURCE_ID = "brt-network-halte";
export const BRT_RUTE_LAYER_ID = "brt-network-rute-lines";
export const BRT_HALTE_LAYER_ID = "brt-network-halte-points";

interface BrtLayerProps {
  map: maplibregl.Map;
  visible: boolean;
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
export default function BrtLayer({ map, visible, onCorridors }: BrtLayerProps) {
  const loadedRef = useRef(false);
  const visibleRef = useRef(visible);
  // In a ref so an inline arrow from the caller cannot re-run the fetch effect
  // below (deps are [map] only) and re-add the sources.
  const onCorridorsRef = useRef(onCorridors);

  useEffect(() => {
    onCorridorsRef.current = onCorridors;
  }, [onCorridors]);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;

    const popup = new maplibregl.Popup({
      closeButton: false,
      closeOnClick: false,
      offset: 10,
    });

    // Set once the hover handlers are attached, so the cleanup can detach the
    // canvas listener even though it is bound inside the fetch callback below.
    let detachHover: (() => void) | null = null;

    fetchBrtNetwork().then(({ halte, rute }) => {
      const initial = visibleRef.current ? "visible" : "none";

      // One list, used for the colour expression and for the legend rows.
      const koridors = koridorTags(rute);

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

      // One owner for every BRT hover popup on this map: the halte dots and the
      // corridor lines. Two hover layers each carrying their own popup is how
      // this app previously ended up with two maplibregl.Popups stacked on the
      // same point (the bug MapInfoPopup was written to fix) -- and here it is
      // guaranteed, because a halte sitting on a corridor is under the cursor
      // as BOTH a circle feature and a line feature, and queryRenderedFeatures
      // does not occlude: MapLibre would fire a mousemove for each layer.
      //
      // So one handler decides, with the priority stated: the dot is drawn on
      // top of the lines and is the more specific object, so it wins, and a
      // hover on a halte that happens to sit on a corridor still describes the
      // halte rather than the corridor.
      //
      // Registered on the MAP rather than per layer on purpose: a layer-scoped
      // mouseleave for one layer fires even when the cursor moved onto the
      // other, which would tear the popup down a frame after it appeared. A
      // map-scoped mousemove re-decides at the new point every time, so the
      // popup can only ever be present or absent for the right reason.
      const HOVER_LAYER_IDS = [BRT_HALTE_LAYER_ID, BRT_RUTE_LAYER_ID];

      const showBrtHover = (e: maplibregl.MapMouseEvent) => {
        const found = map.queryRenderedFeatures(e.point, { layers: HOVER_LAYER_IDS });
        const onHalte = found.find((f) => f.layer.id === BRT_HALTE_LAYER_ID && f.geometry.type === "Point");
        const onRute = found.find((f) => f.layer.id === BRT_RUTE_LAYER_ID);
        const target = onHalte ?? onRute;
        if (!target) {
          map.getCanvas().style.cursor = "";
          popup.remove();
          return;
        }
        map.getCanvas().style.cursor = "pointer";

        let html: string;
        if (target === onHalte) {
          const p = target.properties as BrtHalteFeature["properties"];
          const alias = p.alias && p.alias !== p.nama_halte ? `<br/><span style="opacity:.7">${p.alias}</span>` : "";
          const jenis = p.jenis_shel ? `<br/><span style="opacity:.7">Shelter ${p.jenis_shel}</span>` : "";
          html =
            `<div style="font-size:12px;line-height:1.35"><strong>${p.nama_halte}</strong>${alias}${jenis}</div>` +
            `<br/><span style="opacity:.7">Halte BRT Trans Semarang</span>`;
        } else {
          // Same builder the public /map uses, so a corridor reads identically
          // on the page a citizen sees and the page DISHUB works in.
          html = rutePopupHtml(target.properties as BrtRuteProperties);
        }

        popup.setLngLat(e.lngLat).setHTML(html).addTo(map);
      };
      const hideBrtHover = () => {
        map.getCanvas().style.cursor = "";
        popup.remove();
      };
      map.on("mousemove", showBrtHover);
      // Cursor leaving the canvas entirely. This cannot be `map.on("mouseleave")`:
      // MapLibre 6 dropped mouseenter/mouseleave from the MAP-level event types
      // (only the layer-scoped forms keep them; the map has mouseout/mouseover
      // instead) and the map-scoped call does not typecheck. A DOM listener on
      // the canvas is also more precise here -- it fires only when the pointer
      // really leaves the canvas, not when it moves onto the popup's own DOM.
      const canvasEl = map.getCanvas();
      canvasEl.addEventListener("mouseleave", hideBrtHover);
      detachHover = () => {
        canvasEl.removeEventListener("mouseleave", hideBrtHover);
      };

      // Same desync guard as the survey layer: the fetch resolves after the
      // toggle may already have been flipped.
      const current = visibleRef.current ? "visible" : "none";
      map.setLayoutProperty(BRT_RUTE_LAYER_ID, "visibility", current);
      map.setLayoutProperty(BRT_HALTE_LAYER_ID, "visibility", current);

      // After the lines exist: the legend explains drawn corridors, so it must
      // not list any the map failed to add.
      onCorridorsRef.current?.(koridors);
    });

    return () => {
      detachHover?.();
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
