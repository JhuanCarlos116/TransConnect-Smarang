import type { ConditionLabel } from "@/types/halte";

// Mirrors backend/app/services/condition_score.py — the backend/cleaning
// script computes the numeric score; this only maps the resulting label to
// a display color, so there's no duplicated scoring logic.
const COLORS: Record<ConditionLabel, string> = {
  green: "#22c55e",
  yellow: "#eab308",
  red: "#ef4444",
};

const LABELS: Record<ConditionLabel, string> = {
  green: "Layak & Aman",
  yellow: "Sedang",
  red: "Rawan",
};

export function conditionColor(label: ConditionLabel): string {
  return COLORS[label];
}

export function conditionLabelText(label: ConditionLabel): string {
  return LABELS[label];
}
