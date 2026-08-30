"use client";

import { useState } from "react";
import { conditionColor, conditionLabelText } from "@/lib/conditionScore";
import type { ConditionLabel } from "@/types/halte";

const LABELS: ConditionLabel[] = ["green", "yellow", "red"];
const ISOCHRONE_BANDS = [
  { minutes: 3, opacity: 0.28 },
  { minutes: 5, opacity: 0.18 },
  { minutes: 10, opacity: 0.1 },
];

export default function DashboardLegend() {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="w-52 rounded-lg border border-border-low bg-surface/95 p-3 shadow-sm backdrop-blur-sm">
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-label-sm text-label-sm font-bold text-on-surface">AI Confidence Heatmap</h4>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-on-surface-variant hover:text-transport-blue p-0.5 cursor-pointer"
          title={expanded ? "Sembunyikan detail" : "Tampilkan detail"}
        >
          <span className="material-symbols-outlined text-[16px]">
            {expanded ? "expand_less" : "expand_more"}
          </span>
        </button>
      </div>

      {/* Primary Gradient Bar (Direct match with Mockup) */}
      <div className="h-2 w-full rounded-full bg-gradient-to-r from-transport-blue via-caution-yellow to-alert-red mb-1"></div>
      <div className="flex justify-between text-[10px] font-label-sm text-on-surface-variant uppercase tracking-wider">
        <span>Low</span>
        <span>High</span>
      </div>

      {/* Expanded Multi-Layer Details */}
      {expanded && (
        <div className="mt-3 pt-3 border-t border-border-low flex flex-col gap-2.5">
          <div>
            <h5 className="font-label-sm text-[11px] font-bold text-on-surface mb-1">Skor Kondisi Halte</h5>
            {LABELS.map((label) => (
              <div key={label} className="mb-0.5 flex items-center gap-2">
                <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: conditionColor(label) }} />
                <span className="font-label-sm text-[10px] text-on-surface-variant">{conditionLabelText(label)}</span>
              </div>
            ))}
          </div>

          <div>
            <h5 className="font-label-sm text-[11px] font-bold text-on-surface mb-1">Jangkauan Isochrone</h5>
            {ISOCHRONE_BANDS.map((band) => (
              <div key={band.minutes} className="flex items-center gap-2 mb-0.5">
                <span
                  className="inline-block h-2 w-2 rounded-full bg-transport-blue"
                  style={{ opacity: band.opacity }}
                />
                <span className="font-label-sm text-[10px] text-on-surface-variant">{band.minutes} menit jalan kaki</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
