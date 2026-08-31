"use client";

import type * as maplibregl from "maplibre-gl";

import { DEFAULT_CENTER, DEFAULT_ZOOM } from "@/lib/maplibre";

interface MapControlsProps {
  map: maplibregl.Map;
}

interface ControlButtonProps {
  icon: string;
  label: string;
  spaced?: boolean;
  onClick: () => void;
}

function ControlButton({ icon, label, spaced, onClick }: ControlButtonProps) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`rounded border border-border-low bg-surface p-2 text-on-surface-variant shadow-sm transition-colors hover:text-transport-blue ${
        spaced ? "mt-2" : ""
      }`}
    >
      <span className="material-symbols-outlined">{icon}</span>
    </button>
  );
}

/**
 * Replaces MapLibre's built-in NavigationControl so the buttons match the
 * rest of the surface (same border, radius and shadow as every other
 * element). Used to include a fourth "layers" button toggling a floating
 * filter panel over the map -- that panel now lives permanently in
 * DashboardSidebar instead, so there's nothing left to toggle here.
 */
export default function MapControls({ map }: MapControlsProps) {
  return (
    <div className="absolute right-margin-page top-margin-page z-20 flex flex-col gap-2">
      <ControlButton icon="add" label="Perbesar" onClick={() => map.zoomIn()} />
      <ControlButton icon="remove" label="Perkecil" onClick={() => map.zoomOut()} />
      <ControlButton
        icon="my_location"
        label="Kembali ke Kecamatan Tembalang"
        spaced
        onClick={() => map.flyTo({ center: DEFAULT_CENTER, zoom: DEFAULT_ZOOM })}
      />
    </div>
  );
}
