import type { BrtRuteProperties } from "@/types/brt";

/**
 * Body of the hover popup for a BRT corridor LINE, shared by the public map
 * (`components/map/BrtRoutesLayer.tsx`) and the DISHUB dashboard
 * (`components/dashboard/BrtLayer.tsx`).
 *
 * It lives in lib/ for the same reason `lib/brtCorridorStyle.ts` does: the two
 * pages read the same /api/v1/brt-network payload and must not be able to
 * describe the same corridor differently. A corridor popup that says
 * "Koridor F3 · 26,9 km" on one page and something else on the other is a bug
 * nobody would think to test for -- so there is only one place that writes it.
 *
 * What it shows, and why: the admin/citizen asked for the corridor a line
 * belongs to, so the full direction name leads, the short tag and the owning
 * network follow in one dimmed line, and the length is a third line only when
 * the source actually carries it (`length_km` is nullable upstream).
 *
 * `length_km` is a number, never a string, so `typeof` is the honest check --
 * `null` would otherwise render as "0.0 km", which reads as a measurement.
 */
export function rutePopupHtml(p: BrtRuteProperties): string {
  const koridor = p.koridor ? `Koridor ${p.koridor} · ` : "";
  const km =
    typeof p.length_km === "number"
      ? `<br/><span style="opacity:.7">${p.length_km.toFixed(1)} km</span>`
      : "";
  return (
    `<div style="font-size:12px;line-height:1.35"><strong>${p.rute}</strong><br/>` +
    `<span style="opacity:.7">${koridor}Jaringan BRT Trans Semarang</span>${km}</div>`
  );
}
