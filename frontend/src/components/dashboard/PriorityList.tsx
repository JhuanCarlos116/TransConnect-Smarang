import { conditionColor, conditionLabelText } from "@/lib/conditionScore";
import type { HalteFeature } from "@/types/halte";

interface PriorityListProps {
  features: HalteFeature[];
  onSelect: (feature: HalteFeature) => void;
}

const MAX_ITEMS = 8;

function ScoreBadge({ feature }: { feature: HalteFeature }) {
  return (
    <span
      className="whitespace-nowrap rounded px-2 py-0.5 text-label-sm font-bold text-on-primary"
      style={{ backgroundColor: conditionColor(feature.properties.condition_label) }}
    >
      {conditionLabelText(feature.properties.condition_label)} ({feature.properties.condition_score})
    </span>
  );
}

export default function PriorityList({ features, onSelect }: PriorityListProps) {
  const priority = [...features]
    .filter((f) => f.properties.condition_label !== "green")
    .sort((a, b) => a.properties.condition_score - b.properties.condition_score)
    .slice(0, MAX_ITEMS);

  if (priority.length === 0) {
    return <div className="text-label-sm text-on-surface-variant">Tidak ada titik dengan skor kondisi rendah.</div>;
  }

  const [first, second, ...rest] = priority;

  return (
    <div className="flex flex-col gap-stack-md">
      {/* Card 1 — featured, real survey photo */}
      <div className="group overflow-hidden rounded-lg border border-transport-blue bg-surface transition-shadow hover:shadow-md">
        <button onClick={() => onSelect(first)} className="block w-full text-left">
          <div className="relative h-24 bg-surface-container">
            {first.properties.photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element -- thumbnail from MAPID CDN
              <img
                src={first.properties.photo_url}
                alt={first.properties.nama_halte}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-label-sm text-on-surface-variant">
                Tidak ada foto
              </div>
            )}
            <div className="absolute left-2 top-2 flex items-center gap-1 rounded bg-transport-blue px-2 py-1 text-label-sm text-on-primary shadow-sm">
              <span className="material-symbols-outlined text-[14px]">stars</span>
              Prioritas #1
            </div>
          </div>
        </button>
        <div className="p-3">
          <div className="mb-2 flex items-start justify-between gap-2">
            <div>
              <h4 className="text-label-md font-bold text-on-surface">{first.properties.nama_halte}</h4>
              <p className="text-label-sm text-on-surface-variant">{first.properties.kelurahan}</p>
            </div>
            <ScoreBadge feature={first} />
          </div>
        </div>
      </div>

      {/* Card 2 — tag style, no photo */}
      {second && (
        <button
          onClick={() => onSelect(second)}
          className="rounded-lg border border-border-low bg-surface p-3 text-left transition-shadow hover:shadow-sm"
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="mb-1 inline-block rounded bg-surface-container-high px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                Prioritas #2
              </span>
              <h4 className="text-label-md font-bold text-on-surface">{second.properties.nama_halte}</h4>
              <p className="text-label-sm text-on-surface-variant">{second.properties.kelurahan}</p>
            </div>
            <ScoreBadge feature={second} />
          </div>
        </button>
      )}

      {/* Remaining — compact rows, red left-stripe for "Rawan" */}
      <ol className="flex flex-col gap-stack-sm">
        {rest.map((f, i) => {
          const isCritical = f.properties.condition_label === "red";
          return (
            <li key={f.properties.halte_id}>
              <button
                onClick={() => onSelect(f)}
                className={`relative flex w-full items-center gap-stack-sm overflow-hidden rounded-lg border bg-surface py-stack-sm pl-4 pr-stack-sm text-left transition-shadow hover:shadow-sm ${
                  isCritical ? "border-alert-red/30" : "border-border-low"
                }`}
              >
                {isCritical && (
                  <>
                    <span className="absolute bottom-0 left-0 top-0 w-1 bg-alert-red" />
                    <span className="material-symbols-outlined text-[16px] text-alert-red">warning</span>
                  </>
                )}
                <span className="text-label-sm text-on-surface-variant">{i + 3}.</span>
                <span className="flex-1 text-label-md text-on-surface">{f.properties.nama_halte}</span>
                <span className="text-label-sm font-mono text-on-surface-variant">
                  {conditionLabelText(f.properties.condition_label)} ({f.properties.condition_score})
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
