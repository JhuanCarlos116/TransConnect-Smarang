"use client";

import type * as maplibregl from "maplibre-gl";

import { DEFAULT_CENTER, DEFAULT_ZOOM } from "@/lib/maplibre";

interface MapControlsProps {
  map: maplibregl.Map;
  panelOpen: boolean;
  onTogglePanel: () => void;
}

interface ControlButtonProps {
  icon: string;
  label: string;
  active?: boolean;
  spaced?: boolean;
  onClick: () => void;
}

function ControlButton({ icon, label, active, spaced, onClick }: ControlButtonProps) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={`rounded border border-border-low bg-surface p-2 shadow-sm transition-colors hover:text-transport-blue ${
        active ? "text-transport-blue" : "text-on-surface-variant"
      } ${spaced ? "mt-2" : ""}`}
    >
      <span className="material-symbols-outlined">{icon}</span>
    </button>
  );
}

/**
 * Replaces MapLibre's built-in NavigationControl so the buttons match the rest
 * of the surface (same border, radius and shadow as every other floating
 * panel). Same four controls as the mockup, all wired: the mockup's "layers"
 * button now genuinely opens and closes the layer panel.
 */
export default function MapControls({ map, panelOpen, onTogglePanel }: MapControlsProps) {
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
      <ControlButton
        icon="layers"
        label={panelOpen ? "Sembunyikan panel layer" : "Tampilkan panel layer"}
        active={panelOpen}
        spaced
        onClick={onTogglePanel}
      />
    </div>
  );
}
