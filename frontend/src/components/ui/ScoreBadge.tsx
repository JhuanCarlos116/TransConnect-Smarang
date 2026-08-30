import { conditionColor, conditionLabelText } from "@/lib/conditionScore";
import type { ConditionLabel } from "@/types/halte";

interface ScoreBadgeProps {
  score: number;
  label: ConditionLabel;
}

export default function ScoreBadge({ score, label }: ScoreBadgeProps) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-label-sm font-bold text-on-primary"
      style={{ backgroundColor: conditionColor(label) }}
    >
      {conditionLabelText(label)} ({score})
    </span>
  );
}
