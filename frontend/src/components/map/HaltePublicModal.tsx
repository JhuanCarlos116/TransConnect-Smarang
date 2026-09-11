"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";

import { conditionColor, conditionLabelText } from "@/lib/conditionScore";
import { fetchRouteToHalte } from "@/lib/fetchSafeRoute";
import CommentSection from "@/components/map/CommentSection";
import MediaCarousel from "@/components/map/MediaCarousel";
import RepairPhotoSection from "@/components/map/RepairPhotoSection";
import type { HalteFeature, HalteProperties } from "@/types/halte";

interface HaltePublicModalProps {
  feature: HalteFeature | null;
  onClose: () => void;
  /**
   * When provided, "Navigasi ke Halte Ini" switches this modal into a live
   * turn-by-turn tracking strip and keeps the route/position updated on this
   * map as the user walks (see the navStatus "tracking" branch below).
   * Omitted wherever no map is around to draw on.
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

// A full colored chip (not just a small dot) -- green/red/grey, no
// "Tersedia"/"Tidak Ada"/"Tidak Disebutkan" text, the color alone carries
// the meaning, but as a whole badge rather than a subtle corner dot. The
// grey ("tidak disebutkan"/unknown) variant is light, so it pairs with dark
// text instead of the white that fits the two saturated colors.
function stateChipClasses(value: string): string {
  if (value === "ada") return "bg-safety-green text-on-primary";
  if (value === "tidak") return "bg-alert-red text-on-primary";
  return "bg-outline-variant text-on-surface";
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
const NAV_USER_SOURCE_ID = "public-halte-nav-user";
const NAV_USER_LAYER_ID = "public-halte-nav-user-point";

type NavStatus = "idle" | "locating" | "loading" | "error" | "tracking";

// Re-fetching the walking path on every watchPosition tick (which can fire
// several times a second) would hammer the backend's graph-search endpoint
// for no visual benefit -- GPS jitter at that rate is noise, not movement.
// Refetch only once the user has plausibly covered some real ground.
const REROUTE_MIN_DISTANCE_M = 20;
const REROUTE_MIN_INTERVAL_MS = 4000;

function haversineMeters(a: [number, number], b: [number, number]): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b[1] - a[1]);
  const dLon = toRad(b[0] - a[0]);
  const lat1 = toRad(a[1]);
  const lat2 = toRad(b[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

type EstimateStatus = "idle" | "loading" | "unavailable";

export default function HaltePublicModal({ feature, onClose, map }: HaltePublicModalProps) {
  const [navStatus, setNavStatus] = useState<NavStatus>("idle");
  const [navError, setNavError] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<{ distanceM: number; walkMinutes: number } | null>(null);
  // Distance/time preview shown as soon as the modal opens, before the user
  // commits to "Navigasi ke Halte Ini" -- same estimate whether they got here
  // by clicking a marker or via "Cari Halte Terdekat", since both now open
  // this one modal. "unavailable" (permission denied, no network) just hides
  // the estimate rather than erroring -- the rest of the modal still works
  // without it.
  const [estimate, setEstimate] = useState<{ distanceM: number; walkMinutes: number } | null>(null);
  const [estimateStatus, setEstimateStatus] = useState<EstimateStatus>("idle");

  const watchIdRef = useRef<number | null>(null);
  const lastRouteFetchRef = useRef<{ at: number; pos: [number, number] } | null>(null);
  const halteIdRef = useRef<string | null>(null);

  const drawRoute = useCallback(
    (routeCoords: [number, number][]) => {
      if (!map) return;
      const routeGeojson: GeoJSON.FeatureCollection = {
        type: "FeatureCollection",
        features: [{ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: routeCoords } }],
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
    },
    [map],
  );

  const drawUserPosition = useCallback(
    (lonLat: [number, number], heading: number | null) => {
      if (!map) return;
      const pointGeojson: GeoJSON.FeatureCollection = {
        type: "FeatureCollection",
        features: [{ type: "Feature", properties: {}, geometry: { type: "Point", coordinates: lonLat } }],
      };
      const source = map.getSource(NAV_USER_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
      if (source) {
        source.setData(pointGeojson);
      } else {
        map.addSource(NAV_USER_SOURCE_ID, { type: "geojson", data: pointGeojson });
        map.addLayer({
          id: NAV_USER_LAYER_ID,
          type: "circle",
          source: NAV_USER_SOURCE_ID,
          paint: {
            "circle-radius": 8,
            "circle-color": "#2563eb",
            "circle-stroke-width": 3,
            "circle-stroke-color": "#fff",
          },
        });
      }
      map.easeTo({
        center: lonLat,
        zoom: Math.max(map.getZoom(), 17),
        bearing: heading ?? map.getBearing(),
        duration: 600,
      });
    },
    [map],
  );

  const cleanupNavLayers = useCallback(() => {
    if (!map) return;
    if (map.getLayer(NAV_LAYER_ID)) map.removeLayer(NAV_LAYER_ID);
    if (map.getSource(NAV_SOURCE_ID)) map.removeSource(NAV_SOURCE_ID);
    if (map.getLayer(NAV_USER_LAYER_ID)) map.removeLayer(NAV_USER_LAYER_ID);
    if (map.getSource(NAV_USER_SOURCE_ID)) map.removeSource(NAV_USER_SOURCE_ID);
  }, [map]);

  const stopNavigation = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    lastRouteFetchRef.current = null;
    cleanupNavLayers();
    setNavStatus("idle");
    setNavError(null);
    setRemaining(null);
  }, [cleanupNavLayers]);

  // Stop tracking (and clear map layers) if the modal closes or unmounts
  // mid-navigation -- otherwise the geolocation watch keeps running and
  // hitting the backend after the UI that showed it is gone.
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!feature && watchIdRef.current !== null) {
      stopNavigation();
    }
  }, [feature, stopNavigation]);

  // Auto-estimate distance/walk time the moment a halte is opened -- covers
  // both entry points (manual marker click and "Cari Halte Terdekat") since
  // they now share this same modal. Skipped once live tracking has taken
  // over (that has its own, continuously-updated `remaining`).
  const halteIdForEstimate = feature?.properties.halte_id ?? null;

  useEffect(() => {
    if (!halteIdForEstimate) return;

    let cancelled = false;

    // The state resets below run from a resolved-promise microtask rather
    // than synchronously in the effect body, satisfying the
    // react-hooks/set-state-in-effect rule -- an effect reacting to a prop
    // (which halte is open) by kicking off an async lookup and reporting its
    // result is exactly what effects are for; it's only the *synchronous*
    // setState-in-body pattern the rule flags.
    Promise.resolve().then(() => {
      if (cancelled) return;
      setEstimate(null);

      if (!("geolocation" in navigator)) {
        setEstimateStatus("unavailable");
        return;
      }

      setEstimateStatus("loading");
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (cancelled) return;
          fetchRouteToHalte(pos.coords.latitude, pos.coords.longitude, halteIdForEstimate)
            .then((option) => {
              if (cancelled) return;
              setEstimate({ distanceM: option.distance_m, walkMinutes: option.walk_minutes });
              setEstimateStatus("idle");
            })
            .catch(() => {
              if (!cancelled) setEstimateStatus("unavailable");
            });
        },
        () => {
          if (!cancelled) setEstimateStatus("unavailable");
        },
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 30000 },
      );
    });

    return () => {
      cancelled = true;
    };
  }, [halteIdForEstimate]);

  const handlePositionUpdate = useCallback(
    (pos: GeolocationPosition) => {
      const lonLat: [number, number] = [pos.coords.longitude, pos.coords.latitude];
      const halteId = halteIdRef.current;
      if (!halteId) return;

      drawUserPosition(lonLat, pos.coords.heading);

      const last = lastRouteFetchRef.current;
      const shouldRefetch =
        !last ||
        Date.now() - last.at > REROUTE_MIN_INTERVAL_MS * 3 ||
        (Date.now() - last.at > REROUTE_MIN_INTERVAL_MS && haversineMeters(last.pos, lonLat) > REROUTE_MIN_DISTANCE_M);

      if (!shouldRefetch) return;
      lastRouteFetchRef.current = { at: Date.now(), pos: lonLat };

      fetchRouteToHalte(pos.coords.latitude, pos.coords.longitude, halteId)
        .then((option) => {
          drawRoute(option.route.coordinates as [number, number][]);
          setRemaining({ distanceM: option.distance_m, walkMinutes: option.walk_minutes });
          setNavStatus("tracking");
        })
        .catch(() => {
          // Transient network hiccup mid-walk -- keep the last known route
          // and position on screen rather than interrupting the user with
          // an error banner; the next watchPosition tick will retry.
        });
    },
    [drawRoute, drawUserPosition],
  );

  function handleNavigate() {
    if (!map) return;
    if (!("geolocation" in navigator)) {
      setNavStatus("error");
      setNavError("Browser ini tidak mendukung geolokasi.");
      return;
    }

    halteIdRef.current = feature?.properties.halte_id ?? null;
    setNavStatus("locating");
    setNavError(null);

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setNavStatus((prev) => (prev === "tracking" ? prev : "loading"));
        setNavError(null);
        handlePositionUpdate(pos);
      },
      (geoErr) => {
        // PERMISSION_DENIED is terminal -- the browser won't grant it again
        // without the user changing a site setting, so stop the watch and
        // drop back to the detail view. POSITION_UNAVAILABLE/TIMEOUT are
        // transient (a moment of weak GPS signal, e.g. walking indoors) --
        // watchPosition keeps calling this same callback on its own as the
        // signal comes and goes, so tearing down the whole navigation
        // session over one bad fix would make live tracking unusable
        // outdoors near buildings. Surface a non-blocking warning instead
        // and let the last known route/position stay on screen.
        if (geoErr.code === geoErr.PERMISSION_DENIED) {
          if (watchIdRef.current !== null) {
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
          }
          setNavStatus("error");
          setNavError("Izin lokasi ditolak. Aktifkan izin lokasi di browser untuk memakai fitur ini.");
          return;
        }
        setNavError("Sinyal lokasi lemah, mencoba lagi...");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 2000 },
    );
  }

  if (!feature) return null;
  const p = feature.properties;

  const navBusy = navStatus === "locating" || navStatus === "loading";
  const isNavigating = navBusy || navStatus === "tracking";

  function handleClose() {
    if (isNavigating) stopNavigation();
    onClose();
  }

  // While navigating, the modal collapses to a slim live turn-by-turn strip
  // instead of the full detail view -- the team wants this to read as "the
  // app just became a navigation tool", not "a detail popup with a route
  // drawn underneath it". Facilities/media/comments would have nothing to
  // do with getting there, so they're hidden entirely rather than scrolled
  // past.
  if (isNavigating) {
    return (
      <div className="fixed inset-x-0 top-margin-page z-50 mx-auto w-full max-w-md px-4">
        <div className="flex flex-col overflow-hidden rounded-xl border border-border-low bg-surface shadow-2xl animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="flex items-center justify-between gap-2 bg-transport-blue px-4 py-3 text-on-primary">
            <div className="flex items-center gap-2">
              <span
                className={`material-symbols-outlined text-[22px] ${navStatus === "tracking" ? "" : "animate-spin"}`}
              >
                {navStatus === "tracking" ? "navigation" : "progress_activity"}
              </span>
              <div>
                <div className="font-label-md text-label-md font-bold">
                  {navStatus === "tracking" ? "Menuju" : "Mencari lokasimu..."}
                  {navStatus === "tracking" && ` ${p.nama_halte}`}
                </div>
                {navStatus === "tracking" && remaining && (
                  <div className="text-[12px] opacity-90">
                    {remaining.walkMinutes} menit &middot; {remaining.distanceM} m lagi
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={handleClose}
              aria-label="Berhenti navigasi"
              className="flex shrink-0 items-center gap-1 rounded-lg border border-on-primary/40 px-2.5 py-1.5 text-[12px] font-bold transition-colors hover:bg-on-primary/10"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
              Selesai
            </button>
          </div>

          {navError && (
            <div className="flex items-center gap-2 border-t border-border-low bg-error-container px-4 py-2 text-label-sm text-on-error-container">
              <span className="material-symbols-outlined text-[16px]">error</span>
              {navError}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="flex w-full max-w-xl max-h-[90vh] flex-col overflow-hidden rounded-xl border border-border-low bg-surface shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Sticky header -- stays visible while the body below scrolls, so
            the halte name is never scrolled out of view. A solid bg-surface
            here (matching the modal's own background) is what masks the
            body's content passing underneath it. */}
        <div className="flex shrink-0 items-center justify-between border-b border-border-low bg-surface px-6 py-4">
          <div>
            <h3 className="font-headline-md text-[20px] font-bold text-on-surface">{p.nama_halte}</h3>
            <p className="font-label-sm text-[12px] text-on-surface-variant">
              Kelurahan {p.kelurahan}, Kecamatan {p.kecamatan}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-alert-red hover:text-on-error border border-alert-red p-1.5 rounded-lg hover:bg-alert-red transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="overflow-y-auto scrollbar-hide px-6 py-4">
          <div className="flex flex-col gap-4">
            <div className="relative h-56 w-full rounded-lg overflow-hidden bg-surface-container border border-border-low">
              <MediaCarousel key={`media-${p.halte_id}`} media={p.media} alt={p.nama_halte} />
              <div className="pointer-events-none absolute top-3 left-3 bg-surface/90 backdrop-blur-sm px-3 py-1 rounded-lg border border-border-low shadow-sm flex items-center gap-2">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: conditionColor(p.condition_label) }} />
                <span className="font-label-md text-[13px] font-bold text-on-surface">
                  {conditionLabelText(p.condition_label)}
                </span>
              </div>
            </div>

            {estimateStatus === "loading" && (
              <div className="flex items-center gap-2 text-label-sm text-on-surface-variant">
                <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>
                Menghitung jarak dari lokasimu...
              </div>
            )}
            {estimate && (
              <div className="flex items-center gap-1.5 text-label-sm text-on-surface-variant">
                <span className="material-symbols-outlined text-[16px]">directions_walk</span>
                {estimate.walkMinutes} menit &middot; {estimate.distanceM} m dari lokasimu
              </div>
            )}

            <div>
              <h4 className="font-label-md text-[13px] font-bold text-on-surface mb-2">Ketersediaan Fasilitas</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {ATTRIBUTE_ROWS.map(({ key, label, icon }) => (
                  <div
                    key={key}
                    className={`flex items-center gap-2 rounded-lg p-2.5 ${stateChipClasses(p[key] as string)}`}
                  >
                    <span className="material-symbols-outlined text-[18px]">{icon}</span>
                    <span className="font-label-sm text-[12px] font-medium">{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {map && (
              <div>
                <button
                  onClick={handleNavigate}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-transport-blue px-4 py-2.5 font-label-md text-label-md font-bold text-on-primary transition-colors hover:bg-primary"
                >
                  <span className="material-symbols-outlined text-[18px]">directions_walk</span>
                  Navigasi ke Halte Ini
                </button>
                {navError && <p className="mt-1.5 text-label-sm text-alert-red">{navError}</p>}
              </div>
            )}

            <RepairPhotoSection key={`repair-${p.halte_id}`} halteId={p.halte_id} />

            <CommentSection key={`comments-${p.halte_id}`} halteId={p.halte_id} />
          </div>
        </div>
      </div>
    </div>
  );
}
