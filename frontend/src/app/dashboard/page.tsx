"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

import { DEFAULT_CENTER, DEFAULT_ZOOM, mapStyleUrl } from "@/lib/maplibre";
import { fetchHalteData } from "@/lib/fetchHalteData";
import { fetchCommunityReports } from "@/lib/fetchCommunityReports";
import HalteLayer from "@/components/map/HalteLayer";
import CommunityMapsLayer from "@/components/map/CommunityMapsLayer";
import PopulationLayer from "@/components/dashboard/PopulationLayer";
import IsochroneLayer from "@/components/dashboard/IsochroneLayer";
import ThermalLayer from "@/components/dashboard/ThermalLayer";
import AppHeader from "@/components/ui/AppHeader";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import DashboardFilterPanel from "@/components/dashboard/DashboardFilterPanel";
import DashboardLegend from "@/components/dashboard/DashboardLegend";
import MapControls from "@/components/dashboard/MapControls";
import PriorityList from "@/components/dashboard/PriorityList";
import VerificationSummary from "@/components/dashboard/VerificationSummary";
import DispatchModal from "@/components/dashboard/DispatchModal";
import HalteDetailModal from "@/components/dashboard/HalteDetailModal";
import {
  InfrastructureAiModal,
  AnalyticsModal,
  ReportsModal,
  HelpModal,
  SettingsModal,
} from "@/components/dashboard/DSSInfoModals";
import type { HalteFeature } from "@/types/halte";

interface ToastInfo {
  id: string;
  type: "success" | "info" | "alert";
  title: string;
  message: string;
}

export default function DashboardPage() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [map, setMap] = useState<maplibregl.Map | null>(null);

  // Spatial Filters State (Matching Mockup Defaults)
  const [densityVisible, setDensityVisible] = useState(true);
  const [blankSpotsVisible, setBlankSpotsVisible] = useState(true);
  const [thermalVisible, setThermalVisible] = useState(false);
  const [aiHeatmapVisible, setAiHeatmapVisible] = useState(true);
  const [filterPanelOpen, setFilterPanelOpen] = useState(true);

  // Data & Feature State
  const [halteFeatures, setHalteFeatures] = useState<HalteFeature[]>([]);
  const [verifiedCount, setVerifiedCount] = useState<number | null>(null);

  // Interactive Modals & Analysis State
  const [activeTab, setActiveTab] = useState("map");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [dispatchTarget, setDispatchTarget] = useState<HalteFeature | null>(null);
  const [detailTarget, setDetailTarget] = useState<HalteFeature | null>(null);
  const [activeModal, setActiveModal] = useState<
    "infrastructure-ai" | "analytics" | "reports" | "help" | "settings" | null
  >(null);
  const [toast, setToast] = useState<ToastInfo | null>(null);

  const showToast = useCallback((type: "success" | "info" | "alert", title: string, message: string) => {
    setToast({ id: Date.now().toString(), type, title, message });
    setTimeout(() => setToast(null), 4500);
  }, []);

  useEffect(() => {
    fetchHalteData().then((data) => setHalteFeatures(data.features));
    fetchCommunityReports().then((data) =>
      setVerifiedCount(data.features.filter((f) => f.properties.verification_status === "verified").length),
    );
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

  const runSpatialAnalysis = useCallback(() => {
    setIsAnalyzing(true);
    showToast("info", "Menjalankan Analisis Spasial", "Memproses AHP Multi-Criteria & Location Allocation di Kecamatan Tembalang...");

    setTimeout(() => {
      setIsAnalyzing(false);
      setDensityVisible(true);
      setBlankSpotsVisible(true);
      setAiHeatmapVisible(true);
      map?.flyTo({ center: [110.455, -7.050], zoom: 14 });
      showToast(
        "success",
        "Analisis Spasial Selesai",
        "3 Kandidat Halte & 4 Koridor Blank Spot di Tembalang berhasil dihitung dan diprioritaskan!"
      );
    }, 1400);
  }, [map, showToast]);

  const handleTabChange = useCallback((tab: string) => {
    if (tab === "map") {
      setActiveTab("map");
    } else if (tab === "infrastructure-ai" || tab === "analytics" || tab === "reports") {
      setActiveModal(tab);
    }
  }, []);

  const handleConfirmDispatch = useCallback(
    (details: { halteName: string; team: string; priority: string; notes: string }) => {
      showToast(
        "success",
        "Tim Berhasil Ditugaskan!",
        `${details.team} telah dijadwalkan menuju ${details.halteName} (${details.priority}).`
      );
    },
    [showToast],
  );

  return (
    <div className="flex h-screen flex-col overflow-hidden font-sans">
      {/* Top Navigation Bar */}
      <AppHeader
        active="dashboard"
        searchFeatures={halteFeatures}
        onSearchSelect={flyToHalte}
        onOpenHelp={() => setActiveModal("help")}
        onOpenSettings={() => setActiveModal("settings")}
      />

      <div className="relative flex flex-1 overflow-hidden">
        {/* Left Navigation Sidebar */}
        <DashboardSidebar
          activeTab={activeTab}
          onTabChange={handleTabChange}
          onRunSpatialAnalysis={runSpatialAnalysis}
          isAnalyzing={isAnalyzing}
          onOpenSupport={() => setActiveModal("help")}
          onSignOut={() => showToast("info", "Sesi Aktif", "Anda masuk sebagai Staf Perencanaan DISHUB Kota Semarang.")}
        />

        {/* Main Content Area (Map Canvas + Right Panel) */}
        <main className="relative flex flex-1 flex-col bg-surface-subtle md:flex-row">
          {/* Map Canvas */}
          <div className="relative z-10 flex-1">
            <div ref={containerRef} className="h-full w-full" />
            {map && (
              <>
                <IsochroneLayer map={map} visible={blankSpotsVisible} />
                <PopulationLayer map={map} visible={densityVisible} />
                <ThermalLayer map={map} visible={thermalVisible} />
                <HalteLayer map={map} visible={aiHeatmapVisible} />
                <CommunityMapsLayer map={map} visible={aiHeatmapVisible} />
                <MapControls
                  map={map}
                  panelOpen={filterPanelOpen}
                  onTogglePanel={() => setFilterPanelOpen((open) => !open)}
                />
              </>
            )}

            {/* AI Confidence Heatmap Legend (Bottom Right) */}
            <div className="absolute bottom-margin-page right-margin-page z-20">
              <DashboardLegend />
            </div>

            {/* Spatial Filters (Bottom Left) */}
            {filterPanelOpen && (
              <div className="absolute bottom-margin-page left-margin-page z-20">
                <DashboardFilterPanel
                  densityVisible={densityVisible}
                  onDensityChange={setDensityVisible}
                  blankSpotsVisible={blankSpotsVisible}
                  onBlankSpotsChange={setBlankSpotsVisible}
                  thermalVisible={thermalVisible}
                  onThermalChange={setThermalVisible}
                  aiHeatmapVisible={aiHeatmapVisible}
                  onAiHeatmapChange={setAiHeatmapVisible}
                />
              </div>
            )}
          </div>

          {/* Right Panel (Priority Actions & YOLOv8 Summary) */}
          <div className="z-30 flex h-full w-full flex-col border-l border-border-low bg-surface shadow-[-4px_0_16px_rgba(0,0,0,0.04)] md:w-[420px]">
            <div className="border-b border-border-low bg-surface-subtle p-gutter">
              <h2 className="font-headline-md text-headline-md text-on-surface">Priority Actions</h2>
              <p className="mt-1 font-label-sm text-label-sm text-on-surface-variant">
                AI-driven infrastructure recommendations
              </p>
            </div>

            {/* Scrollable Priority Action Cards */}
            <div className="flex-1 overflow-y-auto p-gutter">
              <PriorityList
                features={halteFeatures}
                onSelect={flyToHalte}
                onDispatch={(f) => setDispatchTarget(f)}
                onInspectDetail={(f) => setDetailTarget(f)}
              />
            </div>

            {/* YOLOv8 Detection Summary */}
            <VerificationSummary
              halteCount={halteFeatures.length}
              verifiedReportCount={verifiedCount}
              onOpenModelDetail={() => setActiveModal("infrastructure-ai")}
            />
          </div>
        </main>
      </div>

      {/* Interactive Modals */}
      <DispatchModal
        feature={dispatchTarget}
        onClose={() => setDispatchTarget(null)}
        onConfirmDispatch={handleConfirmDispatch}
      />

      <HalteDetailModal
        feature={detailTarget}
        onClose={() => setDetailTarget(null)}
        onDispatch={(f) => setDispatchTarget(f)}
        onFlyTo={flyToHalte}
      />

      <InfrastructureAiModal
        isOpen={activeModal === "infrastructure-ai"}
        onClose={() => setActiveModal(null)}
      />

      <AnalyticsModal
        isOpen={activeModal === "analytics"}
        onClose={() => setActiveModal(null)}
      />

      <ReportsModal
        isOpen={activeModal === "reports"}
        onClose={() => setActiveModal(null)}
      />

      <HelpModal
        isOpen={activeModal === "help"}
        onClose={() => setActiveModal(null)}
      />

      <SettingsModal
        isOpen={activeModal === "settings"}
        onClose={() => setActiveModal(null)}
      />

      {/* Floating Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl border border-border-low bg-surface/95 px-4 py-3 shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom-5 duration-200 max-w-md">
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
              toast.type === "success"
                ? "bg-safety-green/10 text-safety-green"
                : toast.type === "alert"
                ? "bg-alert-red/10 text-alert-red"
                : "bg-transport-blue/10 text-transport-blue"
            }`}
          >
            <span className="material-symbols-outlined text-[22px]">
              {toast.type === "success" ? "check_circle" : toast.type === "alert" ? "warning" : "info"}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-label-md text-label-md font-bold text-on-surface">{toast.title}</div>
            <div className="font-body-md text-[12px] text-on-surface-variant leading-snug">{toast.message}</div>
          </div>
          <button
            onClick={() => setToast(null)}
            className="text-on-surface-variant hover:text-on-surface p-1 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      )}
    </div>
  );
}

