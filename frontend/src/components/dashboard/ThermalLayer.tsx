"use client";

import { useEffect, useRef } from "react";
import * as maplibregl from "maplibre-gl";
import { fetchHalteData } from "@/lib/fetchHalteData";
import type { HalteFeatureCollection } from "@/types/halte";

const SOURCE_ID = "thermal-lst-heat";
const LAYER_ID = "thermal-lst-heatmap";

interface ThermalLayerProps {
  map: maplibregl.Map;
  visible: boolean;
}

export default function ThermalLayer({ map, visible }: ThermalLayerProps) {
  const loadedRef = useRef(false);
  const visibleRef = useRef(visible);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;

    fetchHalteData().then((data: HalteFeatureCollection) => {
      const initialVisibility = visibleRef.current ? "visible" : "none";

      if (!map.getSource(SOURCE_ID)) {
        map.addSource(SOURCE_ID, {
          type: "geojson",
          data,
        });
      }

      const beforeId = map.getStyle().layers?.find((l) => l.type === "symbol")?.id;

      if (!map.getLayer(LAYER_ID)) {
        map.addLayer(
          {
            id: LAYER_ID,
            type: "heatmap",
            source: SOURCE_ID,
            layout: { visibility: initialVisibility },
            paint: {
              // Increase the heatmap weight based on condition or warmth
              "heatmap-weight": [
                "interpolate",
                ["linear"],
                ["get", "condition_score"],
                0,
                1,
                100,
                0.2,
              ],
              // Increase the heatmap color weight weight by zoom level
              "heatmap-intensity": [
                "interpolate",
                ["linear"],
                ["zoom"],
                11,
                1,
                15,
                3,
              ],
              // Color ramp for heatmap. Domain is 0 (low heat) to 1 (high heat)
              "heatmap-color": [
                "interpolate",
                ["linear"],
                ["heatmap-density"],
                0,
                "rgba(0, 188, 212, 0)",
                0.2,
                "rgba(0, 188, 212, 0.4)",
                0.4,
                "rgba(76, 175, 80, 0.5)",
                0.6,
                "rgba(251, 192, 45, 0.6)",
                0.8,
                "rgba(255, 87, 34, 0.7)",
                1,
                "rgba(211, 47, 47, 0.8)",
              ],
              // Adjust the heatmap radius by zoom level
              "heatmap-radius": [
                "interpolate",
                ["linear"],
                ["zoom"],
                11,
                20,
                15,
                45,
              ],
              // Transition from heatmap to circle layer by zoom level
              "heatmap-opacity": 0.65,
            },
          },
          beforeId,
        );
      }
    });
  }, [map]);

  useEffect(() => {
    visibleRef.current = visible;
    if (!map.getLayer(LAYER_ID)) return;
    map.setLayoutProperty(LAYER_ID, "visibility", visible ? "visible" : "none");
  }, [map, visible]);

  return null;
}

