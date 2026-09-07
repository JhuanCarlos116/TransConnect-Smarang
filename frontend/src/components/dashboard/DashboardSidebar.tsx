"use client";

import { useState } from "react";

import { conditionColor, conditionLabelText } from "@/lib/conditionScore";
import { densityGradientCss } from "@/lib/populationColor";
import DashboardNav from "@/components/dashboard/DashboardNav";
import type { ReportConditionFilter } from "@/components/map/CommunityMapsLayer";

const ISOCHRONE_BANDS = [
  { minutes: 3, opacity: 0.28 },
  { minutes: 5, opacity: 0.18 },
  { minutes: 10, opacity: 0.1 },
];

// Cycle order for the report filter button: worst condition first, since
// that is what DISHUB triages on, then widening to everything.
const REPORT_FILTER_CYCLE: ReportConditionFilter[] = ["red", "yellow", "green", "all"];

function reportFilterLabel(filter: ReportConditionFilter): string {
  return filter === "all" ? "Semua" : conditionLabelText(filter);
}

function reportFilterColor(filter: ReportConditionFilter): string | null {
  return filter === "all" ? null : conditionColor(filter);
}

interface LayerToggleRowProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

function LayerToggleRow({ label, checked, onChange }: LayerToggleRowProps) {
  return (
    <label className="flex cursor-pointer items-center gap-2">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="rounded border-outline text-transport-blue focus:ring-transport-blue"
      />
      <span className="font-label-sm text-label-sm text-on-surface">{label}</span>
    </label>
  );
}

interface DashboardSidebarProps {
  densityVisible: boolean;
  onDensityChange: (v: boolean) => void;
  busStopsVisible: boolean;
  onBusStopsChange: (v: boolean) => void;
  reportsVisible: boolean;
  onReportsChange: (v: boolean) => void;
  reportFilter: ReportConditionFilter;
  onReportFilterChange: (v: ReportConditionFilter) => void;
  isochroneVisible: boolean;
  onIsochroneChange: (v: boolean) => void;
  recommendationsVisible: boolean;
  onRecommendationsChange: (v: boolean) => void;
}

/**
 * Left column, styled after the mockup's SideNavBar. Layer toggles and the
 * legend used to float as separate cards over the map (DashboardFilterPanel,
 * DashboardLegend); both are folded in here instead so the map stays clear
 * of overlays and everything controlling/explaining it lives in one place.
 *
 * An earlier pass wired this to five destinations (Infrastructure AI,
 * Analytics, Reports, plus Support/Sign Out) that opened modals full of
 * invented numbers, or a toast claiming a fake login session. None of that
 * was real. The two nav items here now (Map View, Tugas Perbaikan) are the
 * first genuinely real destinations since -- Policy & Task Dispatcher
 * Dashboard is an actual CRUD workflow, not a fabricated stand-in. It used
 * to also link out to the public map, but this is DISHUB's internal tool --
 * a staff workflow has no reason to be routed from here to the
 * citizen-facing page, so that link is gone (from the header tabs too, see
 * AppHeader).
 * "Run Spatial Analysis" also previously simulated a computation with
 * setTimeout and reported fabricated results ("3 Kandidat Halte... berhasil
 * dihitung"); replaced with a real reset-camera-and-toggles button for a
 * while, then removed outright at the user's request rather than kept
 * around as an icon-only affordance.
 *
 * "Layer Peta" is a collapsible drawer (closed removes the toggles from the
 * DOM entirely, not just visually) rather than always-open -- each row's
 * one-line hint text ("42 titik, skor kondisi" etc.) is gone too, on the
 * same request: keep the layer name, drop the explanatory copy under it.
 *
 * Legends are tied to their layer rather than always on: each block only
 * renders while its layer is switched on, and the whole legend section
 * disappears when every layer is off. The condition scale in particular used
 * to sit here permanently; it is now carried by the report filter button
 * instead, which both states and controls which condition is on the map.
 */
export default function DashboardSidebar({
  densityVisible,
  onDensityChange,
  busStopsVisible,
  onBusStopsChange,
  reportsVisible,
  onReportsChange,
  reportFilter,
  onReportFilterChange,
  isochroneVisible,
  onIsochroneChange,
  recommendationsVisible,
  onRecommendationsChange,
}: DashboardSidebarProps) {
  const [layersOpen, setLayersOpen] = useState(true);
  const filterDotColor = reportFilterColor(reportFilter);
  const showLegend = busStopsVisible || densityVisible || isochroneVisible || recommendationsVisible;

  function cycleReportFilter() {
    const next = REPORT_FILTER_CYCLE[(REPORT_FILTER_CYCLE.indexOf(reportFilter) + 1) % REPORT_FILTER_CYCLE.length];
    onReportFilterChange(next);
  }

  return (
    <nav className="z-40 hidden h-full w-panel-width shrink-0 flex-col overflow-y-auto scrollbar-hide border-r border-border-low bg-surface md:flex">
      <DashboardNav />

      <div className="border-t border-border-low p-gutter">
        <button
          onClick={() => setLayersOpen((open) => !open)}
          aria-expanded={layersOpen}
          className="flex w-full items-center justify-between font-label-md text-label-md font-bold text-on-surface"
        >
          Layer Peta
          <span
            className={`material-symbols-outlined text-[18px] text-on-surface-variant transition-transform ${layersOpen ? "rotate-180" : ""}`}
          >
            expand_more
          </span>
        </button>
        {layersOpen && (
          <div className="mt-3 flex flex-col gap-3">
            <LayerToggleRow label="Titik Bus Stop / Halte" checked={busStopsVisible} onChange={onBusStopsChange} />
            <LayerToggleRow label="Kepadatan Penduduk" checked={densityVisible} onChange={onDensityChange} />
            <LayerToggleRow label="Jangkauan Jalan Kaki" checked={isochroneVisible} onChange={onIsochroneChange} />
            <div className="flex flex-col gap-2">
              <LayerToggleRow label="Laporan Warga" checked={reportsVisible} onChange={onReportsChange} />
              {reportsVisible && (
                <button
                  onClick={cycleReportFilter}
                  aria-label={`Filter laporan: ${reportFilterLabel(reportFilter)}. Klik untuk ganti.`}
                  className="ml-6 flex w-fit items-center gap-2 rounded-full border border-border-low bg-surface-container px-2.5 py-1 font-label-sm text-label-sm text-on-surface transition-colors hover:border-transport-blue hover:text-transport-blue"
                >
                  <span className="material-symbols-outlined text-[14px] text-on-surface-variant">filter_alt</span>
                  {filterDotColor && (
                    <span
                      className="inline-block h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: filterDotColor }}
                    />
                  )}
                  {reportFilterLabel(reportFilter)}
                </button>
              )}
            </div>
            <LayerToggleRow
              label="Rekomendasi Halte Baru"
              checked={recommendationsVisible}
              onChange={onRecommendationsChange}
            />
          </div>
        )}
      </div>

      {showLegend && (
        <div className="flex flex-col gap-3 border-t border-border-low p-gutter">
          {busStopsVisible && (
            <div>
              <h3 className="mb-2 font-label-sm text-label-sm font-bold text-on-surface">Titik Bus Stop / Halte</h3>
              <div className="flex items-center gap-2">
                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: "#546e7a" }} />
                <span className="font-label-sm text-label-sm text-on-surface-variant">
                  Inventaris, belum disurvei
                </span>
              </div>
            </div>
          )}

          {densityVisible && (
            <div>
              <h3 className="mb-1 font-label-sm text-label-sm font-bold text-on-surface">Kepadatan Penduduk</h3>
              <div className="mb-1 h-2 w-full rounded-full" style={{ background: densityGradientCss() }} />
              <div className="flex justify-between font-label-sm text-[10px] uppercase tracking-wider text-on-surface-variant">
                <span>Rendah</span>
                <span>Tinggi</span>
              </div>
            </div>
          )}

          {isochroneVisible && (
            <div>
              <h3 className="mb-1 font-label-sm text-label-sm font-bold text-on-surface">Jangkauan Jalan Kaki</h3>
              {ISOCHRONE_BANDS.map((band) => (
                <div key={band.minutes} className="flex items-center gap-2">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full bg-transport-blue"
                    style={{ opacity: band.opacity }}
                  />
                  <span className="font-label-sm text-label-sm text-on-surface-variant">{band.minutes} menit</span>
                </div>
              ))}
            </div>
          )}

          {recommendationsVisible && (
            <div>
              <h3 className="mb-1 font-label-sm text-label-sm font-bold text-on-surface">Rekomendasi Halte Baru</h3>
              <div className="flex items-center gap-2">
                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: "#f59e0b" }} />
                <span className="font-label-sm text-label-sm text-on-surface-variant">
                  Hasil Location Allocation Model
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
