"use client";

import { useEffect, useState } from "react";

import ConditionLegend from "@/components/map/ConditionLegend";
import { BrtRoutesLegend } from "@/components/map/BrtRoutesLayer";

/**
 * The public map's legend, foldable, at the passenger's request.
 *
 * On a phone the two legend cards covered a real part of the map -- the
 * complaint was literal: "jujur ini malah menghalangi pemandangan". So the
 * legend now behaves like the corridor lines do (RouteToggleButton): it can be
 * put away, and the state is carried by the control itself rather than by text,
 * because every other control on this page is a glyph-only circle.
 *
 * Default is closed on phones and open on desktop. The asymmetry is the point:
 * a phone screen cannot afford ~150 px of stacked cards over the map, while a
 * desktop has room and the legend is what tells a judge which colours mean
 * what. It is a one-way default -- once you press the button your choice sticks
 * for the session, on either screen size.
 *
 * Implementation note: the initial state is closed for BOTH sizes and the media
 * query only ever opens it, in an effect after mount. `/map` is statically
 * prerendered, so reading `matchMedia` in a state initializer would render
 * different HTML on the server than the client and trip a hydration mismatch.
 * The cost is that a desktop visitor sees the legend appear a frame late, under
 * tiles that are still loading; the benefit is that a phone visitor never sees
 * it at all.
 */
interface MapLegendPanelProps {
  /** Corridors are foldable too, and their legend must fold with them: an
   * explanation of something no longer drawn is worse than no legend. */
  routesVisible: boolean;
  /** Corridor tags in the exact order the layer assigned them colours, so the
   * swatch shown here is by construction the colour of that line on the map. */
  koridors: string[];
}

export default function MapLegendPanel({ routesVisible, koridors }: MapLegendPanelProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(min-width: 768px)").matches) setOpen(true);
  }, []);

  const label = open ? "Sembunyikan legenda" : "Tampilkan legenda";

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-pressed={open}
        aria-label={label}
        title={label}
        data-testid="legend-toggle"
        className={[
          "flex h-10 w-10 items-center justify-center rounded-full shadow-lg transition-colors",
          open
            ? "bg-transport-blue text-on-primary hover:bg-primary"
            : "border border-border-low bg-surface text-outline hover:bg-surface-container-low",
        ].join(" ")}
      >
        {/* Same FILL trick as RouteToggleButton: the glyph itself goes solid/
            outline, so the state survives a glance on a busy light basemap. */}
        <span
          className="material-symbols-outlined text-[20px] leading-none"
          style={{ fontVariationSettings: open ? '"FILL" 1' : '"FILL" 0' }}
        >
          legend_toggle
        </span>
      </button>

      {open && (
        <div className="flex flex-col gap-2">
          <ConditionLegend />
          {routesVisible && <BrtRoutesLegend koridors={koridors} />}
        </div>
      )}
    </div>
  );
}
