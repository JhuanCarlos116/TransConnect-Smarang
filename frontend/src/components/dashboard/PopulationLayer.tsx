"use client";

import { useEffect, useRef } from "react";
import * as maplibregl from "maplibre-gl";

import { fetchPopulationData } from "@/lib/fetchPopulationData";
import { densityFillExpression } from "@/lib/populationColor";
import type { KelurahanPopulationFeatureCollection } from "@/types/population";

const SOURCE_ID = "kelurahan-population";
const FILL_LAYER_ID = "kelurahan-population-fill";
const LINE_LAYER_ID = "kelurahan-population-line";

interface PopulationLayerProps {
  map: maplibregl.Map;
  visible: boolean;
}

export default function PopulationLayer({ map, visible }: PopulationLayerProps) {
  const loadedRef = useRef(false);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;

    fetchPopulationData().then((data: KelurahanPopulationFeatureCollection) => {
      const initialVisibility = visible ? "visible" : "none";

      map.addSource(SOURCE_ID, { type: "geojson", data: data as never });

      map.addLayer(
        {
          id: FILL_LAYER_ID,
          type: "fill",
          source: SOURCE_ID,
          layout: { visibility: initialVisibility },
          paint: {
            "fill-color": densityFillExpression() as never,
            "fill-opacity": 0.55,
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

      map.on("click", FILL_LAYER_ID, (e: maplibregl.MapLayerMouseEvent) => {
        const feature = e.features?.[0];
        if (!feature) return;
        const p = feature.properties as Record<string, number | string>;

        new maplibregl.Popup({ offset: 8 })
          .setLngLat(e.lngLat)
          .setHTML(
            `<div style="font-family:system-ui,sans-serif;font-size:13px;min-width:160px">` +
              `<div style="font-weight:700;margin-bottom:4px">${p.kelurahan}</div>` +
              `<div>Penduduk: ${Number(p.jumlah_penduduk).toLocaleString("id-ID")} jiwa</div>` +
              `<div>Luas: ${p.luas_km2} km²</div>` +
              `<div>Kepadatan: ${Number(p.kepadatan_per_km2).toLocaleString("id-ID")} jiwa/km²</div>` +
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
