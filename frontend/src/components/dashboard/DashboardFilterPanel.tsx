"use client";

interface DashboardFilterPanelProps {
  densityVisible: boolean;
  onDensityChange: (v: boolean) => void;
  blankSpotsVisible: boolean;
  onBlankSpotsChange: (v: boolean) => void;
  thermalVisible: boolean;
  onThermalChange: (v: boolean) => void;
  aiHeatmapVisible: boolean;
  onAiHeatmapChange: (v: boolean) => void;
}

export default function DashboardFilterPanel({
  densityVisible,
  onDensityChange,
  blankSpotsVisible,
  onBlankSpotsChange,
  thermalVisible,
  onThermalChange,
  aiHeatmapVisible,
  onAiHeatmapChange,
}: DashboardFilterPanelProps) {
  return (
    <div className="bg-surface/95 backdrop-blur-sm p-4 rounded-lg shadow-[0_4px_16px_rgba(0,0,0,0.12)] border border-border-low min-w-[260px]">
      <h3 className="font-label-md text-label-md font-bold mb-3 text-on-surface">Spatial Filters</h3>
      <div className="flex flex-col gap-3">
        {/* Population Density */}
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={densityVisible}
            onChange={(e) => onDensityChange(e.target.checked)}
            className="rounded border-outline text-transport-blue focus:ring-transport-blue cursor-pointer h-4 w-4"
          />
          <span className="font-label-sm text-label-sm text-on-surface">
            Population Density (1km grid)
          </span>
        </label>

        {/* Transit Blank Spots (>500m) */}
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={blankSpotsVisible}
            onChange={(e) => onBlankSpotsChange(e.target.checked)}
            className="rounded border-outline text-transport-blue focus:ring-transport-blue cursor-pointer h-4 w-4"
          />
          <span className="font-label-sm text-label-sm text-on-surface">
            Transit Blank Spots (&gt;500m)
          </span>
        </label>

        {/* LST / Thermal Comfort (MODIS) */}
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={thermalVisible}
            onChange={(e) => onThermalChange(e.target.checked)}
            className="rounded border-outline text-transport-blue focus:ring-transport-blue cursor-pointer h-4 w-4"
          />
          <span className="font-label-sm text-label-sm text-on-surface">
            LST / Thermal Comfort (MODIS)
          </span>
        </label>

        {/* AI Confidence Heatmap */}
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={aiHeatmapVisible}
            onChange={(e) => onAiHeatmapChange(e.target.checked)}
            className="rounded border-outline text-transport-blue focus:ring-transport-blue cursor-pointer h-4 w-4"
          />
          <span className="font-label-sm text-label-sm text-on-surface">
            AI Confidence Heatmap
          </span>
        </label>
      </div>
    </div>
  );
}
