"use client";

import { useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

import { DEFAULT_CENTER, DEFAULT_ZOOM, mapStyleUrl } from "@/lib/maplibre";
import HalteLayer from "@/components/map/HalteLayer";
import type { HalteFeature } from "@/types/halte";

interface ReportHaltePickerProps {
  selected: HalteFeature | null;
  onSelect: (feature: HalteFeature) => void;
}

/**
 * The map box on the "Buat Laporan" page (see app/map/lapor/page.tsx) --
 * picking a halte here is what the report gets tied to (CitizenReport.halte_id),
 * replacing the old flow of tapping an arbitrary point anywhere on the public
 * map. Reuses HalteLayer as-is; a highlight ring around the selected point is
 * drawn with a second small layer instead of restyling HalteLayer itself.
 */
export default function ReportHaltePicker({ selected, onSelect }: ReportHaltePickerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [map, setMap] = useState<maplibregl.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    maplibregl.setWorkerUrl("/maplibre-gl-worker.mjs");

    const instance = new maplibregl.Map({
      container: containerRef.current,
      style: mapStyleUrl(),
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
    });
    instance.addControl(new maplibregl.NavigationControl(), "top-right");
    instance.on("load", () => setMap(instance));

    return () => {
      instance.remove();
      setMap(null);
    };
  }, []);

  useEffect(() => {
    if (!map) return;
    const SOURCE_ID = "report-picker-highlight";
    const LAYER_ID = "report-picker-highlight-ring";
    const empty: GeoJSON.FeatureCollection = { type: "FeatureCollection", features: [] };

    function ensure() {
      if (map!.getSource(SOURCE_ID)) return;
      map!.addSource(SOURCE_ID, { type: "geojson", data: empty });
      map!.addLayer({
        id: LAYER_ID,
        type: "circle",
        source: SOURCE_ID,
        paint: {
          "circle-radius": 13,
          "circle-color": "transparent",
          "circle-stroke-width": 3,
          "circle-stroke-color": "#2563eb",
        },
      });
    }

    function update() {
      ensure();
      const source = map!.getSource(SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
      source?.setData(
        selected
          ? { type: "FeatureCollection", features: [{ type: "Feature", properties: {}, geometry: selected.geometry }] }
          : empty,
      );
    }

    if (map.isStyleLoaded()) update();
    else map.once("load", update);
  }, [map, selected]);

  return (
    <div className="relative h-64 w-full overflow-hidden rounded-lg border border-border-low">
      <div ref={containerRef} className="h-full w-full" />
      {map && <HalteLayer map={map} visible onSelect={onSelect} />}
      {!selected && (
        <div className="pointer-events-none absolute inset-x-0 top-2 flex justify-center">
          <span className="rounded-full bg-surface/95 px-3 py-1 text-[11px] font-bold text-on-surface-variant shadow-sm">
            Ketuk titik halte di peta untuk memilih
          </span>
        </div>
      )}
    </div>
  );
}
