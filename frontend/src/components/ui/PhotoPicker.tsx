"use client";

import { useEffect, useMemo, useState } from "react";

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
  // Remounts the input so a file can be picked again after being removed, but
  // ONLY while nothing is selected -- see the note on the input below.
  const [inputKey, setInputKey] = useState(0);

  // Preview URLs for the chosen files. Rebuilt whenever the selection changes
  // and revoked on the way out: a blob URL pins its whole image in memory for
  // the life of the tab, and a set of phone photos is not small.
  const previews = useMemo(() => photos.map((file) => URL.createObjectURL(file)), [photos]);
  useEffect(() => () => previews.forEach((url) => URL.revokeObjectURL(url)), [previews]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
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
    const next = photos.filter((_, i) => i !== index);
    // Remount only once the selection is empty, which is the one moment there
    // is no held File whose permission the remount could take away.
    if (next.length === 0) setInputKey((k) => k + 1);
    onError(null);
    onChange(next);
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
        {/*
          The input's value is deliberately NOT cleared after a pick.

          Clearing it is the standard trick for letting someone re-pick the same
          file, because a file input only fires `change` when its value actually
          changes -- the first version of this component did exactly that. It
          had to go: on Android a picked photo comes back as a content:// URI
          whose read permission belongs to the input's current selection, and
          resetting the input can revoke it. The browser then cannot produce the
          upload body at all, and the failure is silent: the POST goes out, the
          body never arrives, and the server eventually gives up while the
          citizen watches "Mengirim..." -- reproduced from production logs,
          where nginx logged a 408 and FastAPI never saw the request.

          Re-pickability is kept the safe way instead: `key` changes only when
          the selection is empty.
        */}
        <input
          key={inputKey}
          type="file"
          multiple
          accept={PHOTO_ACCEPT}
          onChange={handleChange}
          className="hidden"
        />
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

/** How long one photo gets to prove it is still readable. */
const READ_PROBE_TIMEOUT_MS = 8_000;

/**
 * The first selected photo the browser can no longer read, or null if all are
 * fine.
 *
 * Worth the one byte per photo it costs, because the alternative failure is
 * the worst one this feature has: a File that cannot be read still lets the
 * POST start, its body simply never completes, and nothing anywhere says so.
 * The person sees "Mengirim..." until they give up, nginx times out its body
 * read, and FastAPI never receives the request -- so there is no server-side
 * error to look at afterwards either. Checking readability first turns that
 * silence into a message naming the photo.
 *
 * Bounded by a timeout rather than left to reject on its own: a file backed by
 * a cloud photo library blocks while it downloads instead of failing, which is
 * the same indefinite hang one step earlier.
 */
export async function findUnreadablePhoto(files: File[]): Promise<File | null> {
  for (const file of files) {
    try {
      await Promise.race([
        file.slice(0, 1).arrayBuffer(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("waktu baca berkas habis")), READ_PROBE_TIMEOUT_MS),
        ),
      ]);
    } catch {
      return file;
    }
  }
  return null;
}
