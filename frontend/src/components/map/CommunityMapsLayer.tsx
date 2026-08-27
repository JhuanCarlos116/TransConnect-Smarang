"use client";

import { useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import * as maplibregl from "maplibre-gl";

import { fetchCommunityReports } from "@/lib/fetchCommunityReports";
import CommunityReportPopup from "@/components/map/CommunityReportPopup";
import type { CommunityReportFeatureCollection } from "@/types/communityReport";

const SOURCE_ID = "community-reports";
const CLUSTER_LAYER_ID = "community-reports-clusters";
const CLUSTER_COUNT_LAYER_ID = "community-reports-cluster-count";
const POINT_LAYER_ID = "community-reports-points";
const ALL_LAYER_IDS = [CLUSTER_LAYER_ID, CLUSTER_COUNT_LAYER_ID, POINT_LAYER_ID];

interface CommunityMapsLayerProps {
  map: maplibregl.Map;
  visible: boolean;
}

export default function CommunityMapsLayer({ map, visible }: CommunityMapsLayerProps) {
  const loadedRef = useRef(false);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;

    fetchCommunityReports().then((data: CommunityReportFeatureCollection) => {
      console.log(`Community reports (contoh laporan warga) loaded: ${data.features.length}`);

      map.addSource(SOURCE_ID, {
        type: "geojson",
        data,
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 50,
      });

      const initialVisibility = visible ? "visible" : "none";

      map.addLayer({
        id: CLUSTER_LAYER_ID,
        type: "circle",
        source: SOURCE_ID,
        filter: ["has", "point_count"],
        layout: { visibility: initialVisibility },
        paint: {
          "circle-color": "#3b82f6",
          "circle-opacity": 0.85,
          "circle-radius": ["step", ["get", "point_count"], 16, 10, 20, 25, 26],
          "circle-stroke-width": 2,
          "circle-stroke-color": "#fff",
        },
      });

      map.addLayer({
        id: CLUSTER_COUNT_LAYER_ID,
        type: "symbol",
        source: SOURCE_ID,
        filter: ["has", "point_count"],
        layout: {
          visibility: initialVisibility,
          "text-field": ["get", "point_count_abbreviated"],
          "text-size": 12,
        },
        paint: {
          "text-color": "#fff",
        },
      });

      map.addLayer({
        id: POINT_LAYER_ID,
        type: "circle",
        source: SOURCE_ID,
        filter: ["!", ["has", "point_count"]],
        layout: { visibility: initialVisibility },
        paint: {
          "circle-radius": 7,
          "circle-color": "#3b82f6",
          "circle-stroke-width": 2,
          "circle-stroke-color": "#fff",
        },
      });

      map.on("mouseenter", CLUSTER_LAYER_ID, () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", CLUSTER_LAYER_ID, () => {
        map.getCanvas().style.cursor = "";
      });
      map.on("mouseenter", POINT_LAYER_ID, () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", POINT_LAYER_ID, () => {
        map.getCanvas().style.cursor = "";
      });

      map.on("click", CLUSTER_LAYER_ID, async (e: maplibregl.MapLayerMouseEvent) => {
        const feature = e.features?.[0];
        if (!feature || feature.geometry.type !== "Point") return;

        const clusterId = feature.properties?.cluster_id;
        const source = map.getSource(SOURCE_ID) as maplibregl.GeoJSONSource;
        const zoom = await source.getClusterExpansionZoom(clusterId);
        map.easeTo({ center: feature.geometry.coordinates as [number, number], zoom });
      });

      map.on("click", POINT_LAYER_ID, (e: maplibregl.MapLayerMouseEvent) => {
        const feature = e.features?.[0];
        if (!feature || feature.geometry.type !== "Point") return;

        const coordinates = feature.geometry.coordinates.slice() as [number, number];
        const container = document.createElement("div");
        createRoot(container).render(<CommunityReportPopup properties={feature.properties as never} />);

        new maplibregl.Popup({ offset: 12 })
          .setLngLat(coordinates)
          .setDOMContent(container)
          .addTo(map);
      });
    });
  }, [map]);

  useEffect(() => {
    if (!map.getLayer(POINT_LAYER_ID)) return;
    for (const id of ALL_LAYER_IDS) {
      map.setLayoutProperty(id, "visibility", visible ? "visible" : "none");
    }
  }, [map, visible]);

  return null;
}
