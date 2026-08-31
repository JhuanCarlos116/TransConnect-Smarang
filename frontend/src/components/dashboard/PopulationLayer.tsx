"use client";

import { useEffect, useRef } from "react";
import * as maplibregl from "maplibre-gl";

import { fetchPopulationData } from "@/lib/fetchPopulationData";
import { densityFillExpression } from "@/lib/populationColor";
import type { KelurahanPopulationFeatureCollection } from "@/types/population";

const SOURCE_ID = "kelurahan-population";
export const POPULATION_FILL_LAYER_ID = "kelurahan-population-fill";
const FILL_LAYER_ID = POPULATION_FILL_LAYER_ID;
const LINE_LAYER_ID = "kelurahan-population-line";

interface PopulationLayerProps {
  map: maplibregl.Map;
  visible: boolean;
}

export default function PopulationLayer({ map, visible }: PopulationLayerProps) {
  const loadedRef = useRef(false);
  // The layer is added once, asynchronously, after its data arrives. `visible`
  // can flip while that fetch is still in flight, and the sync effect below
  // bails out whenever the layer does not exist yet -- so a value captured on
  // the first render would get baked in and the toggle would silently
  // disagree with the map. The sync effect keeps this ref current instead, and
  // the add-layer callback reads it when the data finally lands.
  const visibleRef = useRef(visible);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;

    fetchPopulationData().then((data: KelurahanPopulationFeatureCollection) => {
      const initialVisibility = visibleRef.current ? "visible" : "none";

      map.addSource(SOURCE_ID, { type: "geojson", data: data as never });

      map.addLayer(
        {
          id: FILL_LAYER_ID,
          type: "fill",
          source: SOURCE_ID,
          layout: { visibility: initialVisibility },
          paint: {
            "fill-color": densityFillExpression() as never,
            // Context layer, kept deliberately light: at 0.55 it drowned out the
            // halte points drawn above it.
            "fill-opacity": 0.3,
          },
        },
        map.getStyle().layers?.find((l) => l.type === "symbol")?.id,
      );

      map.addLayer({
        id: LINE_LAYER_ID,
        type: "line",
        source: SOURCE_ID,
        layout: { visibility: initialVisibility },
        paint: {
          "line-color": "#184f95",
          "line-width": 1,
          "line-opacity": 0.6,
        },
      });

      // Click/popup handling lives in MapInfoPopup instead -- this fill
      // overlaps the isochrone layer, and a click that hit both used to
      // open two popups stacked on top of each other.
      map.on("mouseenter", FILL_LAYER_ID, () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", FILL_LAYER_ID, () => {
        map.getCanvas().style.cursor = "";
      });
    });
  }, [map]);

  useEffect(() => {
    visibleRef.current = visible;
    if (!map.getLayer(FILL_LAYER_ID)) return;
    const visibility = visible ? "visible" : "none";
    map.setLayoutProperty(FILL_LAYER_ID, "visibility", visibility);
    map.setLayoutProperty(LINE_LAYER_ID, "visibility", visibility);
  }, [map, visible]);

  return null;
}
