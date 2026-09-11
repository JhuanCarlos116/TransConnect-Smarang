"use client";

import { useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";

import { HALTE_POINT_LAYER_ID } from "@/components/map/HalteLayer";
import CorridorLegendRows, { CorridorFilterReset } from "@/components/ui/CorridorLegendRows";
import { koridorColorExpression, koridorTags } from "@/lib/brtCorridorStyle";
import { corridorFilterFor } from "@/lib/corridorFilter";
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
 *  - no error state: fetchBrtNetwork resolves to an empty network if the
 *    endpoint is unreachable, so the page draws the survey without corridors
 *    rather than failing to load
 *  - no visibility state of its own: the corridors can be folded away by the
 *    passenger now, but the flag is owned by MapView and arrives as a prop, so
 *    the toggle button, this layer and BrtRoutesLegend cannot disagree about
 *    whether the lines are showing.
 *
 * It does report the corridor tags it styled, via `onCorridors`, because the
 * legend needs the same list in the same order to colour its swatches -- and
 * only the layer has it (MapView fetches the halte survey, not the network).
 * Reporting rather than re-fetching keeps one fetch and one ordering.
 */
export default function BrtRoutesLayer({
  map,
  visible,
  hidden = [],
  onCorridors,
}: {
  map: maplibregl.Map;
  visible: boolean;
  /** Corridor tags the passenger has filtered out. Applied to the line layer
   * as a MapLibre filter; only the corridors are filterable because only the
   * lines carry a `koridor` tag -- see lib/corridorFilter.ts. */
  hidden?: string[];
  onCorridors?: (koridors: string[]) => void;
}) {
  const loadedRef = useRef(false);
  // The layer is added from a promise callback, so the first `visible` value is
  // already stale by then. This ref is refreshed in an effect declared BEFORE
  // the visibility effect below, which guarantees it holds the current value by
  // the time that one runs.
  const visibleRef = useRef(visible);
  // Same reasoning for the filter, plus one more: the filter needs the list of
  // corridors the layer turned out to have, which only exists after the fetch.
  const hiddenRef = useRef(hidden);
  const koridorsRef = useRef<string[]>([]);
  // Flips once the source and layer actually exist; before that
  // setLayoutProperty would throw on an unknown layer id.
  const [layerReady, setLayerReady] = useState(false);

  useEffect(() => {
    visibleRef.current = visible;
    hiddenRef.current = hidden;
  }, [visible, hidden]);

  // Held in a ref so that a caller passing an inline arrow cannot re-run the
  // fetch effect below (whose deps are [map] only) and re-add the source.
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

    fetchBrtNetwork().then(({ rute }) => {
      if (rute.length === 0) return;

      // One list, used for both the colour expression and the legend rows, so
      // the swatch a reader sees is the colour of the line they see.
      const koridors = koridorTags(rute);
      koridorsRef.current = koridors;

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
          "line-color": koridorColorExpression(koridors) as never,
          // Thinner and softer than the dashboard's 1.2/2.6/4 at the same zooms:
          // here the corridors sit under 42 markers that must stay legible.
          "line-width": ["interpolate", ["linear"], ["zoom"], 10, 0.8, 14, 1.8, 17, 3] as never,
          "line-opacity": 0.55,
        },
      });

      // Honour whatever the passenger has already chosen while the fetch was in
      // flight, otherwise the lines flash on for a frame before the visibility
      // effect below catches up. The corridor filter is applied here for the
      // same reason: without it a passenger who had already unticked corridors
      // would see their lines drawn until the next interaction.
      map.setLayoutProperty(
        BRT_PUBLIC_RUTE_LAYER_ID,
        "visibility",
        visibleRef.current ? "visible" : "none",
      );
      map.setFilter(
        BRT_PUBLIC_RUTE_LAYER_ID,
        corridorFilterFor(hiddenRef.current, koridors) as never,
      );
      setLayerReady(true);
      // Only after the layer exists: the legend explains drawn lines, so it
      // must not list corridors the map failed to add.
      onCorridorsRef.current?.(koridors);

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

  // Applies every later press of the toggle. Depends on layerReady so it also
  // fires the moment the layer appears, and on `visible` so it fires on each
  // change. Guarded with getLayer because MapLibre throws on an unknown id.
  useEffect(() => {
    if (!layerReady || !map.getLayer(BRT_PUBLIC_RUTE_LAYER_ID)) return;
    map.setLayoutProperty(
      BRT_PUBLIC_RUTE_LAYER_ID,
      "visibility",
      visible ? "visible" : "none",
    );
  }, [map, visible, layerReady]);

  // Applies every later corridor-filter change. Deliberately its own effect
  // rather than folded into the visibility one: folding the corridors away and
  // choosing which ones to draw are independent, so the filter survives a
  // fold/unfold instead of having to be reapplied on the way back.
  useEffect(() => {
    if (!layerReady || !map.getLayer(BRT_PUBLIC_RUTE_LAYER_ID)) return;
    map.setFilter(
      BRT_PUBLIC_RUTE_LAYER_ID,
      corridorFilterFor(hidden, koridorsRef.current) as never,
    );
  }, [map, hidden, layerReady]);

  return null;
}

/**
 * Companion legend for the layer above. Kept in this file so the swatch colour
 * and the line colour can only ever be changed together. Without it these
 * coloured lines read as an unexplained overlay on a citizen-facing map.
 *
 * One row per corridor rather than a single "warna per koridor" line, at the
 * passenger's request: "Keterangan legenda BRT eksisting bisa dibedakan sesuai
 * koridornya". 17 corridors means 17 colours, and a generic swatch told the
 * reader only that the colours differ, not which line is which. The swatch is
 * `KORIDOR_PALETTE[i]` for the same index the colour expression used, so a
 * legend row cannot disagree with the line it describes.
 */
export function BrtRoutesLegend({
  koridors,
  hidden = [],
  onToggle,
  onShowAll,
}: {
  koridors: string[];
  hidden?: string[];
  onToggle?: (koridor: string) => void;
  onShowAll?: () => void;
}) {
  // Nothing to explain before the corridors arrive, or if the fetch failed
  // (fetchBrtNetwork resolves empty rather than throwing, and then the layer
  // draws nothing either).
  if (koridors.length === 0) return null;

  return (
    <div className="w-36 rounded-lg border border-border-low bg-surface/95 p-2 shadow-sm backdrop-blur-sm md:w-48 md:p-3">
      <h4 className="mb-1 text-[11px] font-bold text-on-surface md:mb-2 md:text-label-sm">Jaringan BRT Eksisting</h4>
      {/* Capped and scrollable: 17 rows would otherwise be taller than the
          phone viewport the legend was just made foldable to protect. */}
      <div className="flex max-h-[34vh] flex-col gap-0.5 overflow-y-auto pr-0.5 md:max-h-[46vh] md:gap-1">
        {onShowAll && (
          <CorridorFilterReset
            hiddenCount={hidden.length}
            onShowAll={onShowAll}
            className="text-[10px] md:text-[11px]"
          />
        )}
        <CorridorLegendRows
          koridors={koridors}
          hidden={hidden}
          onToggle={onToggle}
          swatchClassName="inline-block h-[3px] w-5 shrink-0 rounded-full md:w-6"
          labelClassName="truncate text-[10px] text-on-surface-variant md:text-[11px]"
        />
      </div>
    </div>
  );
}
