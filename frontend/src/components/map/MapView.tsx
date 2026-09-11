"use client";

import { useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

import { DEFAULT_CENTER, DEFAULT_ZOOM, mapStyleUrl } from "@/lib/maplibre";
import HalteLayer from "@/components/map/HalteLayer";
import BrtRoutesLayer, { BrtRoutesLegend } from "@/components/map/BrtRoutesLayer";
import ConditionLegend from "@/components/map/ConditionLegend";
import AppHeader from "@/components/ui/AppHeader";
import SafeRouteWidget from "@/components/map/SafeRouteWidget";
import RouteToggleButton from "@/components/map/RouteToggleButton";
import ReportFormWidget from "@/components/map/ReportFormWidget";
import HaltePublicModal from "@/components/map/HaltePublicModal";
import ProfileFooter from "@/components/map/ProfileFooter";
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
 *
 * Two things sit under the survey markers: the existing BRT corridors
 * (BrtRoutesLayer -- context, so a citizen can see which route a surveyed halte
 * is on) and the halte condition colours themselves.
 *
 * The corridors are now foldable, at the passenger's request: RouteToggleButton
 * sits with the other two map controls on the right and flips `routesVisible`.
 * That single flag drives the layer, the button's own on/off appearance, and
 * the corridor legend, so the three can never contradict each other. It
 * defaults to visible -- corridors are context for the survey, so they should
 * be there on first load rather than waiting to be discovered.
 *
 * Note there is deliberately no MAPID_API_KEY gate on map init any more. The
 * style function in lib/maplibre.ts falls back to OpenStreetMap tiles when the
 * key is absent, but this component used to return before constructing the map
 * whenever the key was empty -- which made that fallback unreachable and left
 * the whole page a grey void behind an error banner. The dashboard never had
 * that gate.
 */
export default function MapView() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [map, setMap] = useState<maplibregl.Map | null>(null);
  const [detailTarget, setDetailTarget] = useState<HalteFeature | null>(null);
  // Owned here rather than inside BrtRoutesLayer: the toggle button, the layer
  // and the corridor legend all read it, so it has to live above all three.
  const [routesVisible, setRoutesVisible] = useState(true);

  useEffect(() => {
    if (!containerRef.current) return;

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
        {/* Corridors render before the survey markers so the natural order is
            already correct; BrtRoutesLayer additionally moves itself beneath
            HALTE_POINT_LAYER_ID because the two fetches race. */}
        {map && <BrtRoutesLayer map={map} visible={routesVisible} />}
        {map && <HalteLayer map={map} visible onSelect={setDetailTarget} />}

        {map && (
          <div className="absolute right-margin-page top-1/2 z-20 flex -translate-y-1/2 flex-col gap-3">
            <ReportFormWidget />
            <SafeRouteWidget map={map} />
            <RouteToggleButton
              visible={routesVisible}
              onToggle={() => setRoutesVisible((v) => !v)}
            />
          </div>
        )}

        <div className="absolute left-margin-page top-margin-page z-20 flex flex-col gap-2">
          <ConditionLegend />
          {/* The corridor legend follows the corridors: leaving it up while the
              lines are folded away would explain something not on the map. */}
          {routesVisible && <BrtRoutesLegend />}
        </div>
      </main>

      <ProfileFooter />

      <HaltePublicModal feature={detailTarget} onClose={() => setDetailTarget(null)} map={map ?? undefined} />
    </div>
  );
}
