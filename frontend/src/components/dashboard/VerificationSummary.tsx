interface VerificationSummaryProps {
  halteCount: number;
  verifiedReportCount: number | null;
}

export default function VerificationSummary({ halteCount, verifiedReportCount }: VerificationSummaryProps) {
  return (
    <div className="border-t border-border-low bg-surface-subtle p-gutter">
      <h3 className="mb-3 flex items-center gap-2 text-label-md font-bold text-on-surface">
        <span className="material-symbols-outlined text-[18px] text-transport-blue">memory</span>
        Status Verifikasi
      </h3>
      <p className="mb-3 text-label-sm text-on-surface-variant">
        YOLOv8 belum terintegrasi — angka di bawah ini hasil QA manual tim, bukan deteksi AI otomatis.
      </p>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded border border-border-low bg-surface p-3 shadow-sm">
          <div className="mb-1 flex items-center justify-between">
            <span className="material-symbols-outlined text-[18px] text-outline">directions_walk</span>
            <span className="flex items-center gap-1 text-label-sm font-bold text-safety-green">
              <span className="material-symbols-outlined text-[14px]">check_circle</span>
              QA manual
            </span>
          </div>
          <div className="text-label-sm text-on-surface-variant">Titik Survei</div>
          <div className="mt-1 text-headline-md font-bold text-on-surface">{halteCount}</div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-container-high">
            <div className="h-full w-full bg-safety-green" />
          </div>
        </div>
        <div className="rounded border border-border-low bg-surface p-3 shadow-sm">
          <div className="mb-1 flex items-center justify-between">
            <span className="material-symbols-outlined text-[18px] text-outline">campaign</span>
            <span className="flex items-center gap-1 text-label-sm font-bold text-transport-blue">
              <span className="material-symbols-outlined text-[14px]">check_circle</span>
              data contoh
            </span>
          </div>
          <div className="text-label-sm text-on-surface-variant">Laporan Warga</div>
          <div className="mt-1 text-headline-md font-bold text-on-surface">{verifiedReportCount ?? "…"}</div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-container-high">
            <div className="h-full w-full bg-transport-blue" />
          </div>
        </div>
      </div>
    </div>
  );
}
