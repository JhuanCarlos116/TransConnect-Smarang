import { conditionColor, conditionLabelText } from "@/lib/conditionScore";
import { densityGradientCss } from "@/lib/populationColor";
import type { ConditionLabel } from "@/types/halte";

const LABELS: ConditionLabel[] = ["green", "yellow", "red"];
const ISOCHRONE_BANDS = [
  { minutes: 3, opacity: 0.28 },
  { minutes: 5, opacity: 0.18 },
  { minutes: 10, opacity: 0.1 },
];

/**
 * An earlier pass titled this "AI Confidence Heatmap" with a blue-to-red
 * gradient bar — copied from the mockup, where it labels a model-confidence
 * layer that does not exist here. Nothing on this map is an AI confidence
 * score, so the legend now just describes what is actually drawn: the
 * condition-score colors and the isochrone opacity bands.
 */
export default function DashboardLegend() {
  return (
    <div className="w-48 rounded-lg border border-border-low bg-surface/95 p-3 shadow-sm backdrop-blur-sm">
      <h4 className="mb-2 font-label-sm text-label-sm font-bold text-on-surface">Skor Kondisi Halte</h4>
      {LABELS.map((label) => (
        <div key={label} className="mb-1 flex items-center gap-2">
          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: conditionColor(label) }} />
          <span className="font-label-sm text-label-sm text-on-surface-variant">{conditionLabelText(label)}</span>
        </div>
      ))}

      <h4 className="mb-1 mt-3 font-label-sm text-label-sm font-bold text-on-surface">Kepadatan Penduduk</h4>
      <div className="mb-1 h-2 w-full rounded-full" style={{ background: densityGradientCss() }} />
      <div className="flex justify-between font-label-sm text-[10px] uppercase tracking-wider text-on-surface-variant">
        <span>Rendah</span>
        <span>Tinggi</span>
      </div>

      <h4 className="mb-1 mt-3 font-label-sm text-label-sm font-bold text-on-surface">Jangkauan Jalan Kaki</h4>
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
  );
}
