"use client";

import { useCallback, useEffect, useRef } from "react";
import * as maplibregl from "maplibre-gl";

import { fetchHalteData } from "@/lib/fetchHalteData";
import type { ConditionLabel, HalteFeature, HalteFeatureCollection } from "@/types/halte";

export type HalteConditionFilter = ConditionLabel | "all";

/** "baru" = a citizen report with no task yet, or a task that hasn't been
 * started ("belum_dikerjakan") -- still needs attention, drawn red.
 * "proses" = the dispatched task is actively being worked on -- drawn
 * orange. There is no "selesai" status: a task reaching "selesai" deletes
 * its citizen_report row server-side (see update_task_status in
 * routers/task.py), so that halte simply stops appearing in the map passed
 * in here and its ring disappears on its own. */
export type ReportMarkerStatus = "baru" | "proses";

const SOURCE_ID = "bus-stops";
export const BUS_STOP_POINT_LAYER_ID = "bus-stops-points";
const POINT_LAYER_ID = BUS_STOP_POINT_LAYER_ID;

const REPORT_MARKER_SOURCE_ID = "bus-stops-reported";
const REPORT_MARKER_LAYER_ID = "bus-stops-reported-ring";
const REPORT_STATUS_PROPERTY = "_report_status";

interface BusStopLayerProps {
  map: maplibregl.Map;
  visible: boolean;
  onSelect?: (feature: HalteFeature) => void;
  /** Which condition to show. Defaults to "all". See DashboardSidebar's filter button. */
  conditionFilter?: HalteConditionFilter;
  /**
   * halte_id -> report/task status, drawn as a colored ring around the
   * halte's dot so a dispatcher spots it on the map itself, not just inside
   * each halte's own detail panel. Owned by the dashboard page
   * (fetchAllCitizenReports + fetchTasks), not this component, so it stays
   * one source of truth the page can refresh after dispatch/approve/selesai
   * actions instead of every layer fetching its own copy.
   */
  reportedHalteStatus?: Map<string, ReportMarkerStatus>;
}

function filterByCondition(
  data: HalteFeatureCollection,
  condition: HalteConditionFilter,
): HalteFeatureCollection {
  if (condition === "all") return data;
  return { ...data, features: data.features.filter((f) => f.properties.condition_label === condition) };
}

/**
 * "Titik Bus Stop / Halte" on the DISHUB dashboard -- the single halte/bus
 * stop layer, sourced from the team's own 42-point survey, colored by
 * condition_label and filterable by condition.
 *
 * Not clustered: this used to reuse CommunityMapsLayer's clustering
 * approach, but with only 42 points the team found clusters counter-
 * productive here specifically -- the whole point of this layer is seeing
 * each halte's individual condition color, and a zoomed-out view turned
 * most of them into plain blue numbered bubbles that hid that. (Clustering
 * still makes sense for a genuinely large point set like the public map's
 * community reports layer, which is unaffected by this.)
 *
 * This used to show the team's separate, wider 71-point inventory
 * (backend/scripts/build_bus_stops.py, no condition data, only loosely
 * linked to the survey -- see match_survey_to_bus_stops.py) alongside a
 * second "Laporan Warga" layer duplicating the same 42 survey points as
 * sample citizen reports. The team found the split confusing (an
 * unassessed inventory layer next to an assessed one covering an
 * overlapping area) and asked for one consolidated layer instead, named
 * for what it shows (halte/bus stop points) rather than how the data was
 * collected -- "Laporan Warga" is gone, and its condition filter button
 * moved here with it. The 71-point inventory file/script are left in place
 * (unused by the frontend now, not deleted) in case they're useful again.
 */
export default function BusStopLayer({
  map,
  visible,
  onSelect,
  conditionFilter = "all",
  reportedHalteStatus,
}: BusStopLayerProps) {
  const loadedRef = useRef(false);
  const onSelectRef = useRef(onSelect);
  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);
  // Full unfiltered collection, kept so the filter effect can re-derive any
  // subset without refetching.
  const dataRef = useRef<HalteFeatureCollection | null>(null);
  const filterRef = useRef(conditionFilter);
  const visibleRef = useRef(visible);
  const reportedStatusRef = useRef(reportedHalteStatus);

  const updateReportMarkers = useCallback(() => {
    const source = map.getSource(REPORT_MARKER_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
    const statusByHalte = reportedStatusRef.current;
    if (!source || !dataRef.current || !statusByHalte || statusByHalte.size === 0) {
      source?.setData({ type: "FeatureCollection", features: [] });
      return;
    }
    source.setData({
      type: "FeatureCollection",
      features: dataRef.current.features
        .filter((f) => statusByHalte.has(f.properties.halte_id))
        .map((f) => ({
          ...f,
          properties: { ...f.properties, [REPORT_STATUS_PROPERTY]: statusByHalte.get(f.properties.halte_id) },
        })),
    } as never);
  }, [map]);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;

    fetchHalteData().then((data: HalteFeatureCollection) => {
      dataRef.current = data;

      map.addSource(SOURCE_ID, {
        type: "geojson",
        data: filterByCondition(data, filterRef.current) as never,
      });

      const initialVisibility = visibleRef.current ? "visible" : "none";

      map.addLayer({
        id: POINT_LAYER_ID,
        type: "circle",
        source: SOURCE_ID,
        layout: { visibility: initialVisibility },
        paint: {
          "circle-radius": 7,
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
          "circle-stroke-width": 2,
          "circle-stroke-color": "#fff",
        },
      });

      // Second, independent source/layer rather than folding this into
      // POINT_LAYER_ID above -- reportedHalteStatus changes on its own
      // schedule (dispatch/approve/selesai actions), separately from the
      // halte survey data and its condition filter, so keeping it as its own
      // GeoJSON source lets it update via setData without touching or
      // re-filtering the halte points at all. The ring color itself IS a
      // data-driven paint expression, keyed off each feature's
      // _report_status ("baru" -> red: new or dispatched-but-not-started;
      // "proses" -> orange: a technician has actually started work).
      map.addSource(REPORT_MARKER_SOURCE_ID, {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.addLayer({
        id: REPORT_MARKER_LAYER_ID,
        type: "circle",
        source: REPORT_MARKER_SOURCE_ID,
        layout: { visibility: initialVisibility },
        paint: {
          "circle-radius": 12,
          "circle-color": "transparent",
          "circle-stroke-width": 3,
          "circle-stroke-color": ["match", ["get", REPORT_STATUS_PROPERTY], "proses", "#f97316", "#dc2626"],
        },
      });

      map.on("mouseenter", POINT_LAYER_ID, () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", POINT_LAYER_ID, () => {
        map.getCanvas().style.cursor = "";
      });

      map.on("click", POINT_LAYER_ID, (e: maplibregl.MapLayerMouseEvent) => {
        const clicked = e.features?.[0];
        if (!clicked || clicked.geometry.type !== "Point") return;

        const halteId = clicked.properties?.halte_id as string | undefined;
        const match = dataRef.current?.features.find((f) => f.properties.halte_id === halteId);
        if (match) onSelectRef.current?.(match);
      });

      map.on("click", REPORT_MARKER_LAYER_ID, (e: maplibregl.MapLayerMouseEvent) => {
        const clicked = e.features?.[0];
        if (!clicked || clicked.geometry.type !== "Point") return;

        const halteId = clicked.properties?.halte_id as string | undefined;
        const match = dataRef.current?.features.find((f) => f.properties.halte_id === halteId);
        if (match) onSelectRef.current?.(match);
      });

      updateReportMarkers();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  useEffect(() => {
    visibleRef.current = visible;
    if (map.getLayer(POINT_LAYER_ID)) {
      map.setLayoutProperty(POINT_LAYER_ID, "visibility", visible ? "visible" : "none");
    }
    if (map.getLayer(REPORT_MARKER_LAYER_ID)) {
      map.setLayoutProperty(REPORT_MARKER_LAYER_ID, "visibility", visible ? "visible" : "none");
    }
  }, [map, visible]);

  useEffect(() => {
    reportedStatusRef.current = reportedHalteStatus;
    updateReportMarkers();
  }, [reportedHalteStatus, updateReportMarkers]);

  useEffect(() => {
    filterRef.current = conditionFilter;
    const source = map.getSource(SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
    if (!source || !dataRef.current) return;
    source.setData(filterByCondition(dataRef.current, conditionFilter) as never);
  }, [map, conditionFilter]);

  return null;
}
