// Sequential blue ramp (dataviz skill reference palette, steps 100-700) used
// for the kepadatan-penduduk choropleth. Kept as one array so the MapLibre
// paint expression and the legend gradient always agree.
export const DENSITY_STOPS: Array<[number, string]> = [
  [0, "#cde2fb"],
  [2000, "#9ec5f4"],
  [4000, "#5598e7"],
  [6000, "#2a78d6"],
  [9000, "#184f95"],
  [13000, "#0d366b"],
];

export function densityFillExpression(): unknown[] {
  const stops = DENSITY_STOPS.flatMap(([value, color]) => [value, color]);
  return ["interpolate", ["linear"], ["get", "kepadatan_per_km2"], ...stops];
}

export function densityGradientCss(): string {
  const stopCount = DENSITY_STOPS.length;
  const parts = DENSITY_STOPS.map(([, color], i) => `${color} ${(i / (stopCount - 1)) * 100}%`);
  return `linear-gradient(to right, ${parts.join(", ")})`;
}
