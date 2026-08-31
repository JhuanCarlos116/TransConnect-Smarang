import { conditionColor, conditionLabelText } from "@/lib/conditionScore";
import { densityGradientCss } from "@/lib/populationColor";
import type { ConditionLabel } from "@/types/halte";

const CONDITION_LABELS: ConditionLabel[] = ["green", "yellow", "red"];
const ISOCHRONE_BANDS = [
  { minutes: 3, opacity: 0.28 },
  { minutes: 5, opacity: 0.18 },
  { minutes: 10, opacity: 0.1 },
];

interface LayerToggleRowProps {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

function LayerToggleRow({ label, hint, checked, onChange }: LayerToggleRowProps) {
  return (
    <label className="flex cursor-pointer items-start gap-2">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 rounded border-outline text-transport-blue focus:ring-transport-blue"
      />
      <span className="min-w-0">
        <span className="block font-label-sm text-label-sm text-on-surface">{label}</span>
        <span className="block font-label-sm text-[10px] leading-tight text-on-surface-variant">{hint}</span>
      </span>
    </label>
  );
}

interface DashboardSidebarProps {
  densityVisible: boolean;
  onDensityChange: (v: boolean) => void;
  halteVisible: boolean;
  onHalteChange: (v: boolean) => void;
  reportsVisible: boolean;
  onReportsChange: (v: boolean) => void;
  isochroneVisible: boolean;
  onIsochroneChange: (v: boolean) => void;
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
 * is real, so the only nav item left is this page itself. It used to also
 * link out to the public map, but this is DISHUB's internal tool -- a staff
 * workflow has no reason to be routed from here to the citizen-facing page,
 * so that link is gone (from the header tabs too, see AppHeader).
 * "Run Spatial Analysis" also previously simulated a computation with
 * setTimeout and reported fabricated results ("3 Kandidat Halte... berhasil
 * dihitung"); replaced with a real reset-camera-and-toggles button for a
 * while, then removed outright at the user's request rather than kept
 * around as an icon-only affordance.
 */
export default function DashboardSidebar({
  densityVisible,
  onDensityChange,
  halteVisible,
  onHalteChange,
  reportsVisible,
  onReportsChange,
  isochroneVisible,
  onIsochroneChange,
}: DashboardSidebarProps) {
  return (
    <nav className="z-40 hidden h-full w-panel-width shrink-0 flex-col overflow-y-auto scrollbar-hide border-r border-border-low bg-surface md:flex">
      <div className="flex items-center gap-4 border-b border-border-low p-gutter">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded bg-surface-container">
          <span className="material-symbols-outlined text-[24px] text-transport-blue">shield</span>
        </div>
        <h2 className="font-headline-lg text-headline-lg font-bold leading-tight text-transport-blue">
          DISHUB Dashboard
        </h2>
      </div>

      <div className="flex flex-col gap-2 p-gutter">
        <span className="flex items-center gap-3 rounded-lg bg-primary-fixed px-4 py-3 font-label-md text-label-md font-bold text-on-primary-fixed-variant">
          <span className="material-symbols-outlined text-[20px]">map</span>
          Map View (DISHUB)
        </span>
      </div>

      <div className="border-t border-border-low p-gutter">
        <h3 className="mb-3 font-label-md text-label-md font-bold text-on-surface">Layer Peta</h3>
        <div className="flex flex-col gap-3">
          <LayerToggleRow
            label="Titik Survei Halte"
            hint="42 titik, skor kondisi"
            checked={halteVisible}
            onChange={onHalteChange}
          />
          <LayerToggleRow
            label="Kepadatan Penduduk"
            hint="9 kelurahan, BPS"
            checked={densityVisible}
            onChange={onDensityChange}
          />
          <LayerToggleRow
            label="Jangkauan Jalan Kaki"
            hint="Isochrone 3/5/10 menit"
            checked={isochroneVisible}
            onChange={onIsochroneChange}
          />
          <LayerToggleRow
            label="Laporan Warga"
            hint="Data contoh, bukan laporan asli"
            checked={reportsVisible}
            onChange={onReportsChange}
          />
        </div>
      </div>

      <div className="border-t border-border-low p-gutter">
        <h3 className="mb-2 font-label-sm text-label-sm font-bold text-on-surface">Skor Kondisi Halte</h3>
        {CONDITION_LABELS.map((label) => (
          <div key={label} className="mb-1 flex items-center gap-2">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: conditionColor(label) }}
            />
            <span className="font-label-sm text-label-sm text-on-surface-variant">{conditionLabelText(label)}</span>
          </div>
        ))}

        <h3 className="mb-1 mt-3 font-label-sm text-label-sm font-bold text-on-surface">Kepadatan Penduduk</h3>
        <div className="mb-1 h-2 w-full rounded-full" style={{ background: densityGradientCss() }} />
        <div className="flex justify-between font-label-sm text-[10px] uppercase tracking-wider text-on-surface-variant">
          <span>Rendah</span>
          <span>Tinggi</span>
        </div>

        <h3 className="mb-1 mt-3 font-label-sm text-label-sm font-bold text-on-surface">Jangkauan Jalan Kaki</h3>
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
    </nav>
  );
}
