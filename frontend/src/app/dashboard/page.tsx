"use client";

import { useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

import { DEFAULT_CENTER, DEFAULT_ZOOM, MAPID_API_KEY, mapStyleUrl } from "@/lib/maplibre";
import { fetchHalteData } from "@/lib/fetchHalteData";
import { fetchCommunityReports } from "@/lib/fetchCommunityReports";
import HalteLayer from "@/components/map/HalteLayer";
import CommunityMapsLayer from "@/components/map/CommunityMapsLayer";
import PopulationLayer from "@/components/dashboard/PopulationLayer";
import IsochroneLayer from "@/components/dashboard/IsochroneLayer";
import AppHeader from "@/components/ui/AppHeader";
import DashboardGuide from "@/components/dashboard/DashboardGuide";
import DashboardFilterPanel from "@/components/dashboard/DashboardFilterPanel";
import DashboardLegend from "@/components/dashboard/DashboardLegend";
import PriorityList from "@/components/dashboard/PriorityList";
import VerificationSummary from "@/components/dashboard/VerificationSummary";
import type { HalteFeature } from "@/types/halte";

export default function DashboardPage() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [map, setMap] = useState<maplibregl.Map | null>(null);

  const [densityVisible, setDensityVisible] = useState(true);
  const [halteVisible, setHalteVisible] = useState(true);
  const [reportsVisible, setReportsVisible] = useState(false);
  const [isochroneVisible, setIsochroneVisible] = useState(false);

  const [halteFeatures, setHalteFeatures] = useState<HalteFeature[]>([]);
  const [verifiedCount, setVerifiedCount] = useState<number | null>(null);

  useEffect(() => {
    fetchHalteData().then((data) => setHalteFeatures(data.features));
    fetchCommunityReports().then((data) =>
      setVerifiedCount(data.features.filter((f) => f.properties.verification_status === "verified").length),
    );
  }, []);

  useEffect(() => {
    if (!containerRef.current || !MAPID_API_KEY) return;

    maplibregl.setWorkerUrl("/maplibre-gl-worker.mjs");

    const instance = new maplibregl.Map({
      container: containerRef.current,
      style: mapStyleUrl(),
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
    });
    instance.addControl(new maplibregl.NavigationControl(), "top-right");
    instance.on("load", () => setMap(instance));

    return () => {
      instance.remove();
      setMap(null);
    };
  }, []);

  function flyToHalte(feature: HalteFeature) {
    map?.flyTo({ center: feature.geometry.coordinates, zoom: 16 });
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden font-sans">
      <AppHeader active="dashboard" />

      <div className="relative flex flex-1 overflow-hidden">
        <DashboardGuide />

        <main className="relative flex flex-1 flex-col bg-surface-subtle md:flex-row">
          {/* Map Canvas */}
          <div className="relative z-10 flex-1">
            <div ref={containerRef} className="h-full w-full" />
            {map && (
              <>
                <IsochroneLayer map={map} visible={isochroneVisible} />
                <PopulationLayer map={map} visible={densityVisible} />
                <HalteLayer map={map} visible={halteVisible} />
                <CommunityMapsLayer map={map} visible={reportsVisible} />
              </>
            )}
            {!MAPID_API_KEY && (
              <div className="absolute left-margin-page top-margin-page z-20 rounded-lg bg-error-container px-stack-md py-stack-sm text-label-md text-on-error-container">
                NEXT_PUBLIC_MAPID_API_KEY belum diisi di frontend/.env.local
              </div>
            )}

            <div className="absolute bottom-margin-page right-margin-page z-20">
              <DashboardLegend />
            </div>
            <div className="absolute bottom-margin-page left-margin-page z-20">
              <DashboardFilterPanel
                densityVisible={densityVisible}
                onDensityChange={setDensityVisible}
                halteVisible={halteVisible}
                onHalteChange={setHalteVisible}
                reportsVisible={reportsVisible}
                onReportsChange={setReportsVisible}
                isochroneVisible={isochroneVisible}
                onIsochroneChange={setIsochroneVisible}
              />
            </div>
          </div>

          {/* Right Panel (Actionable Data) */}
          <div className="z-30 flex h-full w-full flex-col border-l border-border-low bg-surface shadow-[-4px_0_16px_rgba(0,0,0,0.04)] md:w-[420px]">
            <div className="border-b border-border-low bg-surface-subtle p-gutter">
              <h2 className="text-headline-md text-on-surface">Prioritas Perbaikan</h2>
              <p className="mt-1 text-label-sm text-on-surface-variant">
                Rekomendasi berbasis skor kondisi hasil survei (bukan hasil AI — lihat catatan di bawah)
              </p>
            </div>

            <div className="flex-1 overflow-y-auto p-gutter">
              <PriorityList features={halteFeatures} onSelect={flyToHalte} />
            </div>

            <VerificationSummary halteCount={halteFeatures.length} verifiedReportCount={verifiedCount} />
          </div>
        </main>
      </div>
    </div>
  );
}
