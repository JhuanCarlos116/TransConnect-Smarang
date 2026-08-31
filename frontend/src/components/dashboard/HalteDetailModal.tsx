"use client";

import { useState } from "react";

import { conditionColor, conditionLabelText } from "@/lib/conditionScore";
import type { HalteFeature, HalteProperties } from "@/types/halte";

interface HalteDetailModalProps {
  feature: HalteFeature | null;
  onClose: () => void;
  onFlyTo?: (feature: HalteFeature) => void;
}

const ATTRIBUTE_ROWS: Array<{ key: keyof HalteProperties; label: string; icon: string }> = [
  { key: "cctv", label: "CCTV Pengawas", icon: "videocam" },
  { key: "lighting", label: "Penerangan Jalan", icon: "lightbulb" },
  { key: "sidewalk_condition", label: "Kondisi Trotoar", icon: "directions_walk" },
  { key: "route_info_signage", label: "Papan Informasi Rute", icon: "signpost" },
  { key: "canopy", label: "Kanopi / Peneduh", icon: "roofing" },
];

function formatState(value: string): { text: string; colorClass: string } {
  if (value === "ada") return { text: "Tersedia & Baik", colorClass: "text-safety-green bg-green-50" };
  if (value === "tidak") return { text: "Tidak Ada / Rusak", colorClass: "text-alert-red bg-red-50" };
  return { text: "Tidak Disebutkan", colorClass: "text-on-surface-variant bg-surface-container" };
}

interface PhotoCarouselProps {
  photoUrls: string[];
  alt: string;
}

/**
 * Every survey point has 2-5 field photos (see clean_survey_export.py's
 * pick_photo_urls), not one -- an earlier version of the pipeline kept only
 * the first and silently dropped the rest.
 *
 * Rendered with `key={halte_id}` by the parent, so switching to a different
 * halte remounts this fresh (index back to 0) instead of needing an effect
 * to reset state in response to a prop change.
 */
function PhotoCarousel({ photoUrls, alt }: PhotoCarouselProps) {
  const [index, setIndex] = useState(0);

  if (photoUrls.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center text-label-sm text-on-surface-variant">
        Foto survei tidak tersedia
      </div>
    );
  }

  const hasMultiple = photoUrls.length > 1;

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={photoUrls[index]} alt={alt} className="h-full w-full object-cover" />

      {hasMultiple && (
        <>
          <button
            onClick={() => setIndex((i) => (i - 1 + photoUrls.length) % photoUrls.length)}
            aria-label="Foto sebelumnya"
            className="absolute left-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/70"
          >
            <span className="material-symbols-outlined text-[20px]">chevron_left</span>
          </button>
          <button
            onClick={() => setIndex((i) => (i + 1) % photoUrls.length)}
            aria-label="Foto berikutnya"
            className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/70"
          >
            <span className="material-symbols-outlined text-[20px]">chevron_right</span>
          </button>

          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
            {photoUrls.map((url, i) => (
              <button
                key={url}
                onClick={() => setIndex(i)}
                aria-label={`Foto ${i + 1} dari ${photoUrls.length}`}
                className={`h-1.5 w-1.5 rounded-full transition-all ${
                  i === index ? "w-4 bg-white" : "bg-white/60"
                }`}
              />
            ))}
          </div>

          <span className="absolute right-3 top-3 rounded-full bg-black/60 px-2 py-0.5 font-label-sm text-[11px] text-white">
            {index + 1}/{photoUrls.length}
          </span>
        </>
      )}
    </>
  );
}

export default function HalteDetailModal({ feature, onClose, onFlyTo }: HalteDetailModalProps) {
  if (!feature) return null;
  const p = feature.properties;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-xl border border-border-low bg-surface p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border-low pb-4">
          <div>
            <span className="font-label-sm text-[11px] font-bold uppercase tracking-wider text-transport-blue block">
              Evaluasi Fasilitas Lapangan • ID: {p.halte_id.slice(-6)}
            </span>
            <h3 className="font-headline-md text-[20px] font-bold text-on-surface mt-0.5">
              {p.nama_halte}
            </h3>
            <p className="font-label-sm text-[12px] text-on-surface-variant">
              Kelurahan {p.kelurahan}, Kecamatan {p.kecamatan}, Kota Semarang
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-on-surface-variant hover:text-on-surface p-1.5 rounded-lg hover:bg-surface-container transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="mt-4 flex flex-col gap-4">
          {/* Photo carousel & score banner */}
          <div className="relative h-56 w-full rounded-lg overflow-hidden bg-surface-container border border-border-low">
            <PhotoCarousel key={p.halte_id} photoUrls={p.photo_urls} alt={p.nama_halte} />
            <div className="absolute top-3 left-3 bg-surface/90 backdrop-blur-sm px-3 py-1 rounded-lg border border-border-low shadow-sm flex items-center gap-2">
              <span
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: conditionColor(p.condition_label) }}
              />
              <span className="font-label-md text-[13px] font-bold text-on-surface">
                {conditionLabelText(p.condition_label)} (Skor: {p.condition_score}/100)
              </span>
            </div>
            {p.survey_date && (
              <div className="absolute bottom-3 right-3 bg-black/70 text-white font-label-sm text-[11px] px-2.5 py-1 rounded-md">
                Survei: {p.survey_date}
              </div>
            )}
          </div>

          {/* Coordinates Info */}
          <div className="grid grid-cols-2 gap-2 text-label-sm text-[12px] bg-surface-container-low p-3 rounded-lg border border-border-low">
            <div>
              <span className="text-on-surface-variant block">Koordinat Longitude:</span>
              <span className="font-bold text-on-surface font-mono">{feature.geometry.coordinates[0].toFixed(6)}</span>
            </div>
            <div>
              <span className="text-on-surface-variant block">Koordinat Latitude:</span>
              <span className="font-bold text-on-surface font-mono">{feature.geometry.coordinates[1].toFixed(6)}</span>
            </div>
          </div>

          {/* Facility Attributes Checklist */}
          <div>
            <h4 className="font-label-md text-[13px] font-bold text-on-surface mb-1">
              Ketersediaan Fasilitas
            </h4>
            <p className="font-label-sm text-[11px] text-on-surface-variant mb-2">
              Hasil pengamatan manual tim survei di lapangan -- YOLOv8 belum terintegrasi ke aplikasi ini, jadi ini
              bukan deteksi otomatis.
            </p>
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

          {/* Field Notes (Catatan Lapangan) */}
          {p.catatan_lapangan && (
            <div className="rounded-lg border border-border-low bg-surface p-3">
              <div className="flex items-center gap-2 mb-1.5 font-label-md text-[13px] font-bold text-on-surface">
                <span className="material-symbols-outlined text-transport-blue text-[18px]">edit_note</span>
                Catatan Survei Lapangan (#timGOPEK)
              </div>
              <p className="font-body-md text-[13px] text-on-surface-variant leading-relaxed italic bg-surface-container-low p-2.5 rounded">
                &ldquo;{p.catatan_lapangan}&rdquo;
              </p>
            </div>
          )}

          {/* Actions. A "Dispatch Tim Perbaikan" button used to sit here,
              submitting to a modal that only ran a setTimeout and reported a
              fabricated success -- there is no real dispatch system behind
              it, so it is gone until there is. */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border-low">
            <button
              onClick={() => {
                onFlyTo?.(feature);
                onClose();
              }}
              className="px-4 py-2 rounded-lg border border-transport-blue text-transport-blue hover:bg-primary-fixed/30 font-label-md text-[13px] font-bold cursor-pointer flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[18px]">my_location</span>
              Lihat di Peta
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
