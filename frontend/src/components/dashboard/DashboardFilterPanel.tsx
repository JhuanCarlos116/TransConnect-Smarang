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
      <span className="text-label-sm text-on-surface">{label}</span>
    </label>
  );
}

function StaticToggleRow({ label, defaultChecked }: { label: string; defaultChecked?: boolean }) {
  return (
    <label className="flex cursor-pointer items-center gap-2">
      <input
        type="checkbox"
        defaultChecked={defaultChecked}
        className="rounded border-outline text-transport-blue focus:ring-transport-blue"
      />
      <span className="text-label-sm text-on-surface">{label}</span>
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
    <div className="w-64 rounded-lg border border-border-low bg-surface/95 p-stack-md shadow-[0_4px_16px_rgba(0,0,0,0.12)] backdrop-blur-sm">
      <h3 className="mb-stack-sm text-label-md font-bold text-on-surface">Spatial Filters</h3>
      <div className="flex flex-col gap-3">
        <LayerToggleRow label="Kepadatan Penduduk" checked={densityVisible} onChange={onDensityChange} />
        <LayerToggleRow label="Titik Survei Halte" checked={halteVisible} onChange={onHalteChange} />
        <LayerToggleRow label="Laporan Warga Terverifikasi" checked={reportsVisible} onChange={onReportsChange} />
        <LayerToggleRow label="Jangkauan Jalan Kaki (Isochrone)" checked={isochroneVisible} onChange={onIsochroneChange} />
        <StaticToggleRow label="Blank Spot" />
        <StaticToggleRow label="LST / Thermal Comfort" />
        <StaticToggleRow label="Slope" />
      </div>
    </div>
  );
}
