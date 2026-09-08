"use client";

import { useEffect, useRef } from "react";
import * as maplibregl from "maplibre-gl";

import { fetchHalteData } from "@/lib/fetchHalteData";
import type { HalteFeature, HalteFeatureCollection } from "@/types/halte";

export const HALTE_POINT_LAYER_ID = "halte-survey-points";
const SOURCE_ID = "halte-survey";

interface HalteLayerProps {
  map: maplibregl.Map;
  visible: boolean;
  /**
   * Called on marker click with the full feature -- the dashboard opens
   * HalteDetailModal with it, the public map opens HaltePublicModal. Both
   * pages own that modal's state themselves; this layer only reports clicks.
   */
  onSelect: (feature: HalteFeature) => void;
}

export default function HalteLayer({ map, visible, onSelect }: HalteLayerProps) {
  const loadedRef = useRef(false);
  // MapLibre re-encodes a geojson source's features through its internal
  // vector-tile pipeline for rendering, which only supports primitive
  // property values -- an array property like photo_urls can come back out
  // of a click event as a JSON *string*, not an array. Keeping the originally
  // fetched features here and looking one up by halte_id on click sidesteps
  // that entirely, for both the popup and onSelect.
  const featuresRef = useRef<HalteFeature[]>([]);
  const onSelectRef = useRef(onSelect);
  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;

    fetchHalteData().then((data: HalteFeatureCollection) => {
      featuresRef.current = data.features;
      map.addSource(SOURCE_ID, { type: "geojson", data });

      map.addLayer({
        id: HALTE_POINT_LAYER_ID,
        type: "circle",
        source: SOURCE_ID,
        paint: {
          "circle-radius": 8,
          "circle-stroke-width": 2,
          "circle-stroke-color": "#fff",
          "circle-color": [
            "match",
            ["get", "condition_label"],
            "green",
            "#22c55e",
            "yellow",
            "#eab308",
            "red",
            "#ef4444",
            /* default */ "#6b7280",
          ],
        },
      });

      map.on("mouseenter", HALTE_POINT_LAYER_ID, () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", HALTE_POINT_LAYER_ID, () => {
        map.getCanvas().style.cursor = "";
      });

      map.on("click", HALTE_POINT_LAYER_ID, (e: maplibregl.MapLayerMouseEvent) => {
        const clicked = e.features?.[0];
        if (!clicked || clicked.geometry.type !== "Point") return;

        const halteId = clicked.properties?.halte_id as string | undefined;
        const feature = featuresRef.current.find((f) => f.properties.halte_id === halteId);
        if (!feature) return;

        onSelectRef.current(feature);
      });
    });
  }, [map]);

  useEffect(() => {
    if (!map.getLayer(HALTE_POINT_LAYER_ID)) return;
    map.setLayoutProperty(HALTE_POINT_LAYER_ID, "visibility", visible ? "visible" : "none");
  }, [map, visible]);

  return null;
}
