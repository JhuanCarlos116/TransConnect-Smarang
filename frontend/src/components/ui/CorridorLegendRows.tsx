import { KORIDOR_PALETTE } from "@/lib/brtCorridorStyle";

/**
 * One legend row per BRT corridor, shared by the public map's legend card
 * (`components/map/BrtRoutesLayer.tsx`) and the DISHUB dashboard sidebar
 * (`components/dashboard/DashboardSidebar.tsx`).
 *
 * It lives in components/ui/ for the same reason `lib/brtCorridorStyle.ts`
 * does: the two pages must not be able to describe the same corridor with a
 * different colour. Callers pass the corridor list the LAYER actually styled,
 * in the layer's own order, so swatch i is by construction the colour of the
 * line drawn for corridor i -- there is no second place where the mapping
 * from corridor to colour could drift.
 *
 * Only the paddings/type scale are caller-controlled, because the sidebar and
 * a floating card over a map have different room; the colour logic and the
 * "Koridor <tag>" wording are not.
 *
 * The rows double as the corridor FILTER when the caller passes `onToggle`: a
 * passenger or a dispatcher picks which corridors to draw by clicking them,
 * which is why the filter control is not a separate widget elsewhere on the
 * page. The legend is already the list of corridors *in the layer's order*, so
 * making it clickable keeps one list instead of adding a second that could
 * disagree with the legend about which corridors exist. Hidden rows keep their
 * place and are shown struck-through and faded rather than removed -- a row
 * that disappears cannot be clicked to bring its corridor back.
 */
interface CorridorLegendRowsProps {
  koridors: string[];
  swatchClassName?: string;
  labelClassName?: string;
  /** Corridor tags currently filtered out. Omit for a static legend. */
  hidden?: string[];
  /** Called with a corridor tag when its row is clicked. Omit to render
   * non-interactive rows (the legend stays readable without a filter). */
  onToggle?: (koridor: string) => void;
}

export default function CorridorLegendRows({
  koridors,
  swatchClassName = "inline-block h-[3px] w-4 shrink-0 rounded-full",
  labelClassName = "font-label-sm text-label-sm text-on-surface-variant",
  hidden = [],
  onToggle,
}: CorridorLegendRowsProps) {
  const hiddenSet = new Set(hidden);

  return (
    <>
      {koridors.map((koridor, i) => {
        const isHidden = hiddenSet.has(koridor);
        const swatch = (
          <span
            className={swatchClassName}
            style={{
              backgroundColor: KORIDOR_PALETTE[i % KORIDOR_PALETTE.length],
              opacity: isHidden ? 0.25 : 1,
            }}
          />
        );
        const label = (
          <span
            className={[
              labelClassName,
              isHidden ? "line-through opacity-45" : "",
            ].join(" ")}
          >
            Koridor {koridor}
          </span>
        );

        if (!onToggle) {
          return (
            <div key={koridor} className="flex items-center gap-2" data-koridor={koridor}>
              {swatch}
              {label}
            </div>
          );
        }

        const hint = isHidden ? `Tampilkan Koridor ${koridor}` : `Sembunyikan Koridor ${koridor}`;
        return (
          <button
            key={koridor}
            type="button"
            onClick={() => onToggle(koridor)}
            aria-pressed={!isHidden}
            aria-label={hint}
            title={hint}
            data-koridor={koridor}
            data-hidden={isHidden ? "true" : "false"}
            className="flex w-full items-center gap-2 rounded px-1 py-0.5 text-left transition-colors hover:bg-surface-container-low"
          >
            {swatch}
            {label}
          </button>
        );
      })}
    </>
  );
}

/**
 * "Semua koridor" reset for the two legends that own a corridor filter.
 *
 * Exported from this file rather than written twice so the label cannot drift
 * between the dashboard and the passenger map, and so both pages reset to the
 * same state. Renders nothing while every corridor is already shown -- at that
 * point the button would be the only thing on screen implying a filter exists.
 */
export function CorridorFilterReset({
  hiddenCount,
  onShowAll,
  className = "font-label-sm text-label-sm",
}: {
  hiddenCount: number;
  onShowAll: () => void;
  /** Type scale is caller-controlled, like the rows above. */
  className?: string;
}) {
  if (hiddenCount === 0) return null;

  return (
    <button
      type="button"
      onClick={onShowAll}
      data-testid="corridor-show-all"
      title="Tampilkan lagi semua koridor"
      className={[
        "mb-1 flex items-center gap-1 rounded px-1 py-0.5 font-bold text-transport-blue transition-colors hover:bg-surface-container-low",
        className,
      ].join(" ")}
    >
      <span className="material-symbols-outlined text-[14px] leading-none">restart_alt</span>
      Semua koridor
    </button>
  );
}
