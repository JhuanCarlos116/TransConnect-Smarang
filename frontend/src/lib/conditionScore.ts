import type { ConditionLabel } from "@/types/halte";

// Mirrors backend/app/services/condition_score.py — the backend/cleaning
// script computes the numeric score; this only maps the resulting label to
// a display color, so there's no duplicated scoring logic.
// Hex values match --color-safety-green/-caution-yellow/-alert-red in
// globals.css (CivicSense Transit design system) — this stays the single
// source of truth since MapLibre paint expressions need literal hex, not
// CSS custom properties.
const COLORS: Record<ConditionLabel, string> = {
  green: "#2e7d32",
  yellow: "#fbc02d",
  red: "#d32f2f",
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
