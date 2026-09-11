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
 */
interface CorridorLegendRowsProps {
  koridors: string[];
  swatchClassName?: string;
  labelClassName?: string;
}

export default function CorridorLegendRows({
  koridors,
  swatchClassName = "inline-block h-[3px] w-4 shrink-0 rounded-full",
  labelClassName = "font-label-sm text-label-sm text-on-surface-variant",
}: CorridorLegendRowsProps) {
  return (
    <>
      {koridors.map((koridor, i) => (
        <div key={koridor} className="flex items-center gap-2" data-koridor={koridor}>
          <span
            className={swatchClassName}
            style={{ backgroundColor: KORIDOR_PALETTE[i % KORIDOR_PALETTE.length] }}
          />
          <span className={labelClassName}>Koridor {koridor}</span>
        </div>
      ))}
    </>
  );
}
