"use client";

import { useEffect, useMemo } from "react";

import { MAX_PHOTOS, MAX_PHOTO_BYTES, PHOTO_ACCEPT, mb } from "@/lib/uploadLimits";

interface PhotoPickerProps {
  /** The files chosen so far, in the order they will be uploaded. */
  photos: File[];
  onChange: (photos: File[]) => void;
  /** Reports a refusal (too big, too many) or clears it on a good pick. */
  onError: (message: string | null) => void;
  /** Shown when nothing is selected yet, e.g. "Tambah foto perbaikan (opsional)". */
  idleLabel: string;
  /** Rendered under the thumbnails, e.g. "Maksimal 5 foto, 15 MB per foto." */
  hint?: string;
}

/**
 * Multi-photo picker shared by the two places a photo can be uploaded from --
 * the citizen "Buat Laporan" page and the technician's task report. Shared
 * rather than duplicated because the two must agree on the caps: they are
 * enforced per file here and again on the server, and two copies of "15 MB"
 * is exactly how one of them ends up saying 5 MB a year from now.
 *
 * Picking more files APPENDS to the current selection instead of replacing it,
 * so photos can be added in several goes -- the usual phone flow is one shot
 * now, another after walking around the halte.
 */
export default function PhotoPicker({ photos, onChange, onError, idleLabel, hint }: PhotoPickerProps) {
  // Preview URLs for the chosen files. Rebuilt whenever the selection changes
  // and revoked on the way out: a blob URL pins its whole image in memory for
  // the life of the tab, and a set of phone photos is not small.
  const previews = useMemo(() => photos.map((file) => URL.createObjectURL(file)), [photos]);
  useEffect(() => () => previews.forEach((url) => URL.revokeObjectURL(url)), [previews]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    // Cleared straight away so re-picking the same file still fires `change` --
    // otherwise removing a photo and re-adding it silently does nothing.
    e.target.value = "";
    if (picked.length === 0) return;

    const oversized = picked.filter((file) => file.size > MAX_PHOTO_BYTES);
    if (oversized.length > 0) {
      onError(
        oversized.length === 1
          ? `${oversized[0].name} lebih dari ${mb(MAX_PHOTO_BYTES)}.`
          : `${oversized.length} foto lebih dari ${mb(MAX_PHOTO_BYTES)}.`,
      );
      return;
    }

    const merged = [...photos, ...picked];
    if (merged.length > MAX_PHOTOS) {
      onError(`Maksimal ${MAX_PHOTOS} foto. Sudah terpilih ${photos.length}.`);
      return;
    }

    onError(null);
    onChange(merged);
  }

  function removeAt(index: number) {
    onError(null);
    onChange(photos.filter((_, i) => i !== index));
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border-low bg-surface-container-low p-2.5 text-label-sm text-on-surface-variant">
        <span className="material-symbols-outlined text-[18px]">photo_camera</span>
        <span className="flex-1 truncate">
          {photos.length === 0 ? idleLabel : `${photos.length} foto dipilih`}
        </span>
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-transport-blue text-on-primary">
          <span className="material-symbols-outlined text-[16px]">add</span>
        </span>
        <input type="file" multiple accept={PHOTO_ACCEPT} onChange={handleChange} className="hidden" />
      </label>

      {photos.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {photos.map((file, index) => (
            <div
              key={`${file.name}-${file.size}-${index}`}
              className="relative h-16 w-16 overflow-hidden rounded-md border border-border-low bg-surface-container-low"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previews[index]} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => removeAt(index)}
                aria-label={`Hapus ${file.name}`}
                className="absolute top-0.5 right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-white"
              >
                <span className="material-symbols-outlined text-[14px]">close</span>
              </button>
            </div>
          ))}
        </div>
      )}

      <p className="text-label-sm text-[11px] text-on-surface-variant">
        {hint ?? `Maksimal ${MAX_PHOTOS} foto, ${mb(MAX_PHOTO_BYTES)} per foto (JPEG/PNG/WebP).`}
      </p>
    </div>
  );
}
