"use client";

import { useEffect, useState } from "react";

import { fetchApprovedRepairPhotos } from "@/lib/fetchTasks";
import { resolveUploadUrl } from "@/lib/resolveUploadUrl";
import type { ApprovedRepairPhoto } from "@/types/task";

interface RepairPhotoSectionProps {
  halteId: string;
}

/**
 * Shows DISHUB-approved technician repair photos on the public map (see
 * backend's GET /halte/{halte_id}/repair-photos and TaskDetailModal.tsx's
 * approval flow) -- only photos an admin explicitly approved, never a
 * task still awaiting approval. Renders nothing at all if there are none,
 * rather than an empty-state message, since this is an occasional bonus
 * next to the halte's own survey media, not something every halte has.
 */
export default function RepairPhotoSection({ halteId }: RepairPhotoSectionProps) {
  const [photos, setPhotos] = useState<ApprovedRepairPhoto[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetchApprovedRepairPhotos(halteId)
      .then((data) => {
        if (!cancelled) setPhotos(data);
      })
      .catch(() => {
        // Silent -- this is a bonus section, a backend hiccup here shouldn't
        // block the rest of the modal from being usable.
      });
    return () => {
      cancelled = true;
    };
  }, [halteId]);

  if (photos.length === 0) return null;

  return (
    <div>
      <h4 className="mb-2 flex items-center gap-2 font-label-md text-[13px] font-bold text-on-surface">
        <span className="material-symbols-outlined text-[18px] text-safety-green">verified</span>
        Perbaikan Terbaru
      </h4>
      <div className="flex flex-col gap-2.5">
        {photos.map((p) => (
          <div key={p.updated_at} className="overflow-hidden rounded-lg border border-border-low bg-surface">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={resolveUploadUrl(p.technician_photo_url) ?? undefined} alt="" className="h-40 w-full object-cover" />
            <p className="p-2.5 text-[13px] leading-relaxed text-on-surface-variant">{p.technician_report}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
