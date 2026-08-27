import { conditionColor, conditionLabelText } from "@/lib/conditionScore";
import type { ConditionLabel } from "@/types/halte";

const LABELS: ConditionLabel[] = ["green", "yellow", "red"];

export default function ConditionLegend() {
  return (
    <div
      style={{
        position: "absolute",
        bottom: 24,
        left: 12,
        zIndex: 1,
        background: "#fff",
        borderRadius: 8,
        padding: "10px 14px",
        boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
        fontSize: 13,
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 6 }}>Skor Kondisi</div>
      {LABELS.map((label) => (
        <div key={label} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              backgroundColor: conditionColor(label),
              display: "inline-block",
            }}
          />
          <span>{conditionLabelText(label)}</span>
        </div>
      ))}
    </div>
  );
}
