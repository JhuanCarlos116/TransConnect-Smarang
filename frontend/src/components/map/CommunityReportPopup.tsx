import type { CommunityReportProperties } from "@/types/communityReport";

interface CommunityReportPopupProps {
  properties: CommunityReportProperties;
}

export default function CommunityReportPopup({ properties }: CommunityReportPopupProps) {
  const isVerified = properties.verification_status === "verified";

  return (
    <div className="min-w-[220px] max-w-[260px] font-sans">
      {properties.photo_url ? (
        // eslint-disable-next-line @next/next/no-img-element -- popup is rendered into a MapLibre GL DOM node, outside Next's page tree
        <img
          src={properties.photo_url}
          alt={properties.judul}
          className="mb-2 h-[120px] w-full rounded-md object-cover"
        />
      ) : (
        <div className="mb-2 flex h-[120px] w-full items-center justify-center rounded-md bg-surface-container text-label-sm text-on-surface-variant">
          Tidak ada foto
        </div>
      )}

      <span
        className={`mb-1.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-label-sm font-bold text-on-primary ${
          isVerified ? "bg-transport-blue" : "bg-outline"
        }`}
      >
        {isVerified ? "✓ Lolos Verifikasi" : "Menunggu verifikasi"}
      </span>

      <div className="mb-0.5 text-body-md font-bold text-on-surface">{properties.judul}</div>
      <div className="mb-2 text-label-sm text-on-surface-variant">{properties.kelurahan}</div>

      <div className="mb-2 text-label-md leading-relaxed text-on-surface">{properties.deskripsi}</div>

      <div className="border-t border-border-low pt-1.5 text-label-sm text-on-surface-variant">
        <div>Pelapor: {properties.pelapor}</div>
        {properties.tanggal_lapor && <div>Tanggal: {properties.tanggal_lapor}</div>}
        {properties.verified_by && <div>Verifikasi: {properties.verified_by}</div>}
      </div>
    </div>
  );
}
