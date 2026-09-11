"use client";

import { useCallback, useState } from "react";

import { fetchSafeRoute } from "@/lib/fetchSafeRoute";
import type { HalteFeature } from "@/types/halte";

interface SafeRouteWidgetProps {
  halteFeatures: HalteFeature[];
  onFound: (feature: HalteFeature) => void;
}

type Status = "idle" | "locating" | "loading" | "error";

/**
 * "Cari Halte Terdekat" -- finds the nearest surveyed halte reachable by
 * the pedestrian network from the user's current position, then opens the
 * exact same detail popup a manual marker click would (HaltePublicModal),
 * via onFound. No separate mini popup any more -- the team wants one
 * consistent halte detail experience regardless of how you got there;
 * "Navigasi ke Halte Ini" inside that modal is what actually starts
 * turn-by-turn navigation (see HaltePublicModal's live nav mode).
 *
 * Backend still computes a *safety-aware* recommendation (best condition
 * score within a 15-min walking budget, see route.py), but "nearest" is
 * simpler and matches what the team asked for here -- so when the network-
 * nearest halte differs from that recommendation, we use `nearest` instead.
 */
export default function SafeRouteWidget({ halteFeatures, onFound }: SafeRouteWidgetProps) {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

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
        setStatus("loading");
        fetchSafeRoute(latitude, longitude)
          .then((data) => {
            const nearestOption = data.nearest ?? data.recommended;
            const feature = halteFeatures.find((f) => f.properties.halte_id === nearestOption.halte_id);
            if (!feature) {
              setStatus("error");
              setError("Halte terdekat ditemukan tapi datanya tidak lengkap. Coba lagi.");
              return;
            }
            setStatus("idle");
            onFound(feature);
          })
          .catch((err: unknown) => {
            setStatus("error");
            setError(err instanceof Error ? err.message : "Gagal mencari halte terdekat.");
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
  }, [halteFeatures, onFound]);

  const busy = status === "locating" || status === "loading";

  return (
    <div className="relative">
      <button
        onClick={handleClick}
        disabled={busy}
        aria-label="Cari Halte Terdekat"
        title="Cari Halte Terdekat"
        className="flex h-12 w-12 items-center justify-center rounded-full bg-transport-blue text-on-primary shadow-lg transition-colors hover:bg-primary disabled:cursor-not-allowed disabled:opacity-70"
      >
        {busy ? (
          <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>
        ) : (
          // Search glass with a small bus badge -- "find a nearby stop", not
          // just a generic location pin.
          <span className="relative inline-flex h-5 w-5 shrink-0 items-center justify-center">
            <span className="material-symbols-outlined text-[20px] leading-none">search</span>
            <span className="absolute -bottom-1 -right-1 flex h-3 w-3 items-center justify-center rounded-full bg-on-primary">
              <span className="material-symbols-outlined leading-none text-transport-blue" style={{ fontSize: "7px" }}>
                directions_bus
              </span>
            </span>
          </span>
        )}
      </button>

      {error && (
        <div className="absolute right-full top-0 mr-2 flex w-72 max-w-[calc(100vw-2rem)] items-start gap-2 rounded-lg bg-error-container px-3 py-2 text-label-sm text-on-error-container shadow-lg">
          <span className="material-symbols-outlined shrink-0 text-[18px]">error</span>
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)} aria-label="Tutup" className="shrink-0 opacity-80 hover:opacity-100">
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      )}
    </div>
  );
}
