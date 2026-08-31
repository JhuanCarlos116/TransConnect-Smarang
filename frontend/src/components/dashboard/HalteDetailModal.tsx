"use client";

import { useState } from "react";

import { conditionColor, conditionLabelText } from "@/lib/conditionScore";
import type { HalteFeature, HalteMediaItem, HalteProperties } from "@/types/halte";

interface HalteDetailModalProps {
  feature: HalteFeature | null;
  onClose: () => void;
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

interface LightboxProps {
  media: HalteMediaItem[];
  index: number;
  onIndexChange: (i: number) => void;
  onClose: () => void;
  alt: string;
}

/** Full-view overlay for a single photo, stacked above the detail modal itself (z-[60] > z-50). */
function Lightbox({ media, index, onIndexChange, onClose, alt }: LightboxProps) {
  const item = media[index];
  const hasMultiple = media.length > 1;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        aria-label="Tutup"
        className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70"
      >
        <span className="material-symbols-outlined text-[22px]">close</span>
      </button>

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={item.url}
        alt={alt}
        className="max-h-full max-w-full object-contain"
        onClick={(e) => e.stopPropagation()}
      />

      {hasMultiple && (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onIndexChange((index - 1 + media.length) % media.length);
            }}
            aria-label="Sebelumnya"
            className="absolute left-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70"
          >
            <span className="material-symbols-outlined text-[24px]">chevron_left</span>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onIndexChange((index + 1) % media.length);
            }}
            aria-label="Berikutnya"
            className="absolute right-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70"
          >
            <span className="material-symbols-outlined text-[24px]">chevron_right</span>
          </button>
          <span className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 font-label-sm text-[12px] text-white">
            {index + 1}/{media.length}
          </span>
        </>
      )}
    </div>
  );
}

interface MediaCarouselProps {
  media: HalteMediaItem[];
  alt: string;
}

/**
 * Every survey point has 2-5 field photos and 18 of 42 have one video, in
 * original upload order (see clean_survey_export.py's pick_media) -- an
 * earlier version of this pipeline kept only the first photo and dropped
 * every video outright.
 *
 * Rendered with `key={halte_id}` by the parent, so switching to a different
 * halte remounts this fresh (index back to 0) instead of needing an effect
 * to reset state in response to a prop change.
 */
function MediaCarousel({ media, alt }: MediaCarouselProps) {
  const [index, setIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  if (media.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center text-label-sm text-on-surface-variant">
        Foto survei tidak tersedia
      </div>
    );
  }

  const item = media[index];
  const hasMultiple = media.length > 1;

  return (
    <>
      {item.type === "video" ? (
        <video src={item.url} controls className="h-full w-full bg-black object-contain" />
      ) : (
        <button
          onClick={() => setLightboxOpen(true)}
          className="group relative block h-full w-full cursor-zoom-in"
          aria-label="Lihat foto penuh"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={item.url} alt={alt} className="h-full w-full object-cover" />
          <span className="absolute bottom-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition-opacity group-hover:opacity-100">
            <span className="material-symbols-outlined text-[16px]">open_in_full</span>
          </span>
        </button>
      )}

      {hasMultiple && (
        <>
          <button
            onClick={() => setIndex((i) => (i - 1 + media.length) % media.length)}
            aria-label="Sebelumnya"
            className="absolute left-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/70"
          >
            <span className="material-symbols-outlined text-[20px]">chevron_left</span>
          </button>
          <button
            onClick={() => setIndex((i) => (i + 1) % media.length)}
            aria-label="Berikutnya"
            className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/70"
          >
            <span className="material-symbols-outlined text-[20px]">chevron_right</span>
          </button>

          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
            {media.map((m, i) => (
              <button
                key={m.url}
                onClick={() => setIndex(i)}
                aria-label={`Media ${i + 1} dari ${media.length}`}
                className={`h-1.5 rounded-full transition-all ${
                  i === index ? "w-4 bg-white" : "w-1.5 bg-white/60"
                }`}
              />
            ))}
          </div>

          <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 font-label-sm text-[11px] text-white">
            {item.type === "video" && <span className="material-symbols-outlined text-[13px]">videocam</span>}
            {index + 1}/{media.length}
          </span>
        </>
      )}

      {lightboxOpen && (
        <Lightbox media={media} index={index} onIndexChange={setIndex} onClose={() => setLightboxOpen(false)} alt={alt} />
      )}
    </>
  );
}

export default function HalteDetailModal({ feature, onClose }: HalteDetailModalProps) {
  if (!feature) return null;
  const p = feature.properties;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto scrollbar-hide rounded-xl border border-border-low bg-surface p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
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
            className="text-alert-red hover:text-on-error border border-alert-red p-1.5 rounded-lg hover:bg-alert-red transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="mt-4 flex flex-col gap-4">
          {/* Media carousel & score banner */}
          <div className="relative h-56 w-full rounded-lg overflow-hidden bg-surface-container border border-border-low">
            <MediaCarousel key={p.halte_id} media={p.media} alt={p.nama_halte} />
            <div className="pointer-events-none absolute top-3 left-3 bg-surface/90 backdrop-blur-sm px-3 py-1 rounded-lg border border-border-low shadow-sm flex items-center gap-2">
              <span
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: conditionColor(p.condition_label) }}
              />
              <span className="font-label-md text-[13px] font-bold text-on-surface">
                {conditionLabelText(p.condition_label)} (Skor: {p.condition_score}/100)
              </span>
            </div>
            {p.survey_date && (
              <div className="pointer-events-none absolute bottom-3 right-3 bg-black/70 text-white font-label-sm text-[11px] px-2.5 py-1 rounded-md">
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
        </div>
      </div>
    </div>
  );
}
