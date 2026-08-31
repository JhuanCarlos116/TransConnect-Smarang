"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

import { DEFAULT_CENTER, DEFAULT_ZOOM, mapStyleUrl } from "@/lib/maplibre";
import { fetchHalteData } from "@/lib/fetchHalteData";
import HalteLayer from "@/components/map/HalteLayer";
import CommunityMapsLayer from "@/components/map/CommunityMapsLayer";
import PopulationLayer from "@/components/dashboard/PopulationLayer";
import IsochroneLayer from "@/components/dashboard/IsochroneLayer";
import AppHeader from "@/components/ui/AppHeader";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import MapControls from "@/components/dashboard/MapControls";
import HalteDetailModal from "@/components/dashboard/HalteDetailModal";
import type { HalteFeature } from "@/types/halte";

export default function DashboardPage() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [map, setMap] = useState<maplibregl.Map | null>(null);

  const [densityVisible, setDensityVisible] = useState(true);
  const [halteVisible, setHalteVisible] = useState(true);
  const [reportsVisible, setReportsVisible] = useState(false);
  const [isochroneVisible, setIsochroneVisible] = useState(false);

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

  return (
    <div className="flex h-screen flex-col overflow-hidden font-sans">
      <AppHeader active="dashboard" searchFeatures={halteFeatures} onSearchSelect={flyToHalte} />

      <div className="relative flex flex-1 overflow-hidden">
        <DashboardSidebar
          densityVisible={densityVisible}
          onDensityChange={setDensityVisible}
          halteVisible={halteVisible}
          onHalteChange={setHalteVisible}
          reportsVisible={reportsVisible}
          onReportsChange={setReportsVisible}
          isochroneVisible={isochroneVisible}
          onIsochroneChange={setIsochroneVisible}
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
              <HalteLayer map={map} visible={halteVisible} onSelect={setDetailTarget} />
              <CommunityMapsLayer map={map} visible={reportsVisible} />
              <MapControls map={map} />
            </>
          )}
        </main>
      </div>

      <HalteDetailModal feature={detailTarget} onClose={() => setDetailTarget(null)} />
    </div>
  );
}
