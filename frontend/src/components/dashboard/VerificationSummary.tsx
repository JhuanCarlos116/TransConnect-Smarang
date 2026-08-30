interface VerificationSummaryProps {
  halteCount: number;
  verifiedReportCount: number | null;
}

interface StatCardProps {
  icon: string;
  label: string;
  value: string;
  badge: string;
  badgeIcon: string;
  badgeClass: string;
  barClass: string;
}

function StatCard({ icon, label, value, badge, badgeIcon, badgeClass, barClass }: StatCardProps) {
  return (
    <div className="rounded border border-border-low bg-surface p-3 shadow-sm">
      <div className="mb-1 flex items-center justify-between">
        <span className="material-symbols-outlined text-[18px] text-outline">{icon}</span>
        <span className={`flex items-center gap-1 font-label-sm text-label-sm font-bold ${badgeClass}`}>
          <span className="material-symbols-outlined text-[14px]">{badgeIcon}</span>
          {badge}
        </span>
      </div>
      <div className="font-label-sm text-label-sm text-on-surface-variant">{label}</div>
      <div className="mt-1 font-headline-md text-headline-md font-bold text-on-surface">{value}</div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-container-high">
        <div className={`h-full w-full ${barClass}`} />
      </div>
    </div>
  );
}

/**
 * Occupies the slot the mockup gave to "YOLOv8 Detection Summary", in the
 * same two-card layout.
 *
 * An earlier pass filled it with invented figures — 1,204 sidewalks at 84%
 * valid, 4,392 streetlights at 22% QC required — while receiving the real
 * `halteCount` / `verifiedReportCount` props and never reading them.
 * YOLOv8 is still being trained, not wired into this app yet, so the cards
 * report what the pipeline has actually produced so far: the 42 surveyed
 * halte (QA'd by hand) and the community-report demo count, and the heading
 * says plainly that these are manual counts, not model output.
 */
export default function VerificationSummary({ halteCount, verifiedReportCount }: VerificationSummaryProps) {
  return (
    <div className="border-t border-border-low bg-surface-subtle p-gutter">
      <h3 className="mb-2 flex items-center gap-2 font-label-md text-label-md font-bold text-on-surface">
        <span className="material-symbols-outlined text-[18px] text-transport-blue">memory</span>
        Status Verifikasi
      </h3>
      <p className="mb-3 font-label-sm text-label-sm leading-relaxed text-on-surface-variant">
        YOLOv8 belum terintegrasi — angka di bawah hasil QA manual tim, bukan deteksi AI otomatis.
      </p>
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          icon="directions_walk"
          label="Titik Survei"
          value={String(halteCount)}
          badge="QA manual"
          badgeIcon="check_circle"
          badgeClass="text-safety-green"
          barClass="bg-safety-green"
        />
        <StatCard
          icon="campaign"
          label="Laporan Warga"
          value={verifiedReportCount === null ? "…" : String(verifiedReportCount)}
          badge="data contoh"
          badgeIcon="check_circle"
          badgeClass="text-transport-blue"
          barClass="bg-transport-blue"
        />
      </div>
    </div>
  );
}
