"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { fetchCitizenReportsByHalte } from "@/lib/fetchCitizenReports";
import { createTask } from "@/lib/fetchTasks";
import { resolveUploadUrl } from "@/lib/resolveUploadUrl";
import AssigneePicker from "@/components/dashboard/AssigneePicker";
import type { CitizenReport } from "@/types/citizenReport";

interface CitizenReportSectionProps {
  halteId: string;
  /** Tells the dashboard page's map marker (BusStopLayer's red ring) to
   * refetch after a dispatch, since that status change happened here. */
  onDispatched?: () => void;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
}

interface ReportCardProps {
  report: CitizenReport;
  halteId: string;
  onDispatched: (reportId: string) => void;
}

/**
 * One citizen report, with the "Dispatch ke Tugas" action folded in --
 * this used to be a read-only list (CitizenReportSection) sitting next to a
 * completely separate "Buat Tugas Perbaikan" form (TaskCreateSection in
 * HalteDetailModal) with no link between the two: a dispatcher had to read a
 * report, then manually retype its content into an unrelated form. Now
 * dispatching *is* the report's own action, and the created task carries
 * citizen_report_id so the backend can delete this report automatically once
 * that task reaches "selesai" (see update_task_status).
 */
function ReportCard({ report, halteId, onDispatched }: ReportCardProps) {
  const [assignedTo, setAssignedTo] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleDispatch() {
    setStatus("submitting");
    setError(null);
    try {
      await createTask({
        halte_id: halteId,
        description: report.description,
        assigned_to: assignedTo.trim() || undefined,
        citizen_report_id: report.report_id,
      });
      setStatus("done");
      onDispatched(report.report_id);
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Gagal membuat tugas dari laporan ini.");
    }
  }

  const isNew = report.status === "baru";

  return (
    <div className="rounded-lg border border-border-low bg-surface-container-low p-2.5">
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="font-label-sm text-[12px] font-bold text-on-surface">{report.reporter_name}</span>
        <span className="text-[11px] text-on-surface-variant">{formatDate(report.created_at)}</span>
      </div>
      <p className="mb-2 text-[13px] leading-relaxed text-on-surface-variant">{report.description}</p>
      {report.photo_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={resolveUploadUrl(report.photo_url) ?? undefined} alt="" className="mb-2 h-32 w-full rounded-md object-cover" />
      )}
      {report.video_url && (
        <video
          src={resolveUploadUrl(report.video_url) ?? undefined}
          controls
          className="mb-2 h-32 w-full rounded-md bg-black object-contain"
        />
      )}

      {isNew && status !== "done" && (
        <div className="flex flex-col gap-2.5">
          <AssigneePicker value={assignedTo} onChange={setAssignedTo} />
          {error && <p className="text-label-sm text-alert-red">{error}</p>}
          <button
            onClick={handleDispatch}
            disabled={status === "submitting"}
            className="self-start rounded-lg bg-transport-blue px-4 py-2 font-label-sm text-label-sm font-bold text-on-primary transition-colors hover:bg-primary disabled:cursor-not-allowed disabled:opacity-70"
          >
            {status === "submitting" ? "Menyimpan..." : "Dispatch ke Tugas"}
          </button>
        </div>
      )}

      {(status === "done" || !isNew) && (
        <div className="flex items-center gap-2 rounded-lg border border-safety-green/30 bg-green-50 p-3 text-label-sm text-on-surface">
          <span className="material-symbols-outlined text-[18px] text-safety-green">check_circle</span>
          Tugas berhasil dibuat. Lihat di{" "}
          <Link href="/dashboard/tasks" className="font-bold text-transport-blue underline">
            Tugas Perbaikan
          </Link>
          .
        </div>
      )}
    </div>
  );
}

export default function CitizenReportSection({ halteId, onDispatched }: CitizenReportSectionProps) {
  const [open, setOpen] = useState(false);
  const [reports, setReports] = useState<CitizenReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchCitizenReportsByHalte(halteId)
      .then((data) => {
        if (!cancelled) setReports(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Gagal memuat laporan warga.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [halteId]);

  function handleDispatched(reportId: string) {
    setReports((cur) => cur.map((r) => (r.report_id === reportId ? { ...r, status: "diproses" } : r)));
    onDispatched?.();
  }

  return (
    <div className="rounded-lg border border-border-low bg-surface p-3">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between font-label-md text-[13px] font-bold text-on-surface"
      >
        <span className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px] text-transport-blue">campaign</span>
          Laporan Warga {!loading && `(${reports.length})`}
        </span>
        <span className="material-symbols-outlined text-[18px] text-on-surface-variant">
          {open ? "expand_less" : "expand_more"}
        </span>
      </button>

      {open && (
        <div className="mt-3 flex flex-col gap-2.5">
          {loading && <p className="text-label-sm text-on-surface-variant">Memuat...</p>}
          {error && <p className="text-label-sm text-alert-red">{error}</p>}
          {!loading && !error && reports.length === 0 && (
            <p className="text-label-sm text-on-surface-variant">Belum ada laporan warga untuk halte ini.</p>
          )}
          {reports.map((r) => (
            <ReportCard key={r.report_id} report={r} halteId={halteId} onDispatched={handleDispatched} />
          ))}
        </div>
      )}
    </div>
  );
}
