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
    <div className="min-w-[220px] max-w-[260px] font-sans">
      {properties.photo_url ? (
        // eslint-disable-next-line @next/next/no-img-element -- popup is rendered into a Mapbox GL DOM node, outside Next's page tree
        <img
          src={properties.photo_url}
          alt={properties.nama_halte}
          className="mb-2 h-[120px] w-full rounded-md object-cover"
        />
      ) : (
        <div className="mb-2 flex h-[120px] w-full items-center justify-center rounded-md bg-surface-container text-label-sm text-on-surface-variant">
          Tidak ada foto
        </div>
      )}

      <div className="mb-0.5 text-body-md font-bold text-on-surface">{properties.nama_halte}</div>
      <div className="mb-2 text-label-sm text-on-surface-variant">
        {properties.kelurahan}, {properties.kecamatan}
      </div>

      <ScoreBadge score={properties.condition_score} label={properties.condition_label} />

      <table className="mt-2.5 w-full border-collapse text-label-md">
        <tbody>
          {ATTRIBUTE_ROWS.map(({ key, label }) => (
            <tr key={key}>
              <td className="py-0.5 text-on-surface-variant">{label}</td>
              <td className="py-0.5 text-right font-semibold text-on-surface">
                {formatState(properties[key] as string)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {properties.catatan_lapangan && (
        <div className="mt-2.5 text-label-sm leading-relaxed text-on-surface-variant">
          <div className="mb-0.5 font-bold text-on-surface">Catatan Lapangan</div>
          {properties.catatan_lapangan}
        </div>
      )}
    </div>
  );
}
