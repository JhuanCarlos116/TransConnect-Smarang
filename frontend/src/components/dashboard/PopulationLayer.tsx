"use client";

import { useEffect, useRef } from "react";
import * as maplibregl from "maplibre-gl";

import { fetchPopulationData } from "@/lib/fetchPopulationData";
import { densityFillExpression } from "@/lib/populationColor";
import { HALTE_POINT_LAYER_ID } from "@/components/map/HalteLayer";
import { COMMUNITY_CLUSTER_LAYER_ID, COMMUNITY_POINT_LAYER_ID } from "@/components/map/CommunityMapsLayer";
import type { KelurahanPopulationFeatureCollection } from "@/types/population";

// Clusters (community-reports-clusters) and individual unclustered points
// (community-reports-points) are two separate layers -- guarding only the
// point layer left cluster bubbles able to trigger this popup too.
const TOP_LAYER_IDS = [HALTE_POINT_LAYER_ID, COMMUNITY_POINT_LAYER_ID, COMMUNITY_CLUSTER_LAYER_ID];

const SOURCE_ID = "kelurahan-population";
const FILL_LAYER_ID = "kelurahan-population-fill";
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

      map.on("click", FILL_LAYER_ID, (e: maplibregl.MapLayerMouseEvent) => {
        // Halte markers and community-report points are drawn on top of this
        // fill, but MapLibre fires each layer's click handler independently
        // for whatever the cursor is over -- clicking a halte marker sitting
        // inside a kelurahan polygon used to open both popups at once,
        // stacked on top of each other. Filtered to layers that currently
        // exist, since this can fire before HalteLayer/CommunityMapsLayer
        // have finished their own async setup.
        const existingTopLayers = TOP_LAYER_IDS.filter((id) => map.getLayer(id));
        if (existingTopLayers.length > 0 && map.queryRenderedFeatures(e.point, { layers: existingTopLayers }).length > 0) {
          return;
        }

        const feature = e.features?.[0];
        if (!feature) return;
        const p = feature.properties as Record<string, number | string>;

        // Explicit dark colors throughout -- this is raw HTML via setHTML(),
        // outside Tailwind's reach, and without them it fell back to
        // MapLibre's own low-contrast popup default (pale gray on white).
        new maplibregl.Popup({ offset: 8 })
          .setLngLat(e.lngLat)
          .setHTML(
            `<div style="font-family:system-ui,sans-serif;font-size:13px;min-width:170px;color:var(--color-on-surface)">` +
              `<div style="font-weight:700;font-size:15px;margin-bottom:6px;color:var(--color-on-surface)">${p.kelurahan}</div>` +
              `<div style="margin-bottom:2px"><span style="color:var(--color-on-surface-variant)">Penduduk:</span> <b>${Number(p.jumlah_penduduk).toLocaleString("id-ID")} jiwa</b></div>` +
              `<div style="margin-bottom:2px"><span style="color:var(--color-on-surface-variant)">Luas:</span> <b>${p.luas_km2} km²</b></div>` +
              `<div><span style="color:var(--color-on-surface-variant)">Kepadatan:</span> <b>${Number(p.kepadatan_per_km2).toLocaleString("id-ID")} jiwa/km²</b></div>` +
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
    visibleRef.current = visible;
    if (!map.getLayer(FILL_LAYER_ID)) return;
    const visibility = visible ? "visible" : "none";
    map.setLayoutProperty(FILL_LAYER_ID, "visibility", visibility);
    map.setLayoutProperty(LINE_LAYER_ID, "visibility", visibility);
  }, [map, visible]);

  return null;
}
