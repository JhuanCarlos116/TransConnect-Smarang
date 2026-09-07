"use client";

import { useState } from "react";

import PublicMapInfoPanel from "@/components/map/PublicMapInfoPanel";
import type { HalteFeature } from "@/types/halte";

interface PublicMobileSheetProps {
  features: HalteFeature[];
  verifiedReportCount: number | null;
  halteVisible: boolean;
  onHalteChange: (visible: boolean) => void;
  communityVisible: boolean;
  onCommunityChange: (visible: boolean) => void;
}

/**
 * Phone equivalent of PublicSidePanel (which is `hidden` below md and would
 * otherwise leave a mobile visitor with no summary, no layer toggles, and no
 * way to reach the dashboard -- just a bare map). A permanent sidebar does not
 * fit a phone screen, so this is a collapsed peek bar by default -- a one-line
 * summary a thumb can reach -- that expands into the same content
 * (PublicMapInfoPanel) as a scrollable sheet on tap, instead of permanently
 * covering the map.
 */
export default function PublicMobileSheet(props: PublicMobileSheetProps) {
  const [expanded, setExpanded] = useState(false);
  const { features } = props;
  const rawanCount = features.filter((f) => f.properties.condition_label === "red").length;

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 max-h-[80vh] rounded-t-xl border-t border-border-low bg-surface shadow-[0_-4px_16px_rgba(0,0,0,0.12)] md:hidden">
      <button
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="flex w-full flex-col items-center gap-2 px-margin-page pb-3 pt-2"
      >
        <span className="h-1 w-10 rounded-full bg-border-low" aria-hidden="true" />
        <span className="flex w-full items-center justify-between">
          <span className="text-left text-label-md font-bold text-on-surface">
            {features.length} halte disurvei
            {rawanCount > 0 && <span className="font-normal text-on-surface-variant"> · {rawanCount} rawan</span>}
          </span>
          <span className="material-symbols-outlined text-[22px] text-on-surface-variant">
            {expanded ? "expand_more" : "expand_less"}
          </span>
        </span>
      </button>

      {expanded && (
        <div className="max-h-[calc(80vh-56px)] overflow-y-auto scrollbar-hide">
          <PublicMapInfoPanel {...props} />
        </div>
      )}
    </div>
  );
}
