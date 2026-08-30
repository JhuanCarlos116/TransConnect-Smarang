"use client";

import { useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

import { DEFAULT_CENTER, DEFAULT_ZOOM, MAPID_API_KEY, mapStyleUrl } from "@/lib/maplibre";
import { fetchHalteData } from "@/lib/fetchHalteData";
import { fetchCommunityReports } from "@/lib/fetchCommunityReports";
import HalteLayer from "@/components/map/HalteLayer";
import CommunityMapsLayer from "@/components/map/CommunityMapsLayer";
import ConditionLegend from "@/components/map/ConditionLegend";
import PublicHeader from "@/components/map/PublicHeader";
import PublicSidePanel from "@/components/map/PublicSidePanel";
import type { HalteFeature } from "@/types/halte";

export default function MapView() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [map, setMap] = useState<maplibregl.Map | null>(null);
  const [halteVisible, setHalteVisible] = useState(true);
  const [communityVisible, setCommunityVisible] = useState(false);

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

    // Bundlers (both Turbopack and Webpack) mis-resolve maplibre-gl's
    // internal `import.meta.url`-based worker lookup in this Next.js setup,
    // leaking the local disk path instead of a servable URL. Point it at the
    // worker file copied into public/ instead. See MapView.tsx history.
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

  return (
    <div className="flex h-screen flex-col overflow-hidden font-sans">
      <PublicHeader />

      <div className="relative flex flex-1 overflow-hidden">
        <PublicSidePanel
          features={halteFeatures}
          verifiedReportCount={verifiedCount}
          halteVisible={halteVisible}
          onHalteChange={setHalteVisible}
          communityVisible={communityVisible}
          onCommunityChange={setCommunityVisible}
        />

        <main className="relative flex-1">
          <div ref={containerRef} className="h-full w-full" />
          {map && (
            <>
              <HalteLayer map={map} visible={halteVisible} />
              <CommunityMapsLayer map={map} visible={communityVisible} />
            </>
          )}
          {!MAPID_API_KEY && (
            <div className="absolute left-margin-page top-margin-page z-20 rounded-lg bg-error-container px-stack-md py-stack-sm text-label-md text-on-error-container">
              NEXT_PUBLIC_MAPID_API_KEY belum diisi di frontend/.env.local
            </div>
          )}

          <div className="absolute bottom-margin-page right-margin-page z-20">
            <ConditionLegend />
          </div>
        </main>
      </div>
    </div>
  );
}
