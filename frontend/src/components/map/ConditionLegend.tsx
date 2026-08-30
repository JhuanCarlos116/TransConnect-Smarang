import { conditionColor, conditionLabelText } from "@/lib/conditionScore";
import type { ConditionLabel } from "@/types/halte";

const LABELS: ConditionLabel[] = ["green", "yellow", "red"];

export default function ConditionLegend() {
  return (
    <div className="w-48 rounded-lg border border-border-low bg-surface/95 p-3 shadow-sm backdrop-blur-sm">
      <h4 className="mb-2 text-label-sm font-bold text-on-surface">Skor Kondisi Halte</h4>
      {LABELS.map((label) => (
        <div key={label} className="mb-1 flex items-center gap-2">
          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: conditionColor(label) }} />
          <span className="text-label-sm text-on-surface-variant">{conditionLabelText(label)}</span>
        </div>
      ))}
    </div>
  );
}
