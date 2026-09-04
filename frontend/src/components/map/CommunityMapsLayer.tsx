"use client";

import { useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import * as maplibregl from "maplibre-gl";

import { fetchCommunityReports } from "@/lib/fetchCommunityReports";
import CommunityReportPopup from "@/components/map/CommunityReportPopup";
import type { CommunityReportFeatureCollection } from "@/types/communityReport";
import type { ConditionLabel } from "@/types/halte";

/** Which condition of report to show -- see ReportFilterButton in DashboardSidebar. */
export type ReportConditionFilter = ConditionLabel | "all";

const SOURCE_ID = "community-reports";
export const COMMUNITY_CLUSTER_LAYER_ID = "community-reports-clusters";
const CLUSTER_LAYER_ID = COMMUNITY_CLUSTER_LAYER_ID;
const CLUSTER_COUNT_LAYER_ID = "community-reports-cluster-count";
export const COMMUNITY_POINT_LAYER_ID = "community-reports-points";
const POINT_LAYER_ID = COMMUNITY_POINT_LAYER_ID;
const ALL_LAYER_IDS = [CLUSTER_LAYER_ID, CLUSTER_COUNT_LAYER_ID, POINT_LAYER_ID];

interface CommunityMapsLayerProps {
  map: maplibregl.Map;
  visible: boolean;
  /**
   * When provided, clicking an individual report calls this instead of
   * opening the inline popup. Used on the DISHUB dashboard, where these
   * points are the surveyed halte (report_id === halte_id) and staff need
   * the full survey detail -- photos, facilities, condition -- not just the
   * report summary. Left unset on the public map, which keeps the popup.
   */
  onSelect?: (reportId: string) => void;
  /**
   * Which condition of report to show. Defaults to "all" (the public map
   * shows every report); the dashboard cycles it through the three labels.
   * Applied by swapping the source's data rather than by setFilter, because
   * this source clusters -- cluster counts are computed from the source
   * data, so a layer-level filter would leave clusters counting points that
   * are no longer drawn.
   */
  conditionFilter?: ReportConditionFilter;
}

function filterByCondition(
  data: CommunityReportFeatureCollection,
  condition: ReportConditionFilter,
): CommunityReportFeatureCollection {
  if (condition === "all") return data;
  return { ...data, features: data.features.filter((f) => f.properties.condition_label === condition) };
}

export default function CommunityMapsLayer({
  map,
  visible,
  onSelect,
  conditionFilter = "all",
}: CommunityMapsLayerProps) {
  const loadedRef = useRef(false);
  const onSelectRef = useRef(onSelect);
  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);
  // Full unfiltered collection, kept so the filter effect can re-derive any
  // subset without refetching.
  const dataRef = useRef<CommunityReportFeatureCollection | null>(null);
  // Same async-load race as visibleRef below: the filter can change while the
  // fetch is still in flight.
  const filterRef = useRef(conditionFilter);
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

    fetchCommunityReports().then((data: CommunityReportFeatureCollection) => {
      dataRef.current = data;

      map.addSource(SOURCE_ID, {
        type: "geojson",
        data: filterByCondition(data, filterRef.current),
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 50,
      });

      const initialVisibility = visibleRef.current ? "visible" : "none";

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
          // Colored by the survey condition these sample reports carry, so
          // the dashboard's condition legend still maps to something once
          // the halte layer there switches to the unassessed bus stop
          // inventory. Falls back to the old flat blue when absent.
          "circle-color": [
            "match",
            ["get", "condition_label"],
            "green",
            "#22c55e",
            "yellow",
            "#eab308",
            "red",
            "#ef4444",
            /* default */ "#3b82f6",
          ],
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

        if (onSelectRef.current) {
          const reportId = feature.properties?.report_id as string | undefined;
          if (reportId) {
            onSelectRef.current(reportId);
            return;
          }
        }

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
    visibleRef.current = visible;
    if (!map.getLayer(POINT_LAYER_ID)) return;
    for (const id of ALL_LAYER_IDS) {
      map.setLayoutProperty(id, "visibility", visible ? "visible" : "none");
    }
  }, [map, visible]);

  useEffect(() => {
    filterRef.current = conditionFilter;
    const source = map.getSource(SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
    if (!source || !dataRef.current) return;
    source.setData(filterByCondition(dataRef.current, conditionFilter) as never);
  }, [map, conditionFilter]);

  return null;
}
