"use client";

import { useEffect } from "react";
import * as maplibregl from "maplibre-gl";

import { HALTE_POINT_LAYER_ID } from "@/components/map/HalteLayer";
import { COMMUNITY_CLUSTER_LAYER_ID, COMMUNITY_POINT_LAYER_ID } from "@/components/map/CommunityMapsLayer";
import { ISOCHRONE_FILL_LAYER_ID } from "@/components/dashboard/IsochroneLayer";
import { POPULATION_FILL_LAYER_ID } from "@/components/dashboard/PopulationLayer";
import { RECOMMENDATION_POINT_LAYER_ID } from "@/components/dashboard/RecommendationLayer";
import { BUS_STOP_POINT_LAYER_ID } from "@/components/dashboard/BusStopLayer";

// Point layers that already own their own click popups -- a bus stop, halte
// marker, community-report point/cluster, or new-halte recommendation sitting
// inside a kelurahan/isochrone polygon takes precedence over this shared popup.
const MARKER_LAYER_IDS = [
  HALTE_POINT_LAYER_ID,
  COMMUNITY_POINT_LAYER_ID,
  COMMUNITY_CLUSTER_LAYER_ID,
  RECOMMENDATION_POINT_LAYER_ID,
  BUS_STOP_POINT_LAYER_ID,
];
const INFO_LAYER_IDS = [ISOCHRONE_FILL_LAYER_ID, POPULATION_FILL_LAYER_ID];

interface Panel {
  title: string;
  rows: { label: string; value: string }[];
  warning?: string;
}

function isochronePanel(properties: Record<string, unknown>): Panel {
  const p = properties as Record<string, number>;
  return {
    title: `Jangkauan ${p.minutes} menit jalan kaki`,
    rows: [
      { label: "Dari", value: `${p.halte_count} halte tersurvei` },
      { label: "Luas area", value: `${p.area_km2} km²` },
    ],
  };
}

function populationPanel(properties: Record<string, unknown>): Panel {
  const p = properties as Record<string, number | string>;
  const surveyCount = Number(p.halte_survey_count);
  return {
    title: String(p.kelurahan),
    rows: [
      { label: "Penduduk", value: `${Number(p.jumlah_penduduk).toLocaleString("id-ID")} jiwa` },
      { label: "Luas", value: `${p.luas_km2} km²` },
      { label: "Kepadatan", value: `${Number(p.kepadatan_per_km2).toLocaleString("id-ID")} jiwa/km²` },
      { label: "Halte tersurvei", value: `${surveyCount} titik` },
    ],
    warning:
      surveyCount === 0
        ? "Belum ada halte yang disurvei di kelurahan ini -- kondisi halte di sini belum diketahui, bukan berarti tidak ada halte sama sekali."
        : undefined,
  };
}

function buildPanel(layerId: string, properties: Record<string, unknown>): Panel | null {
  if (layerId === ISOCHRONE_FILL_LAYER_ID) return isochronePanel(properties);
  if (layerId === POPULATION_FILL_LAYER_ID) return populationPanel(properties);
  return null;
}

// Same treatment as HalteDetailModal's close button (border-alert-red,
// hover:bg-alert-red) -- MapLibre's own default close button is a plain gray
// "x" with no relation to the rest of the UI's styling.
const CLOSE_BUTTON_HTML =
  `<button data-close aria-label="Tutup" ` +
  `class="text-alert-red hover:text-on-error border border-alert-red rounded-lg p-1 hover:bg-alert-red transition-colors cursor-pointer" ` +
  `style="display:flex;align-items:center">` +
  `<span class="material-symbols-outlined" style="font-size:16px">close</span></button>`;

function panelHtml(panel: Panel, index: number, total: number): string {
  const nav =
    total > 1
      ? `<div style="display:flex;align-items:center;gap:2px">` +
        `<button data-prev style="cursor:pointer;border:none;background:none;padding:2px;display:flex;color:var(--color-on-surface-variant)" aria-label="Info sebelumnya">` +
        `<span class="material-symbols-outlined" style="font-size:16px">chevron_left</span></button>` +
        `<span style="font-size:11px;color:var(--color-on-surface-variant)">${index + 1}/${total}</span>` +
        `<button data-next style="cursor:pointer;border:none;background:none;padding:2px;display:flex;color:var(--color-on-surface-variant)" aria-label="Info berikutnya">` +
        `<span class="material-symbols-outlined" style="font-size:16px">chevron_right</span></button>` +
        `</div>`
      : "";

  const rows = panel.rows
    .map(
      (row) =>
        `<div style="margin-bottom:2px"><span style="color:var(--color-on-surface-variant)">${row.label}:</span> <b>${row.value}</b></div>`,
    )
    .join("");

  const warning = panel.warning
    ? `<div style="margin-top:8px;padding:6px 8px;border-radius:6px;background:#fef3c7;color:#92400e;font-size:11px;line-height:1.4">${panel.warning}</div>`
    : "";

  return (
    `<div style="font-family:system-ui,sans-serif;font-size:13px;min-width:180px;color:var(--color-on-surface)">` +
    `<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px">` +
    `<div style="font-weight:700;font-size:15px;color:var(--color-on-surface)">${panel.title}</div>` +
    `<div style="display:flex;align-items:center;gap:6px">${nav}${CLOSE_BUTTON_HTML}</div></div>` +
    rows +
    warning +
    `</div>`
  );
}

interface MapInfoPopupProps {
  map: maplibregl.Map;
}

/**
 * Kelurahan (population) and isochrone fill polygons cover a lot of the same
 * ground -- with both layers on, a click point can sit inside both at once.
 * Each layer used to register its own click popup, so a shared point opened
 * two maplibregl.Popups stacked on top of each other (the bug the user
 * screenshotted: a population popup with isochrone text bleeding through
 * behind it). This is the single click handler for both fill layers instead,
 * showing one popup with prev/next arrows to page between whichever panels
 * matched at that point -- one panel if only one layer is on/relevant, more
 * if several are.
 */
export default function MapInfoPopup({ map }: MapInfoPopupProps) {
  useEffect(() => {
    const handleClick = (e: maplibregl.MapMouseEvent) => {
      const markerLayers = MARKER_LAYER_IDS.filter((id) => map.getLayer(id));
      if (markerLayers.length > 0 && map.queryRenderedFeatures(e.point, { layers: markerLayers }).length > 0) {
        return;
      }

      const infoLayers = INFO_LAYER_IDS.filter((id) => map.getLayer(id));
      if (infoLayers.length === 0) return;

      const features = map.queryRenderedFeatures(e.point, { layers: infoLayers });
      if (features.length === 0) return;

      // One panel per matching layer, in the order MapLibre returned them
      // (top-to-bottom render order), deduplicated so e.g. two overlapping
      // isochrone bands don't produce two identical panels.
      const seen = new Set<string>();
      const panels: Panel[] = [];
      for (const feature of features) {
        const layerId = feature.layer.id;
        if (seen.has(layerId)) continue;
        seen.add(layerId);
        const panel = buildPanel(layerId, (feature.properties ?? {}) as Record<string, unknown>);
        if (panel) panels.push(panel);
      }
      if (panels.length === 0) return;

      const popupRef: { current?: maplibregl.Popup } = {};
      const container = document.createElement("div");
      const render = (index: number) => {
        container.innerHTML = panelHtml(panels[index], index, panels.length);
        container
          .querySelector("[data-prev]")
          ?.addEventListener("click", () => render((index - 1 + panels.length) % panels.length));
        container.querySelector("[data-next]")?.addEventListener("click", () => render((index + 1) % panels.length));
        container.querySelector("[data-close]")?.addEventListener("click", () => popupRef.current?.remove());
      };
      render(0);

      // closeButton: false -- MapLibre's default "x" is replaced by the
      // styled one baked into panelHtml above, matching HalteDetailModal.
      popupRef.current = new maplibregl.Popup({ offset: 8, closeButton: false })
        .setLngLat(e.lngLat)
        .setDOMContent(container)
        .addTo(map);
    };

    map.on("click", handleClick);
    return () => {
      map.off("click", handleClick);
    };
  }, [map]);

  return null;
}
