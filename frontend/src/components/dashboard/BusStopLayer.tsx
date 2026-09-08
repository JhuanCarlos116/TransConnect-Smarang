"use client";

import { useEffect, useRef } from "react";
import * as maplibregl from "maplibre-gl";

import { fetchHalteData } from "@/lib/fetchHalteData";
import type { ConditionLabel, HalteFeature, HalteFeatureCollection } from "@/types/halte";

export type HalteConditionFilter = ConditionLabel | "all";

const SOURCE_ID = "bus-stops";
export const BUS_STOP_POINT_LAYER_ID = "bus-stops-points";
const POINT_LAYER_ID = BUS_STOP_POINT_LAYER_ID;

interface BusStopLayerProps {
  map: maplibregl.Map;
  visible: boolean;
  onSelect?: (feature: HalteFeature) => void;
  /** Which condition to show. Defaults to "all". See DashboardSidebar's filter button. */
  conditionFilter?: HalteConditionFilter;
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
export default function BusStopLayer({ map, visible, onSelect, conditionFilter = "all" }: BusStopLayerProps) {
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
    });
  }, [map]);

  useEffect(() => {
    visibleRef.current = visible;
    if (!map.getLayer(POINT_LAYER_ID)) return;
    map.setLayoutProperty(POINT_LAYER_ID, "visibility", visible ? "visible" : "none");
  }, [map, visible]);

  useEffect(() => {
    filterRef.current = conditionFilter;
    const source = map.getSource(SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
    if (!source || !dataRef.current) return;
    source.setData(filterByCondition(dataRef.current, conditionFilter) as never);
  }, [map, conditionFilter]);

  return null;
}
