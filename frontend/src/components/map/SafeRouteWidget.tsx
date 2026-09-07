"use client";

import { useCallback, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";

import { fetchSafeRoute } from "@/lib/fetchSafeRoute";
import { conditionColor, conditionLabelText } from "@/lib/conditionScore";
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
 * Placement/styling here is intentionally plain (a floating button + a plain
 * result card) -- functionality first, revisit the visual design once the
 * backend behavior is settled.
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
    // Desktop-only for now -- would collide with PublicMobileSheet's bottom
    // peek bar below md until this gets its own mobile placement pass.
    <div className="absolute bottom-margin-page left-margin-page z-20 hidden max-w-xs flex-col gap-2 md:flex">
      <button
        onClick={handleClick}
        disabled={busy}
        className="flex items-center gap-2 self-start rounded-full bg-transport-blue px-4 py-2.5 font-label-md text-label-md font-bold text-on-primary shadow-lg transition-colors hover:bg-primary disabled:opacity-70"
      >
        <span className="material-symbols-outlined text-[20px]">
          {busy ? "progress_activity" : "my_location"}
        </span>
        {status === "locating" ? "Mencari lokasi..." : status === "loading" ? "Menghitung rute..." : "Halte Teraman Terdekat"}
      </button>

      {error && (
        <div className="rounded-lg bg-error-container px-3 py-2 text-label-sm text-on-error-container shadow-lg">
          {error}
        </div>
      )}

      {result && (
        <div className="rounded-lg border border-border-low bg-surface p-3 shadow-lg">
          <div className="mb-1 flex items-center gap-2">
            <span
              className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: conditionColor(result.recommended.condition_label) }}
            />
            <span className="font-label-md text-label-md font-bold text-on-surface">
              {result.recommended.nama_halte}
            </span>
          </div>
          <div className="text-label-sm text-on-surface-variant">
            {conditionLabelText(result.recommended.condition_label)} · {result.recommended.walk_minutes} menit jalan
            kaki ({result.recommended.distance_m}m)
          </div>

          {result.nearest && (
            <div className="mt-2 border-t border-border-low pt-2 text-label-sm text-on-surface-variant">
              Halte terdekat sebenarnya <b className="text-on-surface">{result.nearest.nama_halte}</b> (
              {conditionLabelText(result.nearest.condition_label)}, {result.nearest.walk_minutes} menit) kondisinya
              kurang baik -- garis putus-putus di peta.
            </div>
          )}

          <div className="mt-2 text-[11px] text-on-surface-variant">
            {result.within_budget_count} halte terjangkau dalam {result.budget_minutes} menit jalan kaki dari titik
            kamu.
          </div>
        </div>
      )}
    </div>
  );
}
