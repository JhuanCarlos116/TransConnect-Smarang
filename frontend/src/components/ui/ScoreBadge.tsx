import { conditionColor, conditionLabelText } from "@/lib/conditionScore";
import type { ConditionLabel } from "@/types/halte";

interface ScoreBadgeProps {
  score: number;
  label: ConditionLabel;
}

export default function ScoreBadge({ score, label }: ScoreBadgeProps) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "2px 10px",
        borderRadius: 999,
        fontSize: 13,
        fontWeight: 600,
        color: "#fff",
        backgroundColor: conditionColor(label),
      }}
    >
      {conditionLabelText(label)} ({score})
    </span>
  );
}
