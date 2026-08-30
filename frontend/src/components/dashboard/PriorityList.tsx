import { conditionColor, conditionLabelText } from "@/lib/conditionScore";
import type { HalteFeature } from "@/types/halte";

interface PriorityListProps {
  features: HalteFeature[];
  onSelect: (feature: HalteFeature) => void;
}

const MAX_ITEMS = 8;

function ScorePill({ feature }: { feature: HalteFeature }) {
  return (
    <span
      className="shrink-0 whitespace-nowrap rounded px-2 py-0.5 font-label-sm text-label-sm font-bold text-on-primary"
      style={{ backgroundColor: conditionColor(feature.properties.condition_label) }}
    >
      {conditionLabelText(feature.properties.condition_label)} ({feature.properties.condition_score})
    </span>
  );
}

/**
 * Card vocabulary taken from the mockup's Priority Actions panel: a photo-led
 * rank-1 card, a tagged second card, then compact rows with a red rail for the
 * critical ones.
 *
 * The mockup filled these with Location-Allocation output ("Recommended Stop
 * A, +4200 served"). That model is not built yet, so the cards carry what we
 * genuinely have — surveyed halte ordered by condition score — and the panel
 * header says so rather than implying the ranking came from an optimiser.
 */
export default function PriorityList({ features, onSelect }: PriorityListProps) {
  const priority = [...features]
    .filter((f) => f.properties.condition_label !== "green")
    .sort((a, b) => a.properties.condition_score - b.properties.condition_score)
    .slice(0, MAX_ITEMS);

  if (priority.length === 0) {
    return (
      <div className="font-label-sm text-label-sm text-on-surface-variant">
        Tidak ada titik dengan skor kondisi rendah.
      </div>
    );
  }

  const [first, second, ...rest] = priority;

  return (
    <div className="flex flex-col gap-stack-md">
      {/* Rank 1 — photo-led, matching the mockup's featured card */}
      <button
        onClick={() => onSelect(first)}
        className="group overflow-hidden rounded-lg border border-transport-blue bg-surface text-left transition-shadow hover:shadow-md"
      >
        <div className="relative h-24 bg-surface-container">
          {first.properties.photo_url && (
            // eslint-disable-next-line @next/next/no-img-element -- thumbnail served from the MAPID CDN
            <img
              src={first.properties.photo_url}
              alt={first.properties.nama_halte}
              className="h-full w-full object-cover"
            />
          )}
          <span className="absolute left-2 top-2 flex items-center gap-1 rounded bg-transport-blue px-2 py-1 font-label-sm text-label-sm text-on-primary shadow-sm">
            <span className="material-symbols-outlined text-[14px]">stars</span>
            Prioritas 1
          </span>
        </div>
        <div className="p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h4 className="font-label-md text-label-md font-bold text-on-surface">{first.properties.nama_halte}</h4>
              <p className="font-label-sm text-label-sm text-on-surface-variant">{first.properties.kelurahan}</p>
            </div>
            <ScorePill feature={first} />
          </div>
        </div>
      </button>

      {/* Rank 2 — tagged card, no photo */}
      {second && (
        <button
          onClick={() => onSelect(second)}
          className="rounded-lg border border-border-low bg-surface p-3 text-left transition-shadow hover:shadow-sm"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <span className="mb-1 inline-block rounded bg-surface-container-high px-1.5 py-0.5 font-label-sm text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                Skor kondisi survei
              </span>
              <h4 className="font-label-md text-label-md font-bold text-on-surface">{second.properties.nama_halte}</h4>
              <p className="font-label-sm text-label-sm text-on-surface-variant">{second.properties.kelurahan}</p>
            </div>
            <ScorePill feature={second} />
          </div>
        </button>
      )}

      {/* Remainder — compact rows, red rail on the ones scored "rawan" */}
      {rest.map((feature, i) => {
        const critical = feature.properties.condition_label === "red";
        return (
          <button
            key={feature.properties.halte_id}
            onClick={() => onSelect(feature)}
            className={`relative overflow-hidden rounded-lg border bg-surface p-3 pl-4 text-left transition-shadow hover:shadow-sm ${
              critical ? "border-alert-red/30" : "border-border-low"
            }`}
          >
            {critical && <span className="absolute bottom-0 left-0 top-0 w-1 bg-alert-red" />}
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                {critical && (
                  <span className="mb-1 flex w-fit items-center gap-1 rounded bg-error-container px-1.5 py-0.5 font-label-sm text-[10px] font-bold uppercase tracking-wider text-on-error-container">
                    <span className="material-symbols-outlined text-[12px]">warning</span>
                    Rawan
                  </span>
                )}
                <h4 className="font-label-md text-label-md font-bold text-on-surface">
                  <span className="text-on-surface-variant">{i + 3}.</span> {feature.properties.nama_halte}
                </h4>
                <p className="font-label-sm text-label-sm text-on-surface-variant">{feature.properties.kelurahan}</p>
              </div>
              <ScorePill feature={feature} />
            </div>
          </button>
        );
      })}
    </div>
  );
}
