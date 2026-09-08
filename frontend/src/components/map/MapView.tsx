"use client";

import { useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

import { DEFAULT_CENTER, DEFAULT_ZOOM, MAPID_API_KEY, mapStyleUrl } from "@/lib/maplibre";
import HalteLayer from "@/components/map/HalteLayer";
import ConditionLegend from "@/components/map/ConditionLegend";
import AppHeader from "@/components/ui/AppHeader";
import SafeRouteWidget from "@/components/map/SafeRouteWidget";
import ReportFormWidget from "@/components/map/ReportFormWidget";
import HaltePublicModal from "@/components/map/HaltePublicModal";
import type { HalteFeature } from "@/types/halte";

/**
 * Public map, pared down to the two things the team asked to keep front and
 * center: seeing halte condition and the two action widgets (Safe Transit
 * Navigator, citizen report submission). The search bar, the public/dashboard
 * nav tabs, and the whole sidebar/mobile-sheet info panel (condition summary
 * cards, layer toggles, "Buka Dashboard DISHUB") are gone from this page --
 * DISHUB staff have their own dashboard at /dashboard; this page is citizen-
 * facing only now, so it doesn't need a way to route out to that internal
 * tool, and the halte layer has no toggle since there's nothing else to
 * choose between here.
 */
export default function MapView() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [map, setMap] = useState<maplibregl.Map | null>(null);
  const [detailTarget, setDetailTarget] = useState<HalteFeature | null>(null);

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
    <div className="flex h-dvh flex-col overflow-hidden font-sans">
      <AppHeader />

      <main className="relative flex-1">
        <div ref={containerRef} className="h-full w-full" />
        {map && <HalteLayer map={map} visible onSelect={setDetailTarget} />}

        {map && (
          <div className="absolute bottom-margin-page left-1/2 z-20 flex w-full max-w-md -translate-x-1/2 gap-3 px-margin-page">
            <SafeRouteWidget map={map} />
            <ReportFormWidget map={map} />
          </div>
        )}

        {!MAPID_API_KEY && (
          <div className="absolute left-margin-page top-margin-page z-20 rounded-lg bg-error-container px-stack-md py-stack-sm text-label-md text-on-error-container">
            NEXT_PUBLIC_MAPID_API_KEY belum diisi di frontend/.env.local
          </div>
        )}

        <div className="absolute left-margin-page top-margin-page z-20">
          <ConditionLegend />
        </div>
      </main>

      <HaltePublicModal feature={detailTarget} onClose={() => setDetailTarget(null)} />
    </div>
  );
}
