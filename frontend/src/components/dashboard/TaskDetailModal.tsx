"use client";

import { useState } from "react";

import FacilityUpdatePicker, { type FacilityUpdates } from "@/components/dashboard/FacilityUpdatePicker";
import PhotoPicker from "@/components/ui/PhotoPicker";
import { submitTechnicianReport } from "@/lib/fetchTasks";
import { resolveUploadUrl } from "@/lib/resolveUploadUrl";
import { MAX_VIDEO_BYTES, mb } from "@/lib/uploadLimits";
import type { Task } from "@/types/task";

interface TaskDetailModalProps {
  task: Task | null;
  onClose: () => void;
  onUpdated: (task: Task) => void;
}

/**
 * Opened from a task card in the "proses"/"selesai" columns (see
 * TaskBoard.tsx) -- lets whoever's doing the repair submit their own report
 * text + a photo (separate from the dispatcher's original description of
 * what needs fixing), plus the video proof and any proposed facility values.
 *
 * Reviewing any of that belongs to DISHUB and happens elsewhere: both the
 * photo's public-approval gate and the facility batch are approved/turned
 * down in HalteDetailModal's FieldNoteSection, next to the halte's own field
 * notes. That's deliberate -- those are decisions about the HAlTE's data and
 * what the public sees, not part of one task's record-keeping, and a
 * dispatcher judging a halte shouldn't have to open a second modal and find
 * the matching task first. The blocks here only report the current verdict.
 */
export default function TaskDetailModal({ task, onClose, onUpdated }: TaskDetailModalProps) {
  const [report, setReport] = useState(task?.technician_report ?? "");
  const [photos, setPhotos] = useState<File[]>([]);
  const [video, setVideo] = useState<File | null>(null);
  const [facilityUpdates, setFacilityUpdates] = useState<FacilityUpdates>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!task) return null;

  // Photo size/count limits are enforced by PhotoPicker, which owns that
  // field's state now that there can be several files.
  function handleVideoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_VIDEO_BYTES) {
      setError(`Ukuran video maksimal ${mb(MAX_VIDEO_BYTES)}.`);
      e.target.value = "";
      return;
    }
    setError(null);
    setVideo(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!task || !report.trim() || !video) return;
    setSubmitting(true);
    setError(null);
    try {
      const updated = await submitTechnicianReport(
        task.task_id,
        report.trim(),
        video,
        facilityUpdates,
        photos.length > 0 ? photos : undefined,
      );
      onUpdated(updated);
      setPhotos([]);
      setVideo(null);
      setFacilityUpdates({});
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengirim laporan petugas.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto scrollbar-hide rounded-xl border border-border-low bg-surface p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="mb-4 flex items-center justify-between border-b border-border-low pb-4">
          <div>
            {task.citizen_report_id && (
              <span className="mb-1 inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-transport-blue">
                <span className="material-symbols-outlined text-[13px]">campaign</span>
                Dari Laporan Warga
              </span>
            )}
            <h3 className="font-headline-md text-[18px] font-bold text-on-surface">{task.nama_halte}</h3>
            <p className="font-label-sm text-[12px] text-on-surface-variant">{task.description}</p>
          </div>
          <button
            onClick={onClose}
            className="text-alert-red hover:text-on-error border border-alert-red p-1.5 rounded-lg hover:bg-alert-red transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <h4 className="mb-2 font-label-md text-[13px] font-bold text-on-surface">Laporan Petugas</h4>
            <form onSubmit={handleSubmit} className="flex flex-col gap-2.5">
              <textarea
                value={report}
                onChange={(e) => setReport(e.target.value)}
                placeholder="Ceritakan pekerjaan yang sudah dilakukan..."
                required
                rows={3}
                className="w-full rounded-lg border border-border-low bg-surface-container-low p-2.5 font-body-md text-[13px] text-on-surface focus:border-transport-blue focus:outline-none focus:ring-1 focus:ring-transport-blue"
              />
              <label className="flex items-center gap-2 rounded-lg border border-border-low bg-surface-container-low p-2.5 text-label-sm text-on-surface-variant">
                <span className="material-symbols-outlined text-[18px]">videocam</span>
                {video ? video.name : `Tambah video perbaikan (wajib, MP4/WebM/MOV, maks ${mb(MAX_VIDEO_BYTES)})`}
                <input type="file" accept="video/mp4,video/webm,video/quicktime" onChange={handleVideoChange} className="hidden" />
              </label>
              <PhotoPicker
                photos={photos}
                onChange={setPhotos}
                onError={setError}
                idleLabel="Tambah foto perbaikan (opsional, bisa beberapa)"
              />

              <FacilityUpdatePicker value={facilityUpdates} onChange={setFacilityUpdates} />

              {error && <p className="text-label-sm text-alert-red">{error}</p>}
              <button
                type="submit"
                disabled={submitting || !report.trim() || !video}
                className="self-start rounded-lg bg-transport-blue px-4 py-2 font-label-sm text-label-sm font-bold text-on-primary transition-colors hover:bg-primary disabled:cursor-not-allowed disabled:opacity-70"
              >
                {submitting ? "Menyimpan..." : "Simpan Laporan"}
              </button>
            </form>
          </div>

          {task.technician_photo_url && (
            <div className="rounded-lg border border-border-low bg-surface p-3">
              <h4 className="mb-2 font-label-md text-[13px] font-bold text-on-surface">Foto Perbaikan</h4>
              <p className="mb-2 font-label-sm text-[12px] text-on-surface-variant">
                Disetujui atau ditolak dari halaman detail halte, di bagian Catatan Survei Lapangan --
                bersama catatan laporan tim, video, dan usulan fasilitasnya, supaya semua keputusan
                untuk satu halte ada di satu tempat.
              </p>
              {/* Every photo on the task, not just the first, so the technician
                  can see exactly what is on record before it is reviewed. */}
              <div className="mb-2 flex flex-wrap gap-2">
                {task.technician_photo_urls.map((url) => (
                  <a
                    key={url}
                    href={resolveUploadUrl(url) ?? undefined}
                    target="_blank"
                    rel="noreferrer"
                    className="h-16 w-16 overflow-hidden rounded-md border border-border-low"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={resolveUploadUrl(url) ?? undefined}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </a>
                ))}
              </div>
              {task.approved_for_public && (
                <div className="flex items-center gap-2 rounded-lg border border-safety-green/30 bg-green-50 p-2.5 text-label-sm text-on-surface">
                  <span className="material-symbols-outlined text-[18px] text-safety-green">check_circle</span>
                  Disetujui -- tampil di halaman publik.
                </div>
              )}
              {task.technician_photo_rejected && !task.approved_for_public && (
                <div className="flex items-center gap-2 rounded-lg border border-alert-red/30 bg-red-50 p-2.5 text-label-sm text-on-surface">
                  <span className="material-symbols-outlined text-[18px] text-alert-red">cancel</span>
                  Ditolak -- tidak tampil di halaman publik.
                </div>
              )}
            </div>
          )}

          {task.facility_updates && Object.keys(task.facility_updates).length > 0 && (
            <div className="rounded-lg border border-border-low bg-surface p-3">
              <h4 className="mb-2 font-label-md text-[13px] font-bold text-on-surface">Usulan Perubahan Fasilitas</h4>
              <p className="mb-2 font-label-sm text-[12px] text-on-surface-variant">
                Ditinjau dan disetujui dari halaman detail halte, di bagian Catatan Survei Lapangan.
              </p>
              {task.facility_updates_approved && (
                <div className="flex items-center gap-2 rounded-lg border border-safety-green/30 bg-green-50 p-2.5 text-label-sm text-on-surface">
                  <span className="material-symbols-outlined text-[18px] text-safety-green">check_circle</span>
                  Disetujui -- fasilitas & foto/video halte sudah diperbarui.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
