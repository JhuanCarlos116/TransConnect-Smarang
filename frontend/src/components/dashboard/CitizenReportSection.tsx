"use client";

import { useEffect, useState } from "react";

import { fetchCitizenReportsByHalte } from "@/lib/fetchCitizenReports";
import type { CitizenReport } from "@/types/citizenReport";

interface CitizenReportSectionProps {
  halteId: string;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
}

/**
 * Real citizen-submitted reports for this halte (backend/app/routers/
 * citizen_report.py), collapsible like TaskCreateSection below. Separate
 * from "Catatan Survei Lapangan" further down, which is the team's own field
 * survey note (HalteProperties.catatan_lapangan) -- different data source,
 * different author, kept as its own section rather than merged into this one.
 */
export default function CitizenReportSection({ halteId }: CitizenReportSectionProps) {
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
            <div key={r.report_id} className="rounded-lg border border-border-low bg-surface-container-low p-2.5">
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="font-label-sm text-[12px] font-bold text-on-surface">{r.reporter_name}</span>
                <span className="text-[11px] text-on-surface-variant">{formatDate(r.created_at)}</span>
              </div>
              <p className="mb-2 text-[13px] leading-relaxed text-on-surface-variant">{r.description}</p>
              {r.photo_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={r.photo_url} alt="" className="mb-2 h-32 w-full rounded-md object-cover" />
              )}
              {r.video_url && <video src={r.video_url} controls className="mb-2 h-32 w-full rounded-md bg-black object-contain" />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
