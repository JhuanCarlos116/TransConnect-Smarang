"use client";

import { conditionColor, conditionLabelText } from "@/lib/conditionScore";
import CommentSection from "@/components/map/CommentSection";
import MediaCarousel from "@/components/map/MediaCarousel";
import type { HalteFeature, HalteProperties } from "@/types/halte";

interface HaltePublicModalProps {
  feature: HalteFeature | null;
  onClose: () => void;
}

const ATTRIBUTE_ROWS: Array<{ key: keyof HalteProperties; label: string; icon: string }> = [
  { key: "cctv", label: "CCTV", icon: "videocam" },
  { key: "lighting", label: "Penerangan", icon: "lightbulb" },
  { key: "sidewalk_condition", label: "Trotoar", icon: "directions_walk" },
  { key: "route_info_signage", label: "Papan Info Rute", icon: "signpost" },
  { key: "canopy", label: "Kanopi / Peneduh", icon: "roofing" },
];

function formatState(value: string): { text: string; colorClass: string } {
  if (value === "ada") return { text: "Tersedia", colorClass: "text-safety-green bg-green-50" };
  if (value === "tidak") return { text: "Tidak Ada", colorClass: "text-alert-red bg-red-50" };
  return { text: "Tidak Disebutkan", colorClass: "text-on-surface-variant bg-surface-container" };
}

/**
 * Public-facing halte detail -- deliberately a smaller subset of
 * HalteDetailModal's content (see HalteDetailModal.tsx): just identity,
 * facilities, media and comments. No survey metadata (ID, survey date, field
 * notes, coordinates, task dispatch) -- those are DISHUB-internal, and the
 * team asked for the wording here to not read like an internal survey report.
 */
export default function HaltePublicModal({ feature, onClose }: HaltePublicModalProps) {
  if (!feature) return null;
  const p = feature.properties;

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
              {ATTRIBUTE_ROWS.map(({ key, label, icon }) => {
                const state = formatState(p[key] as string);
                return (
                  <div
                    key={key}
                    className="flex items-center justify-between p-2.5 rounded-lg border border-border-low bg-surface"
                  >
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-outline text-[18px]">{icon}</span>
                      <span className="font-label-sm text-[12px] text-on-surface font-medium">{label}</span>
                    </div>
                    <span className={`font-label-sm text-[11px] font-bold px-2 py-0.5 rounded ${state.colorClass}`}>
                      {state.text}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <CommentSection key={p.halte_id} halteId={p.halte_id} />
        </div>
      </div>
    </div>
  );
}
