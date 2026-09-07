import Link from "next/link";

import { conditionColor, conditionLabelText } from "@/lib/conditionScore";
import LayerToggle from "@/components/map/LayerToggle";
import type { ConditionLabel, HalteFeature } from "@/types/halte";

const LABELS: ConditionLabel[] = ["red", "yellow", "green"];

interface PublicMapInfoPanelProps {
  features: HalteFeature[];
  verifiedReportCount: number | null;
  halteVisible: boolean;
  onHalteChange: (visible: boolean) => void;
  communityVisible: boolean;
  onCommunityChange: (visible: boolean) => void;
}

/**
 * The actual content shared by the desktop sidebar (PublicSidePanel, a
 * permanent <aside>) and the mobile bottom sheet (PublicMobileSheet, a
 * collapsible drawer) -- same cards/toggles/link, different surrounding
 * chrome, so only the chrome is duplicated between the two.
 */
export default function PublicMapInfoPanel({
  features,
  verifiedReportCount,
  halteVisible,
  onHalteChange,
  communityVisible,
  onCommunityChange,
}: PublicMapInfoPanelProps) {
  const counts: Record<ConditionLabel, number> = { green: 0, yellow: 0, red: 0 };
  for (const f of features) counts[f.properties.condition_label] += 1;
  const total = features.length;

  return (
    <>
      <div className="border-b border-border-low p-margin-page">
        <h1 className="mb-2 text-headline-lg text-on-surface">Peta Kondisi Halte</h1>
        <p className="text-body-md text-on-surface-variant">
          Kondisi {total} titik halte hasil survei lapangan Tim GOPEK di Kecamatan Tembalang, 22–23 Agustus 2026.
        </p>
        <p className="mt-stack-sm flex items-start gap-2 rounded-lg bg-surface-subtle p-3 text-label-sm leading-relaxed text-on-surface-variant">
          <span className="material-symbols-outlined text-[18px] text-transport-blue">touch_app</span>
          <span>
            Klik titik berwarna di peta untuk melihat foto survei, kondisi trotoar, dan penerangan di halte tersebut.
          </span>
        </p>
      </div>

      <div className="border-b border-border-low p-margin-page">
        <h3 className="mb-stack-md text-body-lg font-bold text-on-surface">Ringkasan Kondisi</h3>
        <div className="flex flex-col gap-stack-sm">
          {LABELS.map((label) => {
            const count = counts[label];
            const pct = total > 0 ? Math.round((count / total) * 100) : 0;
            return (
              <div
                key={label}
                className={`rounded-lg border bg-surface-subtle p-3 ${
                  label === "red" ? "border-alert-red/30 ring-1 ring-alert-red" : "border-border-low"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className="inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-label-sm font-bold text-on-primary"
                    style={{ backgroundColor: conditionColor(label) }}
                  >
                    {conditionLabelText(label)}
                  </span>
                  <span className="text-body-lg font-bold text-on-surface">{count}</span>
                </div>
                <div className="mt-1 text-label-sm text-on-surface-variant">{pct}% dari titik disurvei</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="border-b border-border-low p-margin-page">
        <h3 className="mb-stack-md text-body-lg font-bold text-on-surface">Layer Peta</h3>
        <div className="flex flex-col gap-3">
          <LayerToggle label="Titik Survei Halte" visible={halteVisible} onChange={onHalteChange} />
          <LayerToggle label="Laporan Warga (contoh)" visible={communityVisible} onChange={onCommunityChange} />
        </div>
        {verifiedReportCount !== null && (
          <p className="mt-stack-sm text-label-sm text-on-surface-variant">
            {verifiedReportCount} laporan — data contoh untuk demo pipeline verifikasi YOLOv8, bukan laporan warga
            asli.
          </p>
        )}
      </div>

      <div className="p-margin-page">
        <Link
          href="/dashboard"
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-transport-blue py-3 text-body-md font-bold text-on-primary transition-colors hover:bg-primary"
        >
          Buka Dashboard DISHUB
          <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
        </Link>
      </div>
    </>
  );
}
