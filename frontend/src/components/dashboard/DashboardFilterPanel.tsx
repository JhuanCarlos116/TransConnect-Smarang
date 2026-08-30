interface LayerToggleRowProps {
  label: string;
  hint?: string;
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
      <span>
        <span className="block text-label-sm text-on-surface">{label}</span>
        {hint && <span className="block text-[11px] leading-tight text-on-surface-variant">{hint}</span>}
      </span>
    </label>
  );
}

interface DashboardFilterPanelProps {
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
 * Only layers that have data behind them. The mockup also listed Blank Spot,
 * LST / Thermal Comfort and Slope -- rendered as pre-checked boxes, which read
 * as "this layer is currently drawn on the map" when nothing of the sort
 * existed. A checkbox that changes nothing when toggled undermines every other
 * control next to it, so they are gone until their data is built.
 */
export default function DashboardFilterPanel({
  densityVisible,
  onDensityChange,
  halteVisible,
  onHalteChange,
  reportsVisible,
  onReportsChange,
  isochroneVisible,
  onIsochroneChange,
}: DashboardFilterPanelProps) {
  return (
    <div className="w-72 rounded-lg border border-border-low bg-surface/95 p-stack-md shadow-[0_4px_16px_rgba(0,0,0,0.12)] backdrop-blur-sm">
      <h3 className="mb-stack-sm text-label-md font-bold text-on-surface">Layer Peta</h3>
      <div className="flex flex-col gap-stack-sm">
        <LayerToggleRow
          label="Titik Survei Halte"
          hint="42 titik, diwarnai menurut skor kondisi"
          checked={halteVisible}
          onChange={onHalteChange}
        />
        <LayerToggleRow
          label="Kepadatan Penduduk"
          hint="9 kelurahan, sumber BPS"
          checked={densityVisible}
          onChange={onDensityChange}
        />
        <LayerToggleRow
          label="Jangkauan Jalan Kaki"
          hint="Isochrone 3/5/10 menit dari halte eksisting"
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
  );
}
