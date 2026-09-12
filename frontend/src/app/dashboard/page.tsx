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
  // Corridor tags reported by BrtLayer once it has styled them, so the sidebar
  // legend and the map lines come from one ordering (see CorridorLegendRows).
  const [koridors, setKoridors] = useState<string[]>([]);

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

  // Which halte need a report marker on the map, and what color: red for
  // "not started yet" (a citizen report with no task, or a task still
  // "belum_dikerjakan"), orange once a technician has actually started work
  // (task "proses"), purple if the task is "selesai" but the technician's
  // proposed facility changes haven't been reviewed yet (see
  // approve-facility-update in routers/task.py) -- the halte shouldn't
  // silently vanish from the map just because a dispatcher moved the task's
  // column while its facility data is still unconfirmed. A "selesai" task
  // with nothing pending (or one dispatched from a citizen report, whose
  // report row is deleted at that point) drops out of `reports`/here as
  // before, since there's genuinely nothing left to flag.
  // Sourced from tasks first (keyed by halte_id directly, not
  // citizen_report_id) so a manually dispatched task -- one with no citizen
  // report behind it, created via TaskCreateSection rather than dispatched
  // from a report -- gets the same ring a citizen-report-linked task does;
  // it used to be invisible here because this only ever iterated `reports`.
  // Raw, undispatched reports are folded in afterwards for any halte a task
  // doesn't already cover.
  // Refetched after dispatch/create-task actions (see handleTasksChanged)
  // and once more each time this page mounts, so a task marked "selesai"
  // from the separate /dashboard/tasks page is reflected next visit here.
  const refreshReportedHalteIds = useCallback(() => {
    Promise.all([fetchAllCitizenReports(), fetchTasks()])
      .then(([reports, tasks]) => {
        const next = new Map<string, ReportMarkerStatus>();
        for (const report of reports) {
          next.set(report.halte_id, "baru");
        }
        for (const task of tasks) {
          if (task.status === "selesai") {
            const hasPendingFacilityUpdate =
              task.facility_updates &&
              Object.keys(task.facility_updates).length > 0 &&
              !task.facility_updates_approved;
            if (hasPendingFacilityUpdate) next.set(task.halte_id, "menunggu_approval");
            continue;
          }
          next.set(task.halte_id, task.status === "proses" ? "proses" : "baru");
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
          koridors={koridors}
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
              <BrtLayer map={map} visible={brtVisible} onCorridors={setKoridors} />
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
