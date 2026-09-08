"use client";

import { useRouter } from "next/navigation";

/**
 * "Buat Laporan" -- icon-only button that navigates to the dedicated report
 * page (see app/map/lapor/page.tsx) rather than an in-map picking flow.
 * Moved out of an in-place state machine because a report now ties to a
 * specific surveyed halte (CitizenReport.halte_id), which needs its own map
 * to pick from -- a single tap on the already-busy public map canvas isn't
 * enough room for that.
 */
export default function ReportFormWidget() {
  const router = useRouter();

  return (
    <button
      onClick={() => router.push("/map/lapor")}
      aria-label="Buat Laporan"
      title="Buat Laporan"
      className="flex h-12 w-12 items-center justify-center rounded-full bg-transport-blue text-on-primary shadow-lg transition-colors hover:bg-primary"
    >
      <span className="flex items-center -space-x-1">
        <span className="material-symbols-outlined text-[18px]">directions_bus</span>
        <span className="material-symbols-outlined text-[13px]">edit</span>
      </span>
    </button>
  );
}
