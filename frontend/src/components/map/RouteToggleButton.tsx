"use client";

/**
 * Show / hide the BRT corridor lines on the public map -- icon only.
 *
 * Deliberately no visible label. This page is for passengers, and the two
 * controls above it are already glyph-only; a third button carrying the words
 * "Tampilkan Rute" would be the only text in the column and would read as a
 * different class of control. So the state has to be carried by the button
 * itself, and it is, three ways:
 *
 *   - filled transport-blue with a solid route glyph = corridors drawn
 *   - muted outline on the surface colour = corridors hidden
 *   - aria-pressed + aria-label for screen readers, title for hover
 *
 * The last two are not visible text, so the icon-only requirement still holds
 * while the control stays operable without sight of the map.
 *
 * Sits directly under the search-halte button (SafeRouteWidget) in MapView's
 * right-hand column, per the team's request.
 */
interface RouteToggleButtonProps {
  visible: boolean;
  onToggle: () => void;
}

export default function RouteToggleButton({ visible, onToggle }: RouteToggleButtonProps) {
  const label = visible ? "Sembunyikan rute koridor" : "Tampilkan rute koridor";

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={visible}
      aria-label={label}
      title={label}
      className={[
        "flex h-12 w-12 items-center justify-center rounded-full shadow-lg transition-colors",
        visible
          ? "bg-transport-blue text-on-primary hover:bg-primary"
          : "border border-border-low bg-surface text-outline hover:bg-surface-container-low",
      ].join(" ")}
    >
      {/* The webfont is loaded with a variable FILL axis (layout.tsx), so the
          glyph itself can go solid/outline to match the button state -- useful
          on a light basemap where a colour change alone is easy to miss. */}
      <span
        className="material-symbols-outlined text-[22px] leading-none"
        style={{ fontVariationSettings: visible ? '"FILL" 1' : '"FILL" 0' }}
      >
        route
      </span>
    </button>
  );
}
