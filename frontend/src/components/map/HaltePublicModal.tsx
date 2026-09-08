"use client";

import { useState } from "react";
import * as maplibregl from "maplibre-gl";

import { conditionColor, conditionLabelText } from "@/lib/conditionScore";
import { fetchRouteToHalte } from "@/lib/fetchSafeRoute";
import CommentSection from "@/components/map/CommentSection";
import MediaCarousel from "@/components/map/MediaCarousel";
import type { HalteFeature, HalteProperties } from "@/types/halte";

interface HaltePublicModalProps {
  feature: HalteFeature | null;
  onClose: () => void;
  /**
   * When provided, "Navigasi ke Halte Ini" draws the walking route on this
   * map and closes the modal so the route is visible. Omitted wherever no
   * map is around to draw on.
   */
  map?: maplibregl.Map;
}

const ATTRIBUTE_ROWS: Array<{ key: keyof HalteProperties; label: string; icon: string }> = [
  { key: "cctv", label: "CCTV", icon: "videocam" },
  { key: "lighting", label: "Penerangan", icon: "lightbulb" },
  { key: "sidewalk_condition", label: "Trotoar", icon: "directions_walk" },
  { key: "route_info_signage", label: "Papan Info Rute", icon: "signpost" },
  { key: "canopy", label: "Kanopi / Peneduh", icon: "roofing" },
];

// Dot-only indicator (green/red/grey) -- no "Tersedia"/"Tidak Ada"/"Tidak
// Disebutkan" text label anymore, the color alone carries the meaning here.
function stateColor(value: string): string {
  if (value === "ada") return "bg-safety-green";
  if (value === "tidak") return "bg-alert-red";
  return "bg-outline-variant";
}

/**
 * Public-facing halte detail -- deliberately a smaller subset of
 * HalteDetailModal's content (see HalteDetailModal.tsx): just identity,
 * facilities, media and comments. No survey metadata (ID, survey date, field
 * notes, coordinates, task dispatch) -- those are DISHUB-internal, and the
 * team asked for the wording here to not read like an internal survey report.
 */
const NAV_SOURCE_ID = "public-halte-route";
const NAV_LAYER_ID = "public-halte-route-line";

type NavStatus = "idle" | "locating" | "loading" | "error";

export default function HaltePublicModal({ feature, onClose, map }: HaltePublicModalProps) {
  const [navStatus, setNavStatus] = useState<NavStatus>("idle");
  const [navError, setNavError] = useState<string | null>(null);

  if (!feature) return null;
  const p = feature.properties;

  function handleNavigate() {
    if (!map) return;
    if (!("geolocation" in navigator)) {
      setNavStatus("error");
      setNavError("Browser ini tidak mendukung geolokasi.");
      return;
    }

    setNavStatus("locating");
    setNavError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setNavStatus("loading");
        fetchRouteToHalte(pos.coords.latitude, pos.coords.longitude, p.halte_id)
          .then((option) => {
            const routeGeojson: GeoJSON.FeatureCollection = {
              type: "FeatureCollection",
              features: [{ type: "Feature", properties: {}, geometry: option.route as GeoJSON.LineString }],
            };
            const source = map.getSource(NAV_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
            if (source) {
              source.setData(routeGeojson);
            } else {
              map.addSource(NAV_SOURCE_ID, { type: "geojson", data: routeGeojson });
              map.addLayer({
                id: NAV_LAYER_ID,
                type: "line",
                source: NAV_SOURCE_ID,
                layout: { "line-cap": "round", "line-join": "round" },
                paint: { "line-color": "#2563eb", "line-width": 5 },
              });
            }

            const bounds = new maplibregl.LngLatBounds(option.route.coordinates[0], option.route.coordinates[0]);
            for (const c of option.route.coordinates) bounds.extend(c as [number, number]);
            map.fitBounds(bounds, { padding: 60, maxZoom: 17, duration: 800 });

            setNavStatus("idle");
            onClose();
          })
          .catch((err: unknown) => {
            setNavStatus("error");
            setNavError(err instanceof Error ? err.message : "Gagal memuat rute.");
          });
      },
      (geoErr) => {
        setNavStatus("error");
        setNavError(
          geoErr.code === geoErr.PERMISSION_DENIED
            ? "Izin lokasi ditolak. Aktifkan izin lokasi di browser untuk memakai fitur ini."
            : "Gagal mendapatkan lokasi kamu.",
        );
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  const navBusy = navStatus === "locating" || navStatus === "loading";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto scrollbar-hide rounded-xl border border-border-low bg-surface p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-border-low pb-4">
          <div>
            <h3 className="font-headline-md text-[20px] font-bold text-on-surface">{p.nama_halte}</h3>
            <p className="font-label-sm text-[12px] text-on-surface-variant">
              Kelurahan {p.kelurahan}, Kecamatan {p.kecamatan}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-alert-red hover:text-on-error border border-alert-red p-1.5 rounded-lg hover:bg-alert-red transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="mt-4 flex flex-col gap-4">
          <div className="relative h-56 w-full rounded-lg overflow-hidden bg-surface-container border border-border-low">
            <MediaCarousel key={p.halte_id} media={p.media} alt={p.nama_halte} />
            <div className="pointer-events-none absolute top-3 left-3 bg-surface/90 backdrop-blur-sm px-3 py-1 rounded-lg border border-border-low shadow-sm flex items-center gap-2">
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: conditionColor(p.condition_label) }} />
              <span className="font-label-md text-[13px] font-bold text-on-surface">
                {conditionLabelText(p.condition_label)}
              </span>
            </div>
          </div>

          <div>
            <h4 className="font-label-md text-[13px] font-bold text-on-surface mb-2">Ketersediaan Fasilitas</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {ATTRIBUTE_ROWS.map(({ key, label, icon }) => (
                <div key={key} className="flex items-center gap-2 p-2.5 rounded-lg border border-border-low bg-surface">
                  <span className="material-symbols-outlined text-outline text-[18px]">{icon}</span>
                  <span className="font-label-sm text-[12px] text-on-surface font-medium">{label}</span>
                  <span className={`ml-auto h-2.5 w-2.5 shrink-0 rounded-full ${stateColor(p[key] as string)}`} />
                </div>
              ))}
            </div>
          </div>

          {map && (
            <div>
              <button
                onClick={handleNavigate}
                disabled={navBusy}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-transport-blue px-4 py-2.5 font-label-md text-label-md font-bold text-on-primary transition-colors hover:bg-primary disabled:cursor-not-allowed disabled:opacity-70"
              >
                <span className="material-symbols-outlined text-[18px]">
                  {navBusy ? "progress_activity" : "directions_walk"}
                </span>
                {navStatus === "locating"
                  ? "Mencari lokasi..."
                  : navStatus === "loading"
                    ? "Menghitung rute..."
                    : "Navigasi ke Halte Ini"}
              </button>
              {navError && <p className="mt-1.5 text-label-sm text-alert-red">{navError}</p>}
            </div>
          )}

          <CommentSection key={p.halte_id} halteId={p.halte_id} />
        </div>
      </div>
    </div>
  );
}
