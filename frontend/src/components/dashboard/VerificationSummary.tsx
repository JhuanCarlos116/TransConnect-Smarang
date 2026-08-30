"use client";

interface VerificationSummaryProps {
  halteCount?: number;
  verifiedReportCount?: number | null;
  onOpenModelDetail?: () => void;
}

export default function VerificationSummary({
  onOpenModelDetail,
}: VerificationSummaryProps) {
  return (
    <div className="p-gutter border-t border-border-low bg-surface-subtle shrink-0">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-label-md text-label-md font-bold text-on-surface flex items-center gap-2">
          <span className="material-symbols-outlined text-transport-blue text-[18px]">memory</span>
          YOLOv8 Detection Summary
        </h3>
        {onOpenModelDetail && (
          <button
            onClick={onOpenModelDetail}
            className="text-[11px] font-label-sm text-transport-blue hover:underline cursor-pointer"
          >
            Detail Metrik
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Sidewalks Summary */}
        <div className="bg-surface border border-border-low p-3 rounded shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="material-symbols-outlined text-outline text-[18px]">directions_walk</span>
            <span className="text-safety-green font-label-sm text-[11px] font-bold flex items-center gap-0.5">
              <span className="material-symbols-outlined text-[13px]">check_circle</span> 84% Valid
            </span>
          </div>
          <div className="font-label-sm text-[11px] text-on-surface-variant">Sidewalks</div>
          <div className="font-headline-md text-headline-md font-bold text-on-surface mt-0.5">1,204</div>
          <div className="w-full bg-surface-container-high h-1.5 rounded-full mt-2 overflow-hidden">
            <div className="bg-safety-green h-full w-[84%]"></div>
          </div>
        </div>

        {/* Streetlights Summary */}
        <div className="bg-surface border border-border-low p-3 rounded shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="material-symbols-outlined text-outline text-[18px]">lightbulb</span>
            <span className="text-caution-yellow font-label-sm text-[11px] font-bold flex items-center gap-0.5">
              <span className="material-symbols-outlined text-[13px]">error</span> 22% QC Req
            </span>
          </div>
          <div className="font-label-sm text-[11px] text-on-surface-variant">Streetlights</div>
          <div className="font-headline-md text-headline-md font-bold text-on-surface mt-0.5">4,392</div>
          <div className="w-full bg-surface-container-high h-1.5 rounded-full mt-2 overflow-hidden">
            <div className="bg-transport-blue h-full w-[78%]"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
