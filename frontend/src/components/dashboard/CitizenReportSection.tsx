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

// Model class -> readable Indonesian. The detector's nine classes are street
// furniture names, and its own vocabulary (sidewalk / warning-tile /
// vertical-directional-tile) is not what a DISHUB dispatcher reads. The raw
// class name is kept as the chip's title so nothing is lost for anyone who
// wants to check it against the annotated photo.
const CLASS_LABELS: Record<string, string> = {
  sidewalk: "Trotoar",
  crosswalk: "Zebra cross",
  road: "Jalan",
  shelter: "Shelter / kanopi",
  sign: "Rambu / papan",
  street_light: "Lampu jalan",
  "warning-tile": "Ubin pemandu",
  "horizontal-directional-tile": "Ubin pemandu",
  "vertical-directional-tile": "Ubin pemandu",
};

// Survey variable -> the label the facility checklist in the halte detail
// modal already uses ("Trotoar" not "sidewalk_condition").
const FACILITY_LABELS: Record<string, string> = {
  sidewalk_condition: "Kondisi Trotoar",
  lighting: "Penerangan Jalan",
  cctv: "CCTV Pengawas",
  route_info_signage: "Papan Informasi Rute",
  canopy: "Kanopi / Peneduh",
};

interface Detection {
  className: string;
  confidence: number;
}

/**
 * The stored analysis is JSONB, so it arrives as Record<string, unknown>.
 * Narrow it once, here, rather than sprinkling casts through the render --
 * and tolerate anything unexpected by returning an empty list, because a
 * report with an unreadable analysis is still a report DISHUB has to see.
 */
function parseDetections(raw: Record<string, unknown> | null): Detection[] {
  const list = raw?.detections;
  if (!Array.isArray(list)) return [];
  return list
    .map((item) => {
      const d = item as { class?: unknown; confidence?: unknown };
      return { className: String(d.class ?? ""), confidence: Number(d.confidence ?? 0) };
    })
    .filter((d) => d.className !== "")
    .sort((a, b) => b.confidence - a.confidence);
}

interface ReportCardProps {
  report: CitizenReport;
  halteId: string;
  onDispatched: (reportId: string) => void;
}

/**
 * One citizen report, with the "Dispatch ke Tugas" action folded in -- this
 * used to be a read-only list sitting next to a separate "Buat Tugas
 * Perbaikan" form with no link between the two. Now dispatching *is* the
 * report's own action, and the created task carries citizen_report_id so the
 * backend deletes this report automatically once that task reaches "selesai"
 * (see update_task_status).
 *
 * What DISHUB sees first is the detector's annotated render, not the raw
 * photo: the point of the AI step is that the dispatcher should not have to
 * work out from a photo which facilities look damaged. The raw photo is one
 * tap away, and stays the fallback when the detector found nothing.
 */
function ReportCard({ report, halteId, onDispatched }: ReportCardProps) {
  const [assignedTo, setAssignedTo] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [showRaw, setShowRaw] = useState(false);

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
  const detections = parseDetections(report.ai_detections);
  const annotatedUrl = resolveUploadUrl(report.photo_annotated_url);
  const rawUrl = resolveUploadUrl(report.photo_url);
  const shownUrl = annotatedUrl && !showRaw ? annotatedUrl : rawUrl;
  const facilityUpdates = Object.entries(report.halte_updated ?? {});
  const detectorFailed = Boolean((report.ai_detections?.error as string | null | undefined) ?? null);

  return (
    <div className="rounded-lg border border-border-low bg-surface-container-low p-2.5">
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="font-label-sm text-[12px] font-bold text-on-surface">{report.reporter_name}</span>
        <span className="text-[11px] text-on-surface-variant">{formatDate(report.created_at)}</span>
      </div>
      <p className="mb-2 text-[13px] leading-relaxed text-on-surface-variant">{report.description}</p>

      {shownUrl && (
        <div className="mb-2">
          <div className="relative overflow-hidden rounded-md border border-border-low">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={shownUrl} alt="" className="h-40 w-full object-cover" />
            <span
              className={`absolute top-2 left-2 rounded px-2 py-0.5 font-label-sm text-[10px] font-bold ${
                annotatedUrl && !showRaw ? "bg-transport-blue text-on-primary" : "bg-black/70 text-white"
              }`}
            >
              {annotatedUrl && !showRaw ? "Hasil deteksi YOLO" : "Foto asli"}
            </span>
          </div>
          {annotatedUrl && (
            <button
              onClick={() => setShowRaw((v) => !v)}
              className="mt-1 font-label-sm text-[11px] font-bold text-transport-blue underline"
            >
              {showRaw ? "Lihat hasil deteksi" : "Lihat foto asli"}
            </button>
          )}
        </div>
      )}

      {report.video_url && (
        <video
          src={resolveUploadUrl(report.video_url) ?? undefined}
          controls
          className="mb-2 h-32 w-full rounded-md bg-black object-contain"
        />
      )}

      {report.photo_url && (
        <div className="mb-2 rounded-lg border border-border-low bg-surface p-2.5">
          <div className="mb-1.5 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px] text-transport-blue">visibility</span>
            <span className="font-label-sm text-[11px] font-bold text-on-surface">
              Hasil baca YOLO{detections.length > 0 && ` (${detections.length} objek)`}
            </span>
          </div>

          {detectorFailed ? (
            <p className="text-label-sm text-[11px] text-alert-red">
              Detektor gagal membaca foto ini, jadi tidak ada hasil otomatis. Foto tetap bisa dinilai manual.
            </p>
          ) : detections.length === 0 ? (
            // Honest wording: the model can only prove presence. Nothing here
            // is evidence that a facility is absent -- see photo_detection.py.
            <p className="text-label-sm text-[11px] text-on-surface-variant">
              Tidak ada objek yang terdeteksi di foto ini. Artinya tidak terbaca otomatis -- bukan berarti
              fasilitasnya tidak ada.
            </p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {detections.map((d, i) => (
                <span
                  key={`${d.className}-${i}`}
                  title={d.className}
                  className="rounded bg-surface-container px-1.5 py-0.5 font-label-sm text-[10px] font-bold text-on-surface"
                >
                  {CLASS_LABELS[d.className] ?? d.className}{" "}
                  <span className="text-on-surface-variant">{(d.confidence * 100).toFixed(0)}%</span>
                </span>
              ))}
            </div>
          )}

          {facilityUpdates.length > 0 && (
            <div className="mt-2 border-t border-border-low pt-1.5">
              <p className="font-label-sm text-[11px] text-on-surface-variant">
                Ikut mengisi fasilitas yang belum diketahui:
              </p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {facilityUpdates.map(([facility, value]) => (
                  <span
                    key={facility}
                    className="rounded bg-blue-50 px-1.5 py-0.5 font-label-sm text-[10px] font-bold text-transport-blue"
                  >
                    {FACILITY_LABELS[facility] ?? facility}: {value === "ada" ? "tersedia" : value}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
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
    </div>
  );
}

/**
 * "Laporan Warga" for one halte.
 *
 * Only reports still awaiting dispatch are listed here. Dispatching one moves
 * it to Tugas Perbaikan (its task carries citizen_report_id, and a task
 * marked "selesai" deletes the report server-side), so leaving dispatched
 * reports in this list made the dispatcher's own queue look like it never
 * shrank -- the queue is what this panel is for. The count of reports already
 * moved is kept as one line, so nothing disappears silently.
 */
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

  const activeReports = reports.filter((r) => r.status === "baru");
  const dispatchedCount = reports.length - activeReports.length;

  return (
    <div className="rounded-lg border border-border-low bg-surface p-3">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between font-label-md text-[13px] font-bold text-on-surface"
      >
        <span className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px] text-transport-blue">campaign</span>
          Laporan Warga {!loading && `(${activeReports.length})`}
        </span>
        <span className="material-symbols-outlined text-[18px] text-on-surface-variant">
          {open ? "expand_less" : "expand_more"}
        </span>
      </button>

      {open && (
        <div className="mt-3 flex flex-col gap-2.5">
          {loading && <p className="text-label-sm text-on-surface-variant">Memuat...</p>}
          {error && <p className="text-label-sm text-alert-red">{error}</p>}
          {!loading && !error && activeReports.length === 0 && (
            <p className="text-label-sm text-on-surface-variant">
              {dispatchedCount > 0
                ? "Tidak ada laporan baru yang menunggu dispatch."
                : "Belum ada laporan warga untuk halte ini."}
            </p>
          )}
          {activeReports.map((r) => (
            <ReportCard key={r.report_id} report={r} halteId={halteId} onDispatched={handleDispatched} />
          ))}
          {dispatchedCount > 0 && (
            <p className="text-label-sm text-[11px] text-on-surface-variant">
              {dispatchedCount} laporan sudah dipindahkan ke{" "}
              <Link href="/dashboard/tasks" className="font-bold text-transport-blue underline">
                Tugas Perbaikan
              </Link>
              .
            </p>
          )}
        </div>
      )}
    </div>
  );
}
