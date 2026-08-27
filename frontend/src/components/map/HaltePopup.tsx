import ScoreBadge from "@/components/ui/ScoreBadge";
import type { HalteProperties } from "@/types/halte";

const ATTRIBUTE_ROWS: Array<{ key: keyof HalteProperties; label: string }> = [
  { key: "cctv", label: "CCTV" },
  { key: "lighting", label: "Penerangan" },
  { key: "sidewalk_condition", label: "Trotoar" },
  { key: "route_info_signage", label: "Info Rute" },
  { key: "canopy", label: "Kanopi/Peneduh" },
];

// "ada"/"tidak"/"-" extracted from free-text field notes — see backend/app/services/condition_score.py
function formatState(value: string): string {
  if (value === "ada") return "Ada";
  if (value === "tidak") return "Tidak ada";
  return "Tidak disebutkan";
}

interface HaltePopupProps {
  properties: HalteProperties;
}

export default function HaltePopup({ properties }: HaltePopupProps) {
  return (
    <div style={{ minWidth: 220, maxWidth: 260, fontFamily: "system-ui, sans-serif" }}>
      {properties.photo_url ? (
        // eslint-disable-next-line @next/next/no-img-element -- popup is rendered into a Mapbox GL DOM node, outside Next's page tree
        <img
          src={properties.photo_url}
          alt={properties.nama_halte}
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

      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 2 }}>{properties.nama_halte}</div>
      <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 8 }}>
        {properties.kelurahan}, {properties.kecamatan}
      </div>

      <ScoreBadge score={properties.condition_score} label={properties.condition_label} />

      <table style={{ width: "100%", marginTop: 10, fontSize: 13, borderCollapse: "collapse" }}>
        <tbody>
          {ATTRIBUTE_ROWS.map(({ key, label }) => (
            <tr key={key}>
              <td style={{ padding: "3px 0", color: "#6b7280" }}>{label}</td>
              <td style={{ padding: "3px 0", textAlign: "right", fontWeight: 500 }}>
                {formatState(properties[key] as string)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {properties.catatan_lapangan && (
        <div style={{ marginTop: 10, fontSize: 12, color: "#4b5563", lineHeight: 1.4 }}>
          <div style={{ fontWeight: 600, color: "#374151", marginBottom: 2 }}>Catatan Lapangan</div>
          {properties.catatan_lapangan}
        </div>
      )}
    </div>
  );
}
