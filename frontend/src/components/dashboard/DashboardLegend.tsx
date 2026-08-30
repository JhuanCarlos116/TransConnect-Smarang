import { conditionColor, conditionLabelText } from "@/lib/conditionScore";
import { densityGradientCss } from "@/lib/populationColor";
import type { ConditionLabel } from "@/types/halte";

const LABELS: ConditionLabel[] = ["green", "yellow", "red"];

export default function DashboardLegend() {
  return (
    <div className="w-48 rounded-lg border border-border-low bg-surface/95 p-3 shadow-sm backdrop-blur-sm">
      <h4 className="mb-2 text-label-sm font-bold text-on-surface">Skor Kondisi Halte</h4>
      {LABELS.map((label) => (
        <div key={label} className="mb-1 flex items-center gap-2">
          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: conditionColor(label) }} />
          <span className="text-label-sm text-on-surface">{conditionLabelText(label)}</span>
        </div>
      ))}

      <h4 className="mb-1 mt-3 text-label-sm font-bold text-on-surface">Kepadatan Penduduk</h4>
      <div className="mb-1 h-2 w-full rounded-full" style={{ background: densityGradientCss() }} />
      <div className="flex justify-between text-[10px] uppercase tracking-wider text-on-surface-variant">
        <span>Rendah</span>
        <span>Tinggi</span>
      </div>

      <h4 className="mb-1 mt-3 text-label-sm font-bold text-on-surface">Jangkauan Jalan Kaki</h4>
      <div className="flex items-center gap-2">
        <span className="inline-block h-2.5 w-2.5 rounded-full bg-transport-blue" style={{ opacity: 0.28 }} />
        <span className="text-label-sm text-on-surface-variant">3 menit</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="inline-block h-2.5 w-2.5 rounded-full bg-transport-blue" style={{ opacity: 0.18 }} />
        <span className="text-label-sm text-on-surface-variant">5 menit</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="inline-block h-2.5 w-2.5 rounded-full bg-transport-blue" style={{ opacity: 0.1 }} />
        <span className="text-label-sm text-on-surface-variant">10 menit</span>
      </div>
    </div>
  );
}
