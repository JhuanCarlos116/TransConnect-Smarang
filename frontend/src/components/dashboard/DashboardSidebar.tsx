"use client";

import { useState } from "react";

import { conditionColor, conditionLabelText } from "@/lib/conditionScore";
import { densityGradientCss } from "@/lib/populationColor";
import DashboardNav from "@/components/dashboard/DashboardNav";
import CorridorLegendRows from "@/components/ui/CorridorLegendRows";
import type { HalteConditionFilter } from "@/components/dashboard/BusStopLayer";

const ISOCHRONE_BANDS = [
  { minutes: 3, opacity: 0.28 },
  { minutes: 5, opacity: 0.18 },
  { minutes: 10, opacity: 0.1 },
];

// Cycle order for the condition filter button: worst condition first, since
// that is what DISHUB triages on, then widening to everything.
const CONDITION_FILTER_CYCLE: HalteConditionFilter[] = ["red", "yellow", "green", "all"];

function conditionFilterLabel(filter: HalteConditionFilter): string {
  return filter === "all" ? "Semua" : conditionLabelText(filter);
}

function conditionFilterColor(filter: HalteConditionFilter): string | null {
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
  conditionFilter: HalteConditionFilter;
  onConditionFilterChange: (v: HalteConditionFilter) => void;
  isochroneVisible: boolean;
  onIsochroneChange: (v: boolean) => void;
  recommendationsVisible: boolean;
  onRecommendationsChange: (v: boolean) => void;
  brtVisible: boolean;
  onBrtChange: (v: boolean) => void;
  /** Corridor tags as reported by the BRT layer, in the layer's own order, so
   * the legend swatch is the colour of the line actually drawn. Empty until
   * the layer's fetch resolves (or if it failed), and then the corridor rows
   * simply are not there -- see CorridorLegendRows. */
  koridors: string[];
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
 * "Titik Bus Stop / Halte" and "Laporan Warga" used to be two separate
 * layers (an unassessed inventory vs. the same 42 survey points shown again
 * as sample citizen reports) -- the team found that split confusing and
 * asked for one consolidated layer instead, sourced from the survey data
 * but keeping the "Titik Bus Stop / Halte" name (see BusStopLayer.tsx).
 * "Laporan Warga" is gone; its condition filter button moved under this
 * layer's toggle instead.
 *
 * Legends are tied to their layer rather than always on: each block only
 * renders while its layer is switched on, and the whole legend section
 * disappears when every layer is off.
 */
export default function DashboardSidebar({
  densityVisible,
  onDensityChange,
  busStopsVisible,
  onBusStopsChange,
  conditionFilter,
  onConditionFilterChange,
  isochroneVisible,
  onIsochroneChange,
  recommendationsVisible,
  onRecommendationsChange,
  brtVisible,
  onBrtChange,
  koridors,
}: DashboardSidebarProps) {
  const [layersOpen, setLayersOpen] = useState(true);
  const filterDotColor = conditionFilterColor(conditionFilter);
  const showLegend =
    busStopsVisible || densityVisible || isochroneVisible || recommendationsVisible || brtVisible;

  function cycleConditionFilter() {
    const next =
      CONDITION_FILTER_CYCLE[(CONDITION_FILTER_CYCLE.indexOf(conditionFilter) + 1) % CONDITION_FILTER_CYCLE.length];
    onConditionFilterChange(next);
  }

  return (
    <nav className="z-40 hidden h-full w-panel-width shrink-0 flex-col overflow-y-auto scrollbar-hide border-r border-border-low bg-surface md:flex">
      {/* DashboardNav's own nav-items div is flex-1 -- correct on its own
          (e.g. /dashboard/tasks, where DashboardNav is <nav>'s only
          content and that flex-1 is what pushes its "Keluar" footer to the
          bottom of the sidebar). Here, though, Layer Peta and the legend
          come after DashboardNav in the same flex-col <nav>, so that same
          flex-1 was reaching past "Keluar" and eating all the space in
          *this* <nav> instead, pushing Layer Peta/the legend down to
          whatever was left over -- which shifted every time the legend's
          height changed (e.g. toggling a layer off). shrink-0 on this
          wrapper caps DashboardNav (nav items + Keluar) to its natural
          content height, so Layer Peta/the legend sit directly under it,
          unaffected by how tall the legend currently is. */}
      <div className="flex shrink-0 flex-col">
        <DashboardNav />
      </div>

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
            <div className="flex flex-col gap-2">
              <LayerToggleRow label="Titik Bus Stop / Halte" checked={busStopsVisible} onChange={onBusStopsChange} />
              {busStopsVisible && (
                <button
                  onClick={cycleConditionFilter}
                  aria-label={`Filter kondisi: ${conditionFilterLabel(conditionFilter)}. Klik untuk ganti.`}
                  className="ml-6 flex w-fit items-center gap-2 rounded-full border border-border-low bg-surface-container px-2.5 py-1 font-label-sm text-label-sm text-on-surface transition-colors hover:border-transport-blue hover:text-transport-blue"
                >
                  <span className="material-symbols-outlined text-[14px] text-on-surface-variant">filter_alt</span>
                  {filterDotColor && (
                    <span
                      className="inline-block h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: filterDotColor }}
                    />
                  )}
                  {conditionFilterLabel(conditionFilter)}
                </button>
              )}
            </div>
            <LayerToggleRow
              label="Jaringan BRT Trans Semarang"
              checked={brtVisible}
              onChange={onBrtChange}
            />
            <LayerToggleRow label="Kepadatan Penduduk" checked={densityVisible} onChange={onDensityChange} />
            <LayerToggleRow label="Jangkauan Jalan Kaki" checked={isochroneVisible} onChange={onIsochroneChange} />
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
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: conditionColor("green") }} />
                  <span className="font-label-sm text-label-sm text-on-surface-variant">Layak & Aman</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: conditionColor("yellow") }} />
                  <span className="font-label-sm text-label-sm text-on-surface-variant">Sedang</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: conditionColor("red") }} />
                  <span className="font-label-sm text-label-sm text-on-surface-variant">Rawan</span>
                </div>
              </div>
            </div>
          )}

          {brtVisible && (
            <div>
              <h3 className="mb-2 font-label-sm text-label-sm font-bold text-on-surface">
                Jaringan BRT Trans Semarang
              </h3>
              <div className="flex flex-col gap-1">
                {/* One row per corridor, same rows as the public map's legend
                    (components/ui/CorridorLegendRows) -- the generic "warna per
                    koridor" swatch told DISHUB that the colours differ but not
                    which line is which. Capped and scrollable so the 17 rows
                    cannot push the rest of the legend (e.g. "Halte BRT",
                    which is what the corridors are context for) out of view
                    in a sidebar that is the only way to reach either. */}
                <div className="flex max-h-[30vh] flex-col gap-1 overflow-y-auto pr-1">
                  <CorridorLegendRows koridors={koridors} />
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full border border-white"
                    style={{ backgroundColor: "#0f766e" }}
                  />
                  <span className="font-label-sm text-label-sm text-on-surface-variant">Halte BRT</span>
                </div>
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
