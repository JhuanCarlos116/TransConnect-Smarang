/**
 * Corridor filtering for the BRT Trans Semarang network, shared by the DISHUB
 * dashboard layer (components/dashboard/BrtLayer.tsx) and the public map layer
 * (components/map/BrtRoutesLayer.tsx).
 *
 * It lives in lib/ next to brtCorridorStyle.ts for the same reason that file
 * does: the dashboard and the passenger map must filter the network the same
 * way. Two copies of this expression would drift the first time someone fixed
 * an edge case in one of them, and the bug would only show on the other page.
 *
 * WHY THE FILTER TARGETS THE LINES ONLY
 * The corridor lines (`rute_brt`) carry a `koridor` tag in the source data, so
 * "show me corridor 5" is a variable the data actually has. The 673 BRT halte
 * points do NOT: trans_semarang.halte_brt has no corridor column, and neither
 * does the ArcGIS web map they were extracted from. Associating them by
 * proximity would be inventing a relationship -- measured against the drawn
 * lines, only 428 of the 673 halte fall within 30 m of any corridor (the
 * corridor geometry is simplified), so a distance rule would silently drop 36%
 * of the real halte or mis-assign them. Callers therefore hide the halte dots
 * while a filter is active rather than show dots that pretend to belong to the
 * selected corridors; see BrtLayer and the sidebar note.
 */

/**
 * A MapLibre filter for the corridor line layer, or `null` for "no filter".
 *
 * `null` is returned whenever nothing is hidden, because that is both the
 * cheapest correct answer (MapLibre skips the predicate entirely) and the one
 * that cannot surprise.
 *
 * The empty case is a real state -- every corridor ticked off -- and needs its
 * own expression: `["match", input, [], a, b]` is REJECTED by MapLibre with
 * "Expected at least one branch label", which throws out of setFilter and
 * leaves the layer showing every corridor. A sentinel equality cannot match
 * anything (`koridorTags` drops empty tags, so no corridor is ever this
 * string), so "hide everything" really hides everything.
 *
 * @param hidden corridor tags the caller has switched off
 * @param all    every corridor tag the layer actually drew, in its own order
 */
export function corridorFilterFor(hidden: string[], all: string[]): unknown | null {
  if (all.length === 0) return null;
  if (hidden.length === 0) return null;

  const hiddenSet = new Set(hidden);
  const visible = all.filter((k) => !hiddenSet.has(k));
  if (visible.length === all.length) return null;

  if (visible.length === 0) {
    return ["==", ["get", "koridor"], "\u0000tidak-ada-koridor-terpilih"];
  }

  return ["match", ["get", "koridor"], visible, true, false];
}
