"use client";

import { useEffect, useRef } from "react";
import * as maplibregl from "maplibre-gl";

import { fetchIsochrones } from "@/lib/fetchIsochrones";
import type { IsochroneFeatureCollection } from "@/types/isochrone";

const SOURCE_ID = "halte-isochrones";
const FILL_LAYER_ID = "halte-isochrones-fill";
const LINE_LAYER_ID = "halte-isochrones-line";

interface IsochroneLayerProps {
  map: maplibregl.Map;
  visible: boolean;
}

// Bands are cumulative ("reachable within <= N min", see build_isochrones.py)
// and the source data is pre-sorted largest-first (10, 5, 3), so a single
// layer with a data-driven match on `minutes` stacks correctly: later
// features in the array (the 3min band) draw on top and read as the
// darkest/most-covered core.
export default function IsochroneLayer({ map, visible }: IsochroneLayerProps) {
  const loadedRef = useRef(false);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;

    fetchIsochrones().then((data: IsochroneFeatureCollection) => {
      const initialVisibility = visible ? "visible" : "none";
      const beforeId = map.getStyle().layers?.find((l) => l.type === "symbol")?.id;

      map.addSource(SOURCE_ID, { type: "geojson", data: data as never });

      map.addLayer(
        {
          id: FILL_LAYER_ID,
          type: "fill",
          source: SOURCE_ID,
          layout: { visibility: initialVisibility },
          paint: {
            "fill-color": "#00529b",
            "fill-opacity": ["match", ["get", "minutes"], 3, 0.28, 5, 0.18, 10, 0.1, 0.1] as never,
          },
        },
        beforeId,
      );

      map.addLayer(
        {
          id: LINE_LAYER_ID,
          type: "line",
          source: SOURCE_ID,
          layout: { visibility: initialVisibility },
          paint: {
            "line-color": "#00529b",
            "line-width": 1,
            "line-opacity": 0.5,
          },
        },
        beforeId,
      );

      map.on("click", FILL_LAYER_ID, (e: maplibregl.MapLayerMouseEvent) => {
        const feature = e.features?.[0];
        if (!feature) return;
        const p = feature.properties as Record<string, number>;

        new maplibregl.Popup({ offset: 8 })
          .setLngLat(e.lngLat)
          .setHTML(
            `<div style="font-family:system-ui,sans-serif;font-size:13px;min-width:180px">` +
              `<div style="font-weight:700;margin-bottom:4px">Jangkauan ${p.minutes} menit jalan kaki</div>` +
              `<div>Dari ${p.halte_count} halte tersurvei</div>` +
              `<div>Luas area: ${p.area_km2} km²</div>` +
              `</div>`,
          )
          .addTo(map);
      });

      map.on("mouseenter", FILL_LAYER_ID, () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", FILL_LAYER_ID, () => {
        map.getCanvas().style.cursor = "";
      });
    });
  }, [map]);

  useEffect(() => {
    if (!map.getLayer(FILL_LAYER_ID)) return;
    const visibility = visible ? "visible" : "none";
    map.setLayoutProperty(FILL_LAYER_ID, "visibility", visibility);
    map.setLayoutProperty(LINE_LAYER_ID, "visibility", visibility);
  }, [map, visible]);

  return null;
}
