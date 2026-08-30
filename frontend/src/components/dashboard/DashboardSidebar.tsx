"use client";

import Link from "next/link";

interface DashboardSidebarProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  onRunSpatialAnalysis: () => void;
  isAnalyzing?: boolean;
  onOpenSupport?: () => void;
  onSignOut?: () => void;
}

export default function DashboardSidebar({
  activeTab = "map",
  onTabChange,
  onRunSpatialAnalysis,
  isAnalyzing = false,
  onOpenSupport,
  onSignOut,
}: DashboardSidebarProps) {
  return (
    <nav className="bg-surface dark:bg-surface-dim docked left-0 h-full w-panel-width shrink-0 border-r border-border-low dark:border-outline-variant hidden md:flex flex-col z-40 overflow-y-auto">
      {/* Header */}
      <div className="p-gutter border-b border-border-low flex items-center gap-4">
        <div className="h-12 w-12 rounded bg-surface-container flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-transport-blue text-[24px]">shield</span>
        </div>
        <div>
          <h2 className="font-headline-md text-headline-md font-bold text-on-surface leading-tight">DSS Dashboard</h2>
          <p className="font-label-sm text-label-sm text-on-surface-variant">Semarang Urban Mobility</p>
        </div>
      </div>

      {/* Main Nav Links */}
      <div className="flex-1 py-4 flex flex-col gap-2 px-3">
        {/* Map View (Primary) */}
        <button
          onClick={() => onTabChange?.("map")}
          className={`flex items-center gap-3 px-4 py-3 rounded-lg font-bold transition-all text-left w-full cursor-pointer ${
            activeTab === "map"
              ? "bg-primary-fixed text-on-primary-fixed-variant"
              : "text-on-surface-variant hover:text-transport-blue hover:bg-surface-container-high"
          }`}
        >
          <span className="material-symbols-outlined" data-weight={activeTab === "map" ? "fill" : "regular"}>
            map
          </span>
          <span className="font-body-md text-body-md">Map View</span>
        </button>

        {/* Infrastructure AI */}
        <button
          onClick={() => onTabChange?.("infrastructure-ai")}
          className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-left w-full cursor-pointer ${
            activeTab === "infrastructure-ai"
              ? "bg-primary-fixed text-on-primary-fixed-variant font-bold"
              : "text-on-surface-variant dark:text-outline hover:text-transport-blue hover:bg-surface-container-high"
          }`}
        >
          <span className="material-symbols-outlined">analytics</span>
          <span className="font-body-md text-body-md">Infrastructure AI</span>
        </button>

        {/* Safe Transit (Links to Public Route Planner) */}
        <Link
          href="/"
          className="flex items-center gap-3 px-4 py-3 text-on-surface-variant dark:text-outline hover:text-transport-blue hover:bg-surface-container-high rounded-lg transition-all"
        >
          <span className="material-symbols-outlined">security</span>
          <span className="font-body-md text-body-md">Safe Transit</span>
        </Link>

        {/* Analytics */}
        <button
          onClick={() => onTabChange?.("analytics")}
          className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-left w-full cursor-pointer ${
            activeTab === "analytics"
              ? "bg-primary-fixed text-on-primary-fixed-variant font-bold"
              : "text-on-surface-variant dark:text-outline hover:text-transport-blue hover:bg-surface-container-high"
          }`}
        >
          <span className="material-symbols-outlined">bar_chart</span>
          <span className="font-body-md text-body-md">Analytics</span>
        </button>

        {/* Reports */}
        <button
          onClick={() => onTabChange?.("reports")}
          className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-left w-full cursor-pointer ${
            activeTab === "reports"
              ? "bg-primary-fixed text-on-primary-fixed-variant font-bold"
              : "text-on-surface-variant dark:text-outline hover:text-transport-blue hover:bg-surface-container-high"
          }`}
        >
          <span className="material-symbols-outlined">description</span>
          <span className="font-body-md text-body-md">Reports</span>
        </button>
      </div>

      {/* Big Action Button */}
      <div className="p-gutter">
        <button
          onClick={onRunSpatialAnalysis}
          disabled={isAnalyzing}
          className="w-full bg-transport-blue text-on-primary font-bold py-3 rounded-lg flex justify-center items-center gap-2 hover:bg-primary transition-colors active:scale-95 text-white shadow-md cursor-pointer disabled:opacity-75"
        >
          {isAnalyzing ? (
            <>
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
              <span className="font-label-md text-label-md">Menghitung Spasial...</span>
            </>
          ) : (
            <>
              <span className="material-symbols-outlined">play_arrow</span>
              <span className="font-label-md text-label-md">Run Spatial Analysis</span>
            </>
          )}
        </button>
      </div>

      {/* Footer Support & Sign Out */}
      <div className="border-t border-border-low p-4 flex flex-col gap-1">
        <button
          onClick={onOpenSupport}
          className="flex items-center gap-3 px-4 py-2 text-on-surface-variant hover:text-transport-blue rounded-lg transition-all text-left w-full cursor-pointer hover:bg-surface-container"
        >
          <span className="material-symbols-outlined text-[20px]">contact_support</span>
          <span className="font-label-md text-label-md">Support</span>
        </button>
        <button
          onClick={onSignOut}
          className="flex items-center gap-3 px-4 py-2 text-on-surface-variant hover:text-alert-red rounded-lg transition-all text-left w-full cursor-pointer hover:bg-surface-container"
        >
          <span className="material-symbols-outlined text-[20px]">logout</span>
          <span className="font-label-md text-label-md">Sign Out</span>
        </button>
      </div>
    </nav>
  );
}
