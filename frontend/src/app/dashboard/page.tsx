"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

import { DEFAULT_CENTER, DEFAULT_ZOOM, mapStyleUrl } from "@/lib/maplibre";
import { fetchHalteData } from "@/lib/fetchHalteData";
import BusStopLayer from "@/components/dashboard/BusStopLayer";
import CommunityMapsLayer, { type ReportConditionFilter } from "@/components/map/CommunityMapsLayer";
import PopulationLayer from "@/components/dashboard/PopulationLayer";
import IsochroneLayer from "@/components/dashboard/IsochroneLayer";
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
  const [reportsVisible, setReportsVisible] = useState(false);
  // Starts on the worst condition -- that is the subset DISHUB triages first,
  // and it keeps the initial view readable instead of dropping all 42 sample
  // reports on the map at once.
  const [reportFilter, setReportFilter] = useState<ReportConditionFilter>("red");
  const [isochroneVisible, setIsochroneVisible] = useState(false);
  const [recommendationsVisible, setRecommendationsVisible] = useState(false);

  const [halteFeatures, setHalteFeatures] = useState<HalteFeature[]>([]);
  const [detailTarget, setDetailTarget] = useState<HalteFeature | null>(null);

  useEffect(() => {
    fetchHalteData().then((data) => setHalteFeatures(data.features));
  }, []);

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

  // These sample "citizen reports" are the team's own survey points
  // (report_id === halte_id), so a click opens the full survey detail
  // rather than the lighter report popup used on the public map.
  const openSurveyDetail = useCallback(
    (reportId: string) => {
      const match = halteFeatures.find((f) => f.properties.halte_id === reportId);
      if (match) setDetailTarget(match);
    },
    [halteFeatures],
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
    <div className="flex h-screen flex-col overflow-hidden font-sans">
      <AppHeader active="dashboard" searchFeatures={halteFeatures} onSearchSelect={flyToHalte} />

      <div className="relative flex flex-1 overflow-hidden">
        <DashboardSidebar
          densityVisible={densityVisible}
          onDensityChange={setDensityVisible}
          busStopsVisible={busStopsVisible}
          onBusStopsChange={setBusStopsVisible}
          reportsVisible={reportsVisible}
          onReportsChange={setReportsVisible}
          reportFilter={reportFilter}
          onReportFilterChange={setReportFilter}
          isochroneVisible={isochroneVisible}
          onIsochroneChange={setIsochroneVisible}
          recommendationsVisible={recommendationsVisible}
          onRecommendationsChange={setRecommendationsVisible}
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
              <BusStopLayer map={map} visible={busStopsVisible} />
              <CommunityMapsLayer
                map={map}
                visible={reportsVisible}
                conditionFilter={reportFilter}
                onSelect={openSurveyDetail}
              />
              <RecommendationLayer map={map} visible={recommendationsVisible} />
              <MapInfoPopup map={map} />
              <MapControls map={map} />
              <ChatWidget onRecommendations={handleChatRecommendations} />
            </>
          )}
        </main>
      </div>

      <HalteDetailModal feature={detailTarget} onClose={() => setDetailTarget(null)} />
    </div>
  );
}
