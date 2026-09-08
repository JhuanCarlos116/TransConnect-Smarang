"use client";

import { useCallback, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";

import { fetchSafeRoute } from "@/lib/fetchSafeRoute";
import { conditionLabelText } from "@/lib/conditionScore";
import ScoreBadge from "@/components/ui/ScoreBadge";
import type { RouteOption, SafeHalteRouteResponse } from "@/types/safeRoute";

const USER_SOURCE_ID = "safe-route-user";
const USER_LAYER_ID = "safe-route-user-point";
const NEAREST_SOURCE_ID = "safe-route-nearest";
const NEAREST_LAYER_ID = "safe-route-nearest-line";
const RECOMMENDED_SOURCE_ID = "safe-route-recommended";
const RECOMMENDED_LAYER_ID = "safe-route-recommended-line";

const EMPTY_COLLECTION: GeoJSON.FeatureCollection = { type: "FeatureCollection", features: [] };

interface SafeRouteWidgetProps {
  map: maplibregl.Map;
}

type Status = "idle" | "locating" | "loading" | "error";

/**
 * Safe Transit Navigator (PRD roadmap item) -- see backend/app/routers/route.py
 * for what "safe" means here (best condition_score reachable within a 15-min
 * walking budget, not a segment-weighted route -- we don't have per-segment
 * condition data to weight a path with).
 *
 * Bottom-left on both pages that use this (public map, dashboard) --
 * ReportFormWidget owns the bottom-right on the public map instead.
 */
export default function SafeRouteWidget({ map }: SafeRouteWidgetProps) {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SafeHalteRouteResponse | null>(null);
  const layersReadyRef = useRef(false);

  const ensureLayers = useCallback(() => {
    if (layersReadyRef.current) return;
    layersReadyRef.current = true;

    map.addSource(USER_SOURCE_ID, { type: "geojson", data: EMPTY_COLLECTION });
    map.addLayer({
      id: USER_LAYER_ID,
      type: "circle",
      source: USER_SOURCE_ID,
      paint: {
        "circle-radius": 7,
        "circle-color": "#2563eb",
        "circle-stroke-width": 2,
        "circle-stroke-color": "#fff",
      },
    });

    // Nearest drawn first (dashed grey) so the recommended line renders on top.
    map.addSource(NEAREST_SOURCE_ID, { type: "geojson", data: EMPTY_COLLECTION });
    map.addLayer({
      id: NEAREST_LAYER_ID,
      type: "line",
      source: NEAREST_SOURCE_ID,
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": "#9ca3af", "line-width": 4, "line-dasharray": [2, 2] },
    });

    map.addSource(RECOMMENDED_SOURCE_ID, { type: "geojson", data: EMPTY_COLLECTION });
    map.addLayer({
      id: RECOMMENDED_LAYER_ID,
      type: "line",
      source: RECOMMENDED_SOURCE_ID,
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": "#2563eb", "line-width": 5 },
    });
  }, [map]);

  const setLineData = useCallback(
    (sourceId: string, route: RouteOption["route"] | null) => {
      const source = map.getSource(sourceId) as maplibregl.GeoJSONSource | undefined;
      if (!source) return;
      source.setData(
        route
          ? { type: "FeatureCollection", features: [{ type: "Feature", properties: {}, geometry: route }] }
          : EMPTY_COLLECTION,
      );
    },
    [map],
  );

  const clearRoute = useCallback(() => {
    setResult(null);
    setError(null);
    setStatus("idle");
    if (!layersReadyRef.current) return;
    setLineData(RECOMMENDED_SOURCE_ID, null);
    setLineData(NEAREST_SOURCE_ID, null);
    const userSource = map.getSource(USER_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
    userSource?.setData(EMPTY_COLLECTION);
  }, [map, setLineData]);

  const handleClick = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setStatus("error");
      setError("Browser ini tidak mendukung geolokasi.");
      return;
    }

    setStatus("locating");
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        ensureLayers();

        const userSource = map.getSource(USER_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
        userSource?.setData({
          type: "FeatureCollection",
          features: [
            { type: "Feature", properties: {}, geometry: { type: "Point", coordinates: [longitude, latitude] } },
          ],
        });

        setStatus("loading");
        fetchSafeRoute(latitude, longitude)
          .then((data) => {
            setResult(data);
            setStatus("idle");
            setLineData(RECOMMENDED_SOURCE_ID, data.recommended.route);
            setLineData(NEAREST_SOURCE_ID, data.nearest?.route ?? null);

            const bounds = new maplibregl.LngLatBounds([longitude, latitude], [longitude, latitude]);
            for (const c of data.recommended.route.coordinates) bounds.extend(c);
            if (data.nearest) for (const c of data.nearest.route.coordinates) bounds.extend(c);
            map.fitBounds(bounds, { padding: 60, maxZoom: 17, duration: 800 });
          })
          .catch((err: unknown) => {
            setStatus("error");
            setError(err instanceof Error ? err.message : "Gagal memuat rute.");
          });
      },
      (geoErr) => {
        setStatus("error");
        setError(
          geoErr.code === geoErr.PERMISSION_DENIED
            ? "Izin lokasi ditolak. Aktifkan izin lokasi di browser untuk memakai fitur ini."
            : "Gagal mendapatkan lokasi kamu.",
        );
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, [map, ensureLayers, setLineData]);

  const busy = status === "locating" || status === "loading";

  return (
    <div className="absolute bottom-margin-page left-margin-page z-20 flex max-w-xs flex-col-reverse gap-2">
      <button
        onClick={handleClick}
        disabled={busy}
        className="flex items-center gap-1.5 self-start rounded-full bg-transport-blue px-3 py-2 text-[12px] font-label-md font-bold text-on-primary shadow-lg transition-colors hover:bg-primary disabled:cursor-not-allowed disabled:opacity-70 md:gap-2 md:px-4 md:py-2.5 md:text-label-md"
      >
        <span className={`material-symbols-outlined text-[16px] md:text-[20px] ${busy ? "animate-spin" : ""}`}>
          {busy ? "progress_activity" : "my_location"}
        </span>
        {status === "locating" ? "Mencari lokasi..." : status === "loading" ? "Menghitung rute..." : "Cari Halte Teraman"}
      </button>

      {error && (
        <div className="flex items-start gap-2 rounded-lg bg-error-container px-3 py-2 text-label-sm text-on-error-container shadow-lg">
          <span className="material-symbols-outlined shrink-0 text-[18px]">error</span>
          <span className="flex-1">{error}</span>
          <button onClick={clearRoute} aria-label="Tutup" className="shrink-0 opacity-80 hover:opacity-100">
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      )}

      {result && (
        <div className="overflow-hidden rounded-lg border border-border-low bg-surface shadow-lg">
          <div className="flex items-center justify-between gap-2 border-b border-border-low bg-surface-container-low px-3 py-2">
            <span className="flex items-center gap-1.5 font-label-sm text-label-sm font-bold text-on-surface">
              <span className="material-symbols-outlined text-[16px] text-transport-blue">alt_route</span>
              Halte Teraman Terjangkau
            </span>
            <button
              onClick={clearRoute}
              aria-label="Tutup rute"
              className="flex items-center rounded-lg border border-alert-red p-1 text-alert-red transition-colors hover:bg-alert-red hover:text-on-error"
            >
              <span className="material-symbols-outlined text-[14px]">close</span>
            </button>
          </div>

          <div className="p-3">
            <div className="mb-1.5 flex items-center gap-2">
              <ScoreBadge score={result.recommended.condition_score} label={result.recommended.condition_label} />
            </div>
            <div className="font-label-md text-label-md font-bold text-on-surface">
              {result.recommended.nama_halte}
            </div>
            <div className="mb-1.5 text-label-sm text-on-surface-variant">{result.recommended.kelurahan}</div>
            <div className="flex items-center gap-1 text-label-sm text-on-surface-variant">
              <span className="material-symbols-outlined text-[16px]">directions_walk</span>
              {result.recommended.walk_minutes} menit &middot; {result.recommended.distance_m} m
            </div>

            {result.nearest && (
              <div className="mt-2.5 flex items-start gap-2 rounded-md border border-border-low bg-surface-subtle p-2 text-label-sm text-on-surface-variant">
                <span className="material-symbols-outlined mt-0.5 shrink-0 text-[16px] text-outline">info</span>
                <span>
                  Halte terdekat sebenarnya <b className="text-on-surface">{result.nearest.nama_halte}</b> (
                  {conditionLabelText(result.nearest.condition_label)}, {result.nearest.walk_minutes} menit) tapi
                  kondisinya kurang baik &mdash; ditandai garis putus-putus abu-abu di peta.
                </span>
              </div>
            )}

            <div className="mt-2.5 border-t border-border-low pt-2 text-[11px] leading-relaxed text-on-surface-variant">
              {result.within_budget_count} halte tersurvei terjangkau dalam {result.budget_minutes} menit jalan kaki
              dari lokasimu. Rute mengikuti jaringan jalan sungguhan, bukan garis lurus.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
