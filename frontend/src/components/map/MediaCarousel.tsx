"use client";

import { useState } from "react";

import type { HalteMediaItem } from "@/types/halte";

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
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4" onClick={onClose}>
      <button
        onClick={onClose}
        aria-label="Tutup"
        className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70"
      >
        <span className="material-symbols-outlined text-[22px]">close</span>
      </button>

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={item.url} alt={alt} className="max-h-full max-w-full object-contain" onClick={(e) => e.stopPropagation()} />

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
 * original upload order (see clean_survey_export.py's pick_media).
 *
 * Shared by HalteDetailModal (DISHUB dashboard) and HaltePublicModal (public
 * map) -- render with `key={halte_id}` from the parent so switching to a
 * different halte remounts this fresh (index back to 0).
 */
export default function MediaCarousel({ media, alt }: MediaCarouselProps) {
  const [index, setIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  if (media.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center text-label-sm text-on-surface-variant">
        Foto tidak tersedia
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
        <button onClick={() => setLightboxOpen(true)} className="group relative block h-full w-full cursor-zoom-in" aria-label="Lihat foto penuh">
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
                key={`${i}-${m.url}`}
                onClick={() => setIndex(i)}
                aria-label={`Media ${i + 1} dari ${media.length}`}
                className={`h-1.5 rounded-full transition-all ${i === index ? "w-4 bg-white" : "w-1.5 bg-white/60"}`}
              />
            ))}
          </div>

          <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 font-label-sm text-[11px] text-white">
            {item.type === "video" && <span className="material-symbols-outlined text-[13px]">videocam</span>}
            {index + 1}/{media.length}
          </span>
        </>
      )}

      {lightboxOpen && <Lightbox media={media} index={index} onIndexChange={setIndex} onClose={() => setLightboxOpen(false)} alt={alt} />}
    </>
  );
}
