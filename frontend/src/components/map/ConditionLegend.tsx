import { conditionColor, conditionLabelText } from "@/lib/conditionScore";
import type { ConditionLabel } from "@/types/halte";

const LABELS: ConditionLabel[] = ["green", "yellow", "red"];

export default function ConditionLegend() {
  return (
    <div className="w-36 rounded-lg border border-border-low bg-surface/95 p-2 shadow-sm backdrop-blur-sm md:w-48 md:p-3">
      <h4 className="mb-1 text-[11px] font-bold text-on-surface md:mb-2 md:text-label-sm">Skor Kondisi Halte</h4>
      {LABELS.map((label) => (
        <div key={label} className="mb-0.5 flex items-center gap-1.5 md:mb-1 md:gap-2">
          <span className="inline-block h-2 w-2 shrink-0 rounded-full md:h-2.5 md:w-2.5" style={{ backgroundColor: conditionColor(label) }} />
          <span className="text-[11px] text-on-surface-variant md:text-label-sm">{conditionLabelText(label)}</span>
        </div>
      ))}
    </div>
  );
}
