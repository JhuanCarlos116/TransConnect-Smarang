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
 * Four toggles, four real layers, one-to-one. An earlier pass relabeled
 * these to match the mockup's copy ("Population Density (1km grid)",
 * "Transit Blank Spots (>500m)", "LST / Thermal Comfort (MODIS)", "AI
 * Confidence Heatmap") without rewiring what each one actually controlled —
 * so "Blank Spots" toggled the walking-time isochrone (the opposite of what
 * a blank spot is), "Thermal Comfort" toggled a heatmap of halte condition
 * scores (no thermal data exists), and "AI Confidence" toggled both the
 * halte points and community reports at once with no way to show just one.
 * Every label here names the layer it actually switches; layers without
 * real data (Blank Spots, LST, AI Confidence) are absent rather than wired
 * to the wrong thing.
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
    <div className="w-64 rounded-lg border border-border-low bg-surface/95 p-4 shadow-[0_4px_16px_rgba(0,0,0,0.12)] backdrop-blur-sm">
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
  );
}
