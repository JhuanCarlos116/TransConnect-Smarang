/**
 * Corridor styling for the BRT Trans Semarang reference network, shared by the
 * DISHUB dashboard layer (components/dashboard/BrtLayer.tsx) and the public map
 * layer (components/map/BrtRoutesLayer.tsx).
 *
 * It lives in lib/ rather than inside one of the two components on purpose:
 * the public map must show exactly the same corridors in exactly the same
 * colours as the dashboard, and two copies of this palette would drift the
 * first time someone re-orders one of them.
 */

/**
 * Deliberately a different colour family from the condition palette
 * (green/yellow/red) and the recommendation amber, so a judge can tell
 * "this is the existing BRT network" from "this is our assessment" without
 * reading the legend. Assigned per corridor in sorted order.
 */
export const KORIDOR_PALETTE = [
  "#1d4ed8", "#7c3aed", "#0891b2", "#0f766e", "#b45309",
  "#be185d", "#4338ca", "#0369a1", "#15803d", "#a21caf",
  "#c2410c", "#1e40af", "#6d28d9", "#047857", "#9d174d",
  "#3730a3", "#0e7490", "#7f1d1d",
];

/** Corridor tags present in a set of route features, sorted so the colour a
 * corridor gets does not depend on the order rows came back from PostGIS. */
export function koridorTags(rute: { properties: { koridor: string | null } }[]): string[] {
  return [...new Set(rute.map((f) => f.properties.koridor).filter((k): k is string => !!k))].sort();
}

export function koridorColorExpression(koridors: string[]): unknown {
  const match: unknown[] = ["match", ["get", "koridor"]];
  koridors.forEach((k, i) => {
    match.push(k, KORIDOR_PALETTE[i % KORIDOR_PALETTE.length]);
  });
  match.push("#64748b"); // fallback for an unnamed corridor
  return match;
}
