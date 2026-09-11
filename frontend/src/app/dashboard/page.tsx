"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

import { DEFAULT_CENTER, DEFAULT_ZOOM, mapStyleUrl } from "@/lib/maplibre";
import { fetchHalteData } from "@/lib/fetchHalteData";
import { fetchAllCitizenReports } from "@/lib/fetchCitizenReports";
import { fetchTasks } from "@/lib/fetchTasks";
import BusStopLayer, { type HalteConditionFilter, type ReportMarkerStatus } from "@/components/dashboard/BusStopLayer";
import PopulationLayer from "@/components/dashboard/PopulationLayer";
import IsochroneLayer from "@/components/dashboard/IsochroneLayer";
import BrtLayer from "@/components/dashboard/BrtLayer";
import RecommendationLayer from "@/components/dashboard/RecommendationLayer";
import MapInfoPopup from "@/components/dashboard/MapInfoPopup";
import ChatWidget from "@/components/dashboard/ChatWidget";
import AppHeader from "@/components/ui/AppHeader";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import MapControls from "@/components/dashboard/MapControls";
import HalteDetailModal from "@/components/dashboard/HalteDetailModal";
import type { HalteFeature } from "@/types/halte";

export default function DashboardPage() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [map, setMap] = useState<maplibregl.Map | null>(null);

  const [densityVisible, setDensityVisible] = useState(true);
  const [busStopsVisible, setBusStopsVisible] = useState(true);
  const [conditionFilter, setConditionFilter] = useState<HalteConditionFilter>("all");
  const [isochroneVisible, setIsochroneVisible] = useState(false);
  const [recommendationsVisible, setRecommendationsVisible] = useState(false);
  // On by default: it is the context the team's own 42 points sit in, and a
  // layer nobody switches on is a layer nobody can tell is working.
  const [brtVisible, setBrtVisible] = useState(true);

  const [halteFeatures, setHalteFeatures] = useState<HalteFeature[]>([]);
  const [detailTarget, setDetailTarget] = useState<HalteFeature | null>(null);
  const [reportedHalteStatus, setReportedHalteStatus] = useState<Map<string, ReportMarkerStatus>>(new Map());
  // Bumped after a manual facility correction so HalteLayer re-reads the
  // points and repaints the affected marker in its new condition colour.
  const [halteRefreshSignal, setHalteRefreshSignal] = useState(0);

  useEffect(() => {
    fetchHalteData().then((data) => setHalteFeatures(data.features));
  }, []);

  /**
   * A DISHUB correction rewrites the halte's own row (facility values, score,
   * label), so every copy of that feature has to move together: the header
   * search reads halteFeatures, the open modal reads detailTarget, and the map
   * layer fetches its own -- the latter via halteRefreshSignal.
   */
  const handleHalteUpdated = useCallback((updated: HalteFeature) => {
    setHalteFeatures((cur) =>
      cur.map((f) => (f.properties.halte_id === updated.properties.halte_id ? updated : f)),
    );
    setDetailTarget((cur) => (cur && cur.properties.halte_id === updated.properties.halte_id ? updated : cur));
    setHalteRefreshSignal((n) => n + 1);
  }, []);

  // Which halte need a report marker on the map, and what color: red for a
  // citizen report that's either brand new or dispatched but not yet
  // started (task "belum_dikerjakan"), orange once a technician has actually
  // started work (task "proses"). A task reaching "selesai" deletes its
  // citizen_report row server-side, so it naturally drops out of `reports`
  // here and the ring disappears -- no separate "done" case needed.
  // Refetched after dispatch/create-task actions (see handleTasksChanged)
  // and once more each time this page mounts, so a task marked "selesai"
  // from the separate /dashboard/tasks page is reflected next visit here.
  const refreshReportedHalteIds = useCallback(() => {
    Promise.all([fetchAllCitizenReports(), fetchTasks()])
      .then(([reports, tasks]) => {
        const taskByReportId = new Map(tasks.filter((t) => t.citizen_report_id).map((t) => [t.citizen_report_id!, t]));
        const next = new Map<string, ReportMarkerStatus>();
        for (const report of reports) {
          const task = taskByReportId.get(report.report_id);
          next.set(report.halte_id, task?.status === "proses" ? "proses" : "baru");
        }
        setReportedHalteStatus(next);
      })
      .catch(() => {
        // Non-critical -- the map marker just won't update this cycle.
      });
  }, []);

  useEffect(() => {
    refreshReportedHalteIds();
  }, [refreshReportedHalteIds]);

  useEffect(() => {
    if (!containerRef.current) return;

    maplibregl.setWorkerUrl("/maplibre-gl-worker.mjs");

    const instance = new maplibregl.Map({
      container: containerRef.current,
      style: mapStyleUrl(),
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
    });
    // No NavigationControl: MapControls renders the same actions in the
    // surface styling the rest of the dashboard uses.
    instance.on("load", () => setMap(instance));

    return () => {
      instance.remove();
      setMap(null);
    };
  }, []);

  const flyToHalte = useCallback(
    (feature: HalteFeature) => {
      map?.flyTo({ center: feature.geometry.coordinates, zoom: 16 });
      setDetailTarget(feature);
    },
    [map],
  );

  const handleChatRecommendations = useCallback(
    (coordinates: [number, number][]) => {
      setRecommendationsVisible(true);
      if (!map || coordinates.length === 0) return;
      const bounds = coordinates.reduce(
        (b, c) => b.extend(c),
        new maplibregl.LngLatBounds(coordinates[0], coordinates[0]),
      );
      map.fitBounds(bounds, { padding: 80, maxZoom: 15, duration: 800 });
    },
    [map],
  );

  return (
    <div className="flex h-dvh flex-col overflow-hidden font-sans">
      <AppHeader searchFeatures={halteFeatures} onSearchSelect={flyToHalte} homeHref="/dashboard" />

      <div className="relative flex flex-1 overflow-hidden">
        <DashboardSidebar
          densityVisible={densityVisible}
          onDensityChange={setDensityVisible}
          busStopsVisible={busStopsVisible}
          onBusStopsChange={setBusStopsVisible}
          conditionFilter={conditionFilter}
          onConditionFilterChange={setConditionFilter}
          isochroneVisible={isochroneVisible}
          onIsochroneChange={setIsochroneVisible}
          recommendationsVisible={recommendationsVisible}
          onRecommendationsChange={setRecommendationsVisible}
          brtVisible={brtVisible}
          onBrtChange={setBrtVisible}
        />

        {/* Map canvas -- deliberately free of overlays now. Layer toggles
            and the legend used to float here as separate cards; both moved
            into DashboardSidebar so this area stays clear. */}
        <main className="relative flex-1 bg-surface-subtle">
          <div ref={containerRef} className="h-full w-full" />
          {map && (
            <>
              <IsochroneLayer map={map} visible={isochroneVisible} />
              <PopulationLayer map={map} visible={densityVisible} />
              {/* Rendered before BusStopLayer so the survey points stay the
                  dominant marks; BrtLayer also moves itself underneath once
                  mounted, since fetch order is not guaranteed. */}
              <BrtLayer map={map} visible={brtVisible} />
              <BusStopLayer
                map={map}
                visible={busStopsVisible}
                conditionFilter={conditionFilter}
                onSelect={setDetailTarget}
                reportedHalteStatus={reportedHalteStatus}
                refreshSignal={halteRefreshSignal}
              />
              <RecommendationLayer map={map} visible={recommendationsVisible} />
              <MapInfoPopup map={map} />
              <MapControls map={map} />
              <ChatWidget onRecommendations={handleChatRecommendations} />
            </>
          )}
        </main>
      </div>

      <HalteDetailModal
        feature={detailTarget}
        onClose={() => setDetailTarget(null)}
        onTasksChanged={refreshReportedHalteIds}
        onHalteUpdated={handleHalteUpdated}
      />
    </div>
  );
}
