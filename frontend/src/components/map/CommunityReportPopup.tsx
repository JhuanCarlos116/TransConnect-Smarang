import type { CommunityReportProperties } from "@/types/communityReport";

interface CommunityReportPopupProps {
  properties: CommunityReportProperties;
}

export default function CommunityReportPopup({ properties }: CommunityReportPopupProps) {
  const isVerified = properties.verification_status === "verified";

  return (
    <div style={{ minWidth: 220, maxWidth: 260, fontFamily: "system-ui, sans-serif" }}>
      {properties.photo_url ? (
        // eslint-disable-next-line @next/next/no-img-element -- popup is rendered into a MapLibre GL DOM node, outside Next's page tree
        <img
          src={properties.photo_url}
          alt={properties.judul}
          style={{ width: "100%", height: 120, objectFit: "cover", borderRadius: 6, marginBottom: 8 }}
        />
      ) : (
        <div
          style={{
            width: "100%",
            height: 120,
            borderRadius: 6,
            marginBottom: 8,
            backgroundColor: "#e5e7eb",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#6b7280",
            fontSize: 13,
          }}
        >
          Tidak ada foto
        </div>
      )}

      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          padding: "2px 8px",
          borderRadius: 999,
          fontSize: 11,
          fontWeight: 600,
          color: "#fff",
          backgroundColor: isVerified ? "#3b82f6" : "#9ca3af",
          marginBottom: 6,
        }}
      >
        {isVerified ? "✓ Lolos Verifikasi" : "Menunggu verifikasi"}
      </span>

      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 2 }}>{properties.judul}</div>
      <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 8 }}>{properties.kelurahan}</div>

      <div style={{ fontSize: 13, color: "#374151", lineHeight: 1.4, marginBottom: 8 }}>
        {properties.deskripsi}
      </div>

      <div style={{ fontSize: 11, color: "#9ca3af", borderTop: "1px solid #e5e7eb", paddingTop: 6 }}>
        <div>Pelapor: {properties.pelapor}</div>
        {properties.tanggal_lapor && <div>Tanggal: {properties.tanggal_lapor}</div>}
        {properties.verified_by && <div>Verifikasi: {properties.verified_by}</div>}
      </div>
    </div>
  );
}
