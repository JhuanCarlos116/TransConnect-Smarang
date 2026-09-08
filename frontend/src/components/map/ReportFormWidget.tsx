"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";

import { createCitizenReport } from "@/lib/fetchCitizenReports";

const MARKER_SOURCE_ID = "citizen-report-marker";
const MARKER_LAYER_ID = "citizen-report-marker-point";
const EMPTY_COLLECTION: GeoJSON.FeatureCollection = { type: "FeatureCollection", features: [] };
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

interface ReportFormWidgetProps {
  map: maplibregl.Map;
}

type Status = "idle" | "picking" | "form" | "submitting" | "done" | "error";

/**
 * "Buat Laporan" -- the real citizen report submission path (see
 * backend/app/routers/citizen_report.py). Separate from "Laporan Warga",
 * which only ever displayed the team's own survey points relabeled as
 * sample data; this actually writes a new row a citizen controls.
 *
 * Flow: tap the button -> tap a point on the map to mark where the problem
 * is -> fill in a description (+ optional photo) -> submit. Picking a point
 * on the map (rather than using geolocation, like Safe Transit Navigator
 * does) fits a report better -- someone might be reporting a spot they
 * passed earlier, not necessarily where they're standing right now.
 */
export default function ReportFormWidget({ map }: ReportFormWidgetProps) {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [point, setPoint] = useState<[number, number] | null>(null);
  const [description, setDescription] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const layersReadyRef = useRef(false);
  const statusRef = useRef(status);
  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  const ensureLayers = useCallback(() => {
    if (layersReadyRef.current) return;
    layersReadyRef.current = true;

    map.addSource(MARKER_SOURCE_ID, { type: "geojson", data: EMPTY_COLLECTION });
    map.addLayer({
      id: MARKER_LAYER_ID,
      type: "circle",
      source: MARKER_SOURCE_ID,
      paint: {
        "circle-radius": 9,
        "circle-color": "#f59e0b",
        "circle-stroke-width": 3,
        "circle-stroke-color": "#fff",
      },
    });
  }, [map]);

  const setMarker = useCallback(
    (coords: [number, number] | null) => {
      const source = map.getSource(MARKER_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
      source?.setData(
        coords
          ? { type: "FeatureCollection", features: [{ type: "Feature", properties: {}, geometry: { type: "Point", coordinates: coords } }] }
          : EMPTY_COLLECTION,
      );
    },
    [map],
  );

  // Map click handler for picking mode -- registered once, reads current
  // status via ref so it always sees the latest state without re-binding.
  useEffect(() => {
    function handleClick(e: maplibregl.MapMouseEvent) {
      if (statusRef.current !== "picking") return;
      ensureLayers();
      const coords: [number, number] = [e.lngLat.lng, e.lngLat.lat];
      setPoint(coords);
      setMarker(coords);
      setStatus("form");
    }

    map.on("click", handleClick);
    return () => {
      map.off("click", handleClick);
    };
  }, [map, ensureLayers, setMarker]);

  useEffect(() => {
    map.getCanvas().style.cursor = status === "picking" ? "crosshair" : "";
  }, [map, status]);

  function startPicking() {
    setError(null);
    setStatus("picking");
  }

  function reset() {
    setStatus("idle");
    setError(null);
    setPoint(null);
    setDescription("");
    setPhoto(null);
    setMarker(null);
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) {
      setPhoto(null);
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setError("Ukuran foto maksimal 5 MB.");
      e.target.value = "";
      return;
    }
    setError(null);
    setPhoto(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!point || !description.trim()) return;

    setStatus("submitting");
    setError(null);
    try {
      await createCitizenReport({ lat: point[1], lon: point[0], description: description.trim(), photo: photo ?? undefined });
      setStatus("done");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Gagal mengirim laporan.");
    }
  }

  return (
    // Stacked above SafeRouteWidget's button on narrow screens (both pill
    // buttons are wider than half the viewport at phone widths, so side by
    // side they overlap/clip) -- side by side again from md up, where
    // there's room.
    <div className="absolute bottom-[60px] right-margin-page z-20 flex max-w-xs flex-col-reverse gap-2 md:bottom-margin-page">
      {status === "idle" && (
        <button
          onClick={startPicking}
          className="flex items-center gap-1.5 self-end rounded-full bg-transport-blue px-3 py-2 text-[12px] font-label-md font-bold text-on-primary shadow-lg transition-colors hover:bg-primary md:gap-2 md:px-4 md:py-2.5 md:text-label-md"
        >
          <span className="flex items-center -space-x-1">
            <span className="material-symbols-outlined text-[16px] md:text-[20px]">directions_bus</span>
            <span className="material-symbols-outlined text-[12px] md:text-[14px]">edit</span>
          </span>
          Buat Laporan
        </button>
      )}

      {status === "picking" && (
        <div className="flex items-center gap-1.5 self-end rounded-full bg-transport-blue px-3 py-2 text-[12px] font-label-md font-bold text-on-primary shadow-lg md:gap-2 md:px-4 md:py-2.5 md:text-label-md">
          <span className="material-symbols-outlined text-[16px] md:text-[20px]">touch_app</span>
          Klik titik di peta
          <button onClick={reset} aria-label="Batal" className="ml-1 opacity-80 hover:opacity-100">
            <span className="material-symbols-outlined text-[16px] md:text-[18px]">close</span>
          </button>
        </div>
      )}

      {(status === "form" || status === "submitting" || status === "error") && (
        <div className="overflow-hidden rounded-lg border border-border-low bg-surface shadow-lg">
          <div className="flex items-center justify-between gap-2 border-b border-border-low bg-surface-container-low px-3 py-2">
            <span className="flex items-center gap-1.5 font-label-sm text-label-sm font-bold text-on-surface">
              <span className="flex items-center -space-x-0.5 text-transport-blue">
                <span className="material-symbols-outlined text-[16px]">directions_bus</span>
                <span className="material-symbols-outlined text-[12px]">edit</span>
              </span>
              Buat Laporan
            </span>
            <button
              onClick={reset}
              aria-label="Batal"
              className="flex items-center rounded-lg border border-alert-red p-1 text-alert-red transition-colors hover:bg-alert-red hover:text-on-error"
            >
              <span className="material-symbols-outlined text-[14px]">close</span>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-2.5 p-3">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ceritakan kondisi halte/bus stop di titik ini..."
              required
              rows={3}
              className="w-full rounded-lg border border-border-low bg-surface-container-low p-2.5 font-body-md text-[13px] text-on-surface focus:border-transport-blue focus:outline-none focus:ring-1 focus:ring-transport-blue"
            />
            <label className="flex items-center gap-2 text-label-sm text-on-surface-variant">
              <span className="material-symbols-outlined text-[16px]">photo_camera</span>
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhotoChange} className="text-[12px]" />
            </label>
            {error && <p className="text-label-sm text-alert-red">{error}</p>}
            <button
              type="submit"
              disabled={status === "submitting" || !description.trim()}
              className="self-start rounded-lg bg-transport-blue px-4 py-2 font-label-sm text-label-sm font-bold text-on-primary transition-colors hover:bg-primary disabled:cursor-not-allowed disabled:opacity-70"
            >
              {status === "submitting" ? "Mengirim..." : "Kirim Laporan"}
            </button>
          </form>
        </div>
      )}

      {status === "done" && (
        <div className="flex items-center gap-2 rounded-lg border border-safety-green/30 bg-green-50 p-3 shadow-lg">
          <span className="material-symbols-outlined text-[18px] text-safety-green">check_circle</span>
          <span className="flex-1 text-label-sm text-on-surface">Laporan terkirim, terima kasih!</span>
          <button onClick={reset} aria-label="Tutup" className="opacity-70 hover:opacity-100">
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      )}
    </div>
  );
}
