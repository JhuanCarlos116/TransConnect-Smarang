"use client";

import { useState } from "react";

import { approveTechnicianPhoto, submitTechnicianReport } from "@/lib/fetchTasks";
import type { Task } from "@/types/task";

interface TaskDetailModalProps {
  task: Task | null;
  onClose: () => void;
  onUpdated: (task: Task) => void;
}

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

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
  const [submitting, setSubmitting] = useState(false);
  const [approving, setApproving] = useState(false);
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!task || !report.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const updated = await submitTechnicianReport(task.task_id, report.trim(), photo ?? undefined);
      onUpdated(updated);
      setPhoto(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengirim laporan petugas.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleApprove() {
    if (!task) return;
    setApproving(true);
    setError(null);
    try {
      const updated = await approveTechnicianPhoto(task.task_id);
      onUpdated(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyetujui foto.");
    } finally {
      setApproving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto scrollbar-hide rounded-xl border border-border-low bg-surface p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="mb-4 flex items-center justify-between border-b border-border-low pb-4">
          <div>
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
                <span className="material-symbols-outlined text-[18px]">photo_camera</span>
                {photo ? photo.name : "Tambah foto perbaikan (opsional)"}
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhotoChange} className="hidden" />
              </label>
              {error && <p className="text-label-sm text-alert-red">{error}</p>}
              <button
                type="submit"
                disabled={submitting || !report.trim()}
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
              <img src={task.technician_photo_url} alt="" className="mb-3 h-48 w-full rounded-md object-cover" />

              {task.approved_for_public ? (
                <div className="flex items-center gap-2 rounded-lg border border-safety-green/30 bg-green-50 p-2.5 text-label-sm text-on-surface">
                  <span className="material-symbols-outlined text-[18px] text-safety-green">check_circle</span>
                  Disetujui -- tampil di halaman publik.
                </div>
              ) : (
                <button
                  onClick={handleApprove}
                  disabled={approving}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-safety-green px-4 py-2.5 font-label-md text-label-md font-bold text-on-primary transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  <span className="material-symbols-outlined text-[18px]">verified</span>
                  {approving ? "Menyetujui..." : "Setujui & Tampilkan ke Publik"}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
