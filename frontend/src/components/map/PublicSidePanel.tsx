import PublicMapInfoPanel from "@/components/map/PublicMapInfoPanel";
import type { HalteFeature } from "@/types/halte";

interface PublicSidePanelProps {
  features: HalteFeature[];
  verifiedReportCount: number | null;
  halteVisible: boolean;
  onHalteChange: (visible: boolean) => void;
  communityVisible: boolean;
  onCommunityChange: (visible: boolean) => void;
}

/** Desktop-only chrome (hidden below md -- see PublicMobileSheet for the phone equivalent). */
export default function PublicSidePanel(props: PublicSidePanelProps) {
  return (
    <aside className="hidden h-full w-full flex-shrink-0 flex-col overflow-y-auto border-r border-border-low bg-surface shadow-sm md:flex md:w-panel-width">
      <PublicMapInfoPanel {...props} />
    </aside>
  );
}
