"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { conditionColor, conditionLabelText } from "@/lib/conditionScore";
import { fetchHalteData } from "@/lib/fetchHalteData";
import { approveFacilityUpdate, createTask, fetchTasksByHalte, revertFacilityUpdate } from "@/lib/fetchTasks";
import MediaCarousel from "@/components/map/MediaCarousel";
import CitizenReportSection from "@/components/dashboard/CitizenReportSection";
import FacilityEditor from "@/components/dashboard/FacilityEditor";
import AssigneePicker from "@/components/dashboard/AssigneePicker";
import type { HalteFeature } from "@/types/halte";
import type { Task } from "@/types/task";

const FACILITY_LABELS: Record<string, string> = {
  cctv: "CCTV Pengawas",
  lighting: "Penerangan Jalan",
  sidewalk_condition: "Kondisi Trotoar",
  route_info_signage: "Papan Informasi Rute",
  canopy: "Kanopi / Peneduh",
};

interface HalteDetailModalProps {
  feature: HalteFeature | null;
  onClose: () => void;
  /** Called after a citizen report is dispatched into a task, or a task is
   * created manually -- lets the dashboard page refetch BusStopLayer's
   * reportedHalteIds so the map's red ring reflects the new "diproses"
   * status right away instead of only after reopening this modal. */
  onTasksChanged?: () => void;
  /** Called with the whole feature after a manual facility correction, so the
   * map marker and its condition colour move together with the edit instead
   * of showing the pre-correction score until the next page load. */
  onHalteUpdated?: (feature: HalteFeature) => void;
}

interface FieldNoteSectionProps {
  halteId: string;
  note: string;
  /** Bumped whenever a task changes (dispatch, manual create, technician
   * report submitted) so this section's "currently active" report reflects
   * the latest state without requiring the modal to be reopened. */
  refreshSignal?: number;
  /** Called after DISHUB approves a technician's proposed facility changes,
   * so the map ring (which shows purple for a "selesai" task with an
   * unapproved facility update) updates without needing to reopen this
   * modal. */
  onTasksChanged?: () => void;
  /** The facility approval writes onto halte_survey itself (values, score,
   * media) -- refetches and hands the server's fresh copy back up the same
   * way FacilityEditor's manual correction does, so the score banner and
   * map marker move together with the approval instead of showing stale
   * data until the modal is reopened. */
  onHalteUpdated?: (feature: HalteFeature) => void;
}

/**
 * The team's own initial field survey note (HalteProperties.catatan_lapangan)
 * -- but per DISHUB's request, this section now surfaces whichever task is
 * currently "proses" (being worked on) for this halte as the *active* note,
 * since a technician's own report on ongoing work is more current than a
 * one-time survey snapshot. The original survey note is never overwritten
 * server-side (catatan_lapangan is untouched) -- it just moves into a
 * collapsed "Catatan Awal (Riwayat)" block underneath once a technician
 * report exists to take its place as the headline.
 *
 * Also where the dispatcher reviews and approves a technician's proposed
 * facility changes (see approve-facility-update in routers/task.py) -- this
 * lives here rather than in TaskDetailModal because that modal is about one
 * task's own record-keeping (what was reported, whether its photo is public),
 * while this section is what the dispatcher actually reads to decide the
 * halte's current state, so the approval belongs next to it. Looked up by
 * status "proses" OR "selesai": a dispatcher can move a task to "selesai"
 * from TaskBoard before its facility data has been reviewed, and that
 * pending approval shouldn't become unreachable just because the task
 * changed columns.
 */
function FieldNoteSection({ halteId, note, refreshSignal, onTasksChanged, onHalteUpdated }: FieldNoteSectionProps) {
  const [open, setOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [pendingFacilityTask, setPendingFacilityTask] = useState<Task | null>(null);
  const [revertibleTask, setRevertibleTask] = useState<Task | null>(null);
  const [approving, setApproving] = useState(false);
  const [reverting, setReverting] = useState(false);
  const [approveError, setApproveError] = useState<string | null>(null);
  const [revertError, setRevertError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchTasksByHalte(halteId)
      .then((tasks) => {
        if (cancelled) return;
        const inProgress = tasks.find((t) => t.status === "proses" && t.technician_report);
        setActiveTask(inProgress ?? null);

        const pending = tasks.find(
          (t) =>
            (t.status === "proses" || t.status === "selesai") &&
            t.facility_updates &&
            Object.keys(t.facility_updates).length > 0 &&
            !t.facility_updates_approved,
        );
        setPendingFacilityTask(pending ?? null);

        // Most recently updated task with an approval still standing, so
        // "Kembalikan" always targets whichever change actually last
        // touched this halte's facility data -- fetchTasksByHalte already
        // orders newest first.
        const revertible = tasks.find((t) => t.facility_updates_approved && t.facility_updates_revertible);
        setRevertibleTask(revertible ?? null);
      })
      .catch(() => {
        // Non-critical -- falls back to showing just the original survey note.
      });
    return () => {
      cancelled = true;
    };
  }, [halteId, refreshSignal]);

  async function refreshHalte() {
    // Approving/reverting rewrite halte_survey itself (facility values,
    // score, media) -- there's no single-halte endpoint, so refetch the
    // full survey set (same as every other halte-data load in this app)
    // and pick this one out, so FacilityEditor/the score banner/map marker
    // pick up the new values instead of showing what was current when this
    // modal opened.
    const data = await fetchHalteData();
    const fresh = data.features.find((f) => f.properties.halte_id === halteId);
    if (fresh) onHalteUpdated?.(fresh);
  }

  async function handleApproveFacility() {
    if (!pendingFacilityTask) return;
    setApproving(true);
    setApproveError(null);
    try {
      const updatedTask = await approveFacilityUpdate(pendingFacilityTask.task_id);
      setPendingFacilityTask(updatedTask.facility_updates_approved ? null : updatedTask);
      if (updatedTask.facility_updates_approved) setRevertibleTask(updatedTask);
      onTasksChanged?.();
      await refreshHalte();
    } catch (err) {
      setApproveError(err instanceof Error ? err.message : "Gagal menyetujui perubahan fasilitas.");
    } finally {
      setApproving(false);
    }
  }

  async function handleRevertFacility() {
    if (!revertibleTask) return;
    if (!window.confirm("Kembalikan fasilitas & foto/video halte ini ke kondisi sebelum persetujuan terakhir?")) return;
    setReverting(true);
    setRevertError(null);
    try {
      const updatedTask = await revertFacilityUpdate(revertibleTask.task_id);
      setRevertibleTask(null);
      // The task's own proposed values are unchanged and now unapproved
      // again -- surface them once more so DISHUB can re-review instead of
      // the proposal silently disappearing.
      if (updatedTask.facility_updates && Object.keys(updatedTask.facility_updates).length > 0) {
        setPendingFacilityTask(updatedTask);
      }
      onTasksChanged?.();
      await refreshHalte();
    } catch (err) {
      setRevertError(err instanceof Error ? err.message : "Gagal mengembalikan perubahan fasilitas.");
    } finally {
      setReverting(false);
    }
  }

  return (
    <div className="rounded-lg border border-border-low bg-surface p-3">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between font-label-md text-[13px] font-bold text-on-surface"
      >
        <span className="flex items-center gap-2">
          <span className="material-symbols-outlined text-transport-blue text-[18px]">edit_note</span>
          Catatan Survei Lapangan
        </span>
        <span className="material-symbols-outlined text-[18px] text-on-surface-variant">
          {open ? "expand_less" : "expand_more"}
        </span>
      </button>

      {open && (
        <div className="mt-3 flex flex-col gap-2.5">
          {activeTask ? (
            <>
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-caution-yellow">
                <span className="material-symbols-outlined text-[14px]">sync</span>
                Sedang Dikerjakan -- laporan petugas terbaru
              </div>
              <p className="font-body-md text-[13px] text-on-surface-variant leading-relaxed italic bg-surface-container-low p-2.5 rounded">
                &ldquo;{activeTask.technician_report}&rdquo;
              </p>

              <div className="border-t border-border-low pt-2">
                <button
                  onClick={() => setArchiveOpen((v) => !v)}
                  aria-expanded={archiveOpen}
                  className="flex w-full items-center justify-between text-[11px] font-bold text-on-surface-variant"
                >
                  Catatan Awal (Riwayat)
                  <span className="material-symbols-outlined text-[16px]">
                    {archiveOpen ? "expand_less" : "expand_more"}
                  </span>
                </button>
                {archiveOpen && (
                  <p className="mt-2 font-body-md text-[13px] text-on-surface-variant leading-relaxed italic bg-surface-container-low p-2.5 rounded">
                    &ldquo;{note}&rdquo;
                  </p>
                )}
              </div>
            </>
          ) : (
            <p className="font-body-md text-[13px] text-on-surface-variant leading-relaxed italic bg-surface-container-low p-2.5 rounded">
              &ldquo;{note}&rdquo;
            </p>
          )}

          {pendingFacilityTask && (
            <div className="border-t border-border-low pt-2.5">
              <h5 className="mb-2 flex items-center gap-1.5 font-label-sm text-[12px] font-bold text-on-surface">
                <span className="material-symbols-outlined text-[16px] text-purple-600">fact_check</span>
                Usulan Perubahan Fasilitas dari Tim Lapangan
              </h5>
              <ul className="mb-2.5 flex flex-col gap-1">
                {Object.entries(pendingFacilityTask.facility_updates ?? {}).map(([facility, val]) => (
                  <li key={facility} className="flex items-center gap-2 font-label-sm text-[12px] text-on-surface">
                    <span
                      className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${val === "ada" ? "bg-safety-green" : "bg-alert-red"}`}
                    />
                    {FACILITY_LABELS[facility] ?? facility}: {val === "ada" ? "Tersedia" : "Tidak Tersedia"}
                  </li>
                ))}
              </ul>
              {approveError && <p className="mb-2 text-label-sm text-[11px] text-alert-red">{approveError}</p>}
              <button
                onClick={handleApproveFacility}
                disabled={approving}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-safety-green px-3 py-2 font-label-sm text-[12px] font-bold text-on-primary transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
              >
                <span className="material-symbols-outlined text-[16px]">verified</span>
                {approving ? "Menyetujui..." : "Setujui Perubahan Fasilitas"}
              </button>
            </div>
          )}

          {revertibleTask && (
            <div className="border-t border-border-low pt-2.5">
              <p className="mb-2 font-label-sm text-[11px] text-on-surface-variant">
                Perubahan fasilitas terakhir sudah disetujui. Salah pencet, atau ingin membatalkannya?
              </p>
              {revertError && <p className="mb-2 text-label-sm text-[11px] text-alert-red">{revertError}</p>}
              <button
                onClick={handleRevertFacility}
                disabled={reverting}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-alert-red px-3 py-2 font-label-sm text-[12px] font-bold text-alert-red transition-colors hover:bg-alert-red hover:text-on-error disabled:cursor-not-allowed disabled:opacity-70"
              >
                <span className="material-symbols-outlined text-[16px]">undo</span>
                {reverting ? "Mengembalikan..." : "Kembalikan Perubahan Sebelumnya"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface TaskCreateSectionProps {
  halteId: string;
  onCreated?: () => void;
}

/**
 * Manual task creation -- for when DISHUB dispatches a repair on its own
 * initiative, with no citizen report behind it. Distinct from
 * CitizenReportSection's "Dispatch ke Tugas" button, which creates a task
 * from an existing report (and links citizen_report_id so that report gets
 * cleaned up once the task is done); a task made here has no report to link,
 * so citizen_report_id is left unset. See app/routers/task.py for why
 * "assigned_to" is plain text: there is no staff login/account system in
 * this project.
 */
function TaskCreateSection({ halteId, onCreated }: TaskCreateSectionProps) {
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!description.trim()) return;
    setStatus("submitting");
    setError(null);
    try {
      await createTask({ halte_id: halteId, description: description.trim(), assigned_to: assignedTo.trim() || undefined });
      setStatus("done");
      onCreated?.();
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Gagal membuat tugas.");
    }
  }

  if (status === "done") {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-safety-green/30 bg-green-50 p-3 text-label-sm text-on-surface">
        <span className="material-symbols-outlined text-[18px] text-safety-green">check_circle</span>
        Tugas berhasil dibuat. Lihat di{" "}
        <Link href="/dashboard/tasks" className="font-bold text-transport-blue underline">
          Tugas Perbaikan
        </Link>
        .
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border-low bg-surface p-3">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between font-label-md text-[13px] font-bold text-on-surface"
      >
        <span className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px] text-transport-blue">assignment_add</span>
          Manual Dispatch
        </span>
        <span className="material-symbols-outlined text-[18px] text-on-surface-variant">
          {open ? "expand_less" : "expand_more"}
        </span>
      </button>

      {open && (
        <form onSubmit={handleSubmit} className="mt-3 flex flex-col gap-2.5">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Deskripsi perbaikan yang dibutuhkan..."
            required
            rows={3}
            className="w-full rounded-lg border border-border-low bg-surface-container-low p-2.5 font-body-md text-[13px] text-on-surface focus:border-transport-blue focus:outline-none focus:ring-1 focus:ring-transport-blue"
          />
          <AssigneePicker value={assignedTo} onChange={setAssignedTo} />
          {error && <p className="text-label-sm text-alert-red">{error}</p>}
          <button
            type="submit"
            disabled={status === "submitting"}
            className="self-start rounded-lg bg-transport-blue px-4 py-2 font-label-sm text-label-sm font-bold text-on-primary transition-colors hover:bg-primary disabled:cursor-not-allowed disabled:opacity-70"
          >
            {status === "submitting" ? "Menyimpan..." : "Simpan Tugas"}
          </button>
        </form>
      )}
    </div>
  );
}

export default function HalteDetailModal({ feature, onClose, onTasksChanged, onHalteUpdated }: HalteDetailModalProps) {
  const [refreshSignal, setRefreshSignal] = useState(0);

  if (!feature) return null;
  const p = feature.properties;

  function handleTasksChanged() {
    setRefreshSignal((n) => n + 1);
    onTasksChanged?.();
  }

  function handleHalteUpdated(updated: HalteFeature) {
    // The modal renders from the page's copy of this feature, so hand the
    // corrected one back up -- otherwise the score banner and the map marker
    // would keep showing the pre-correction values until a page reload. The
    // field-note section is also re-signalled, since its "skor" context
    // comes from the same row.
    setRefreshSignal((n) => n + 1);
    onHalteUpdated?.(updated);
  }

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

          {/* Facility Attributes Checklist -- editable, see FacilityEditor */}
          <FacilityEditor feature={feature} onUpdated={handleHalteUpdated} />

          <CitizenReportSection halteId={p.halte_id} onDispatched={handleTasksChanged} />

          {p.catatan_lapangan && (
            <FieldNoteSection
              halteId={p.halte_id}
              note={p.catatan_lapangan}
              refreshSignal={refreshSignal}
              onTasksChanged={handleTasksChanged}
              onHalteUpdated={handleHalteUpdated}
            />
          )}

          <TaskCreateSection halteId={p.halte_id} onCreated={handleTasksChanged} />
        </div>
      </div>
    </div>
  );
}
