"use client";

import { useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import * as maplibregl from "maplibre-gl";

import { fetchHalteData } from "@/lib/fetchHalteData";
import HaltePopup from "@/components/map/HaltePopup";
import type { HalteFeatureCollection } from "@/types/halte";

const SOURCE_ID = "halte-survey";
const LAYER_ID = "halte-survey-points";

interface HalteLayerProps {
  map: maplibregl.Map;
  visible: boolean;
}

export default function HalteLayer({ map, visible }: HalteLayerProps) {
  const loadedRef = useRef(false);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;

    fetchHalteData().then((data: HalteFeatureCollection) => {
            map.addSource(SOURCE_ID, { type: "geojson", data });

      map.addLayer({
        id: LAYER_ID,
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

      map.on("mouseenter", LAYER_ID, () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", LAYER_ID, () => {
        map.getCanvas().style.cursor = "";
      });

      map.on("click", LAYER_ID, (e: maplibregl.MapLayerMouseEvent) => {
        const feature = e.features?.[0];
        if (!feature || feature.geometry.type !== "Point") return;

        const coordinates = feature.geometry.coordinates.slice() as [number, number];
        const container = document.createElement("div");
        createRoot(container).render(<HaltePopup properties={feature.properties as never} />);

        new maplibregl.Popup({ offset: 12 })
          .setLngLat(coordinates)
          .setDOMContent(container)
          .addTo(map);
      });
    });
  }, [map]);

  useEffect(() => {
    if (!map.getLayer(LAYER_ID)) return;
    map.setLayoutProperty(LAYER_ID, "visibility", visible ? "visible" : "none");
  }, [map, visible]);

  return null;
}
