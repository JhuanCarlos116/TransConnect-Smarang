"use client";

import { useState } from "react";

import FacilityUpdatePicker, { type FacilityUpdates } from "@/components/dashboard/FacilityUpdatePicker";
import { approveFacilityUpdate, approveTechnicianPhoto, submitTechnicianReport } from "@/lib/fetchTasks";
import { resolveUploadUrl } from "@/lib/resolveUploadUrl";
import type { Task } from "@/types/task";

interface TaskDetailModalProps {
  task: Task | null;
  onClose: () => void;
  onUpdated: (task: Task) => void;
}

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const MAX_VIDEO_BYTES = 25 * 1024 * 1024;

const FACILITY_LABELS: Record<string, string> = {
  cctv: "CCTV Pengawas",
  lighting: "Penerangan Jalan",
  sidewalk_condition: "Kondisi Trotoar",
  route_info_signage: "Papan Informasi Rute",
  canopy: "Kanopi / Peneduh",
};

/**
 * Opened from a task card in the "proses"/"selesai" columns (see
 * TaskBoard.tsx) -- lets whoever's doing the repair submit their own report
 * text + a photo (separate from the dispatcher's original description of
 * what needs fixing), and lets DISHUB approve that photo for the public map.
 * Approval is a distinct action from "selesai" status: submitting a photo
 * here does not make it public on its own (see backend/app/routers/task.py).
 */
export default function TaskDetailModal({ task, onClose, onUpdated }: TaskDetailModalProps) {
  const [report, setReport] = useState(task?.technician_report ?? "");
  const [photo, setPhoto] = useState<File | null>(null);
  const [video, setVideo] = useState<File | null>(null);
  const [facilityUpdates, setFacilityUpdates] = useState<FacilityUpdates>({});
  const [submitting, setSubmitting] = useState(false);
  const [approvingPhoto, setApprovingPhoto] = useState(false);
  const [approvingFacility, setApprovingFacility] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!task) return null;

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_PHOTO_BYTES) {
      setError("Ukuran foto maksimal 5 MB.");
      e.target.value = "";
      return;
    }
    setError(null);
    setPhoto(file);
  }

  function handleVideoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_VIDEO_BYTES) {
      setError("Ukuran video maksimal 25 MB.");
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
      const updated = await submitTechnicianReport(task.task_id, report.trim(), video, facilityUpdates, photo ?? undefined);
      onUpdated(updated);
      setPhoto(null);
      setVideo(null);
      setFacilityUpdates({});
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengirim laporan petugas.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleApprovePhoto() {
    if (!task) return;
    setApprovingPhoto(true);
    setError(null);
    try {
      const updated = await approveTechnicianPhoto(task.task_id);
      onUpdated(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyetujui foto.");
    } finally {
      setApprovingPhoto(false);
    }
  }

  async function handleApproveFacility() {
    if (!task) return;
    setApprovingFacility(true);
    setError(null);
    try {
      const updated = await approveFacilityUpdate(task.task_id);
      onUpdated(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyetujui perubahan fasilitas.");
    } finally {
      setApprovingFacility(false);
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
                {video ? video.name : "Tambah video perbaikan (wajib, MP4/WebM/MOV, maks 25 MB)"}
                <input type="file" accept="video/mp4,video/webm,video/quicktime" onChange={handleVideoChange} className="hidden" />
              </label>
              <label className="flex items-center gap-2 rounded-lg border border-border-low bg-surface-container-low p-2.5 text-label-sm text-on-surface-variant">
                <span className="material-symbols-outlined text-[18px]">photo_camera</span>
                {photo ? photo.name : "Tambah foto perbaikan (opsional)"}
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhotoChange} className="hidden" />
              </label>

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
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={resolveUploadUrl(task.technician_photo_url) ?? undefined} alt="" className="mb-3 h-48 w-full rounded-md object-cover" />

              {task.approved_for_public ? (
                <div className="flex items-center gap-2 rounded-lg border border-safety-green/30 bg-green-50 p-2.5 text-label-sm text-on-surface">
                  <span className="material-symbols-outlined text-[18px] text-safety-green">check_circle</span>
                  Disetujui -- tampil di halaman publik.
                </div>
              ) : (
                <button
                  onClick={handleApprovePhoto}
                  disabled={approvingPhoto}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-safety-green px-4 py-2.5 font-label-md text-label-md font-bold text-on-primary transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  <span className="material-symbols-outlined text-[18px]">verified</span>
                  {approvingPhoto ? "Menyetujui..." : "Setujui & Tampilkan ke Publik"}
                </button>
              )}
            </div>
          )}

          {task.facility_updates && Object.keys(task.facility_updates).length > 0 && (
            <div className="rounded-lg border border-border-low bg-surface p-3">
              <h4 className="mb-2 font-label-md text-[13px] font-bold text-on-surface">Usulan Perubahan Fasilitas</h4>
              <ul className="mb-3 flex flex-col gap-1">
                {Object.entries(task.facility_updates).map(([facility, val]) => (
                  <li key={facility} className="flex items-center gap-2 font-label-sm text-[12px] text-on-surface">
                    <span
                      className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${val === "ada" ? "bg-safety-green" : "bg-alert-red"}`}
                    />
                    {FACILITY_LABELS[facility] ?? facility}: {val === "ada" ? "Tersedia" : "Tidak Tersedia"}
                  </li>
                ))}
              </ul>

              {task.facility_updates_approved ? (
                <div className="flex items-center gap-2 rounded-lg border border-safety-green/30 bg-green-50 p-2.5 text-label-sm text-on-surface">
                  <span className="material-symbols-outlined text-[18px] text-safety-green">check_circle</span>
                  Disetujui -- fasilitas & foto/video halte sudah diperbarui.
                </div>
              ) : (
                <button
                  onClick={handleApproveFacility}
                  disabled={approvingFacility}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-safety-green px-4 py-2.5 font-label-md text-label-md font-bold text-on-primary transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  <span className="material-symbols-outlined text-[18px]">verified</span>
                  {approvingFacility ? "Menyetujui..." : "Setujui Perubahan Fasilitas"}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
