"use client";

import type { HalteFeature } from "@/types/halte";

interface PriorityListProps {
  features: HalteFeature[];
  onSelect: (feature: HalteFeature) => void;
  onDispatch?: (feature: HalteFeature) => void;
  onInspectDetail?: (feature: HalteFeature) => void;
}

export default function PriorityList({
  features,
  onSelect,
  onDispatch,
  onInspectDetail,
}: PriorityListProps) {
  // Sort by lowest condition score (highest urgency)
  const sorted = [...features].sort(
    (a, b) => a.properties.condition_score - b.properties.condition_score
  );

  const rank1 = sorted[0];
  const rank2 = sorted[1];
  const rank3 = sorted[2];
  const rest = sorted.slice(3, 8);

  if (!rank1) {
    return (
      <div className="font-label-sm text-label-sm text-on-surface-variant p-4">
        Memuat daftar rekomendasi halte prioritas...
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-stack-md">
      {/* Action Card 1 (Rank 1 Featured Stop with Real Photo) */}
      <div className="bg-surface border border-transport-blue rounded-lg overflow-hidden group hover:shadow-md transition-shadow">
        <div
          onClick={() => onSelect(rank1)}
          className="h-28 bg-surface-container relative cursor-pointer overflow-hidden"
        >
          {rank1.properties.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={rank1.properties.photo_url}
              alt={rank1.properties.nama_halte}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-surface-container-high text-on-surface-variant font-label-sm">
              Foto Lapangan Trans Semarang
            </div>
          )}
          <div className="absolute top-2 left-2 bg-transport-blue text-white px-2 py-1 rounded font-label-sm text-[12px] font-bold flex items-center gap-1 shadow-sm">
            <span className="material-symbols-outlined text-[14px]">stars</span>
            Rank 1
          </div>
        </div>

        <div className="p-3">
          <div
            onClick={() => onSelect(rank1)}
            className="flex justify-between items-start mb-2 cursor-pointer"
          >
            <div className="min-w-0 flex-1 pr-2">
              <h4 className="font-label-md text-label-md font-bold text-on-surface hover:text-transport-blue truncate">
                {rank1.properties.nama_halte}
              </h4>
              <p className="font-label-sm text-[11px] text-on-surface-variant truncate">
                Jl. Koridor Kel. {rank1.properties.kelurahan}
              </p>
            </div>
            <span className="bg-surface-container-high text-transport-blue px-2 py-0.5 rounded font-label-sm text-[11px] font-bold shrink-0">
              +4200 served
            </span>
          </div>

          <div className="flex items-center gap-3 mt-3">
            <button
              onClick={() => onDispatch?.(rank1)}
              className="flex-1 bg-transport-blue text-white py-1.5 px-3 rounded font-label-sm text-[12px] font-bold hover:bg-primary transition-colors cursor-pointer shadow-xs active:scale-98 text-center"
            >
              Dispatch Team
            </button>
            <button
              onClick={() => onInspectDetail?.(rank1)}
              title="Lihat Detail & Catatan Lapangan"
              className="p-1.5 border border-border-low rounded text-on-surface-variant hover:bg-surface-container transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">more_horiz</span>
            </button>
          </div>
        </div>
      </div>

      {/* Action Card 2 (Rank 2 Location-Allocation) */}
      {rank2 && (
        <div
          onClick={() => onSelect(rank2)}
          className="bg-surface border border-border-low rounded-lg overflow-hidden group hover:shadow-sm transition-shadow cursor-pointer p-3"
        >
          <div className="flex justify-between items-start mb-1">
            <div className="min-w-0 flex-1 pr-2">
              <div className="flex items-center gap-2 mb-1">
                <span className="bg-surface-container-high px-1.5 py-0.5 rounded text-on-surface-variant font-label-sm text-[10px] uppercase font-bold tracking-wider">
                  Location-Allocation
                </span>
              </div>
              <h4 className="font-label-md text-label-md font-bold text-on-surface group-hover:text-transport-blue truncate">
                {rank2.properties.nama_halte}
              </h4>
              <p className="font-label-sm text-[11px] text-on-surface-variant truncate">
                Zona Kel. {rank2.properties.kelurahan}
              </p>
            </div>
            <span className="bg-surface-container-high text-transport-blue px-2 py-0.5 rounded font-label-sm text-[11px] font-bold shrink-0">
              +3100 served
            </span>
          </div>
        </div>
      )}

      {/* Action Card 3 (Critical Alert / Sidewalk Repair) */}
      {rank3 && (
        <div
          onClick={() => onSelect(rank3)}
          className="bg-surface border border-alert-red/30 rounded-lg overflow-hidden group hover:shadow-sm transition-shadow cursor-pointer relative"
        >
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-alert-red"></div>
          <div className="p-3 pl-4">
            <div className="flex justify-between items-start">
              <div className="min-w-0 flex-1 pr-2">
                <div className="flex items-center gap-2 mb-1">
                  <span className="bg-error-container text-on-error-container px-1.5 py-0.5 rounded font-label-sm text-[10px] uppercase font-bold tracking-wider flex items-center gap-1">
                    <span className="material-symbols-outlined text-[12px]">warning</span> Critical
                  </span>
                </div>
                <h4 className="font-label-md text-label-md font-bold text-on-surface group-hover:text-alert-red truncate">
                  Sidewalk Repair #{rank3.properties.halte_id.slice(-2)}
                </h4>
                <p className="font-label-sm text-[11px] text-on-surface-variant truncate">
                  {rank3.properties.nama_halte} ({rank3.properties.kelurahan})
                </p>
              </div>
              <span className="bg-surface-container text-on-surface-variant px-2 py-0.5 rounded font-label-sm text-[10px] font-bold shrink-0">
                Obstruction
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Additional Priority Stops */}
      {rest.map((feature, i) => (
        <div
          key={feature.properties.halte_id}
          onClick={() => onSelect(feature)}
          className="rounded-lg border border-border-low bg-surface p-2.5 text-left transition-all hover:bg-surface-container hover:shadow-xs cursor-pointer flex items-center justify-between gap-2"
        >
          <div className="min-w-0 flex-1">
            <div className="font-label-sm text-[12px] font-bold text-on-surface truncate">
              <span className="text-on-surface-variant mr-1">#{i + 4}</span>
              {feature.properties.nama_halte}
            </div>
            <div className="font-label-sm text-[10px] text-on-surface-variant">
              Kel. {feature.properties.kelurahan} • Skor: {feature.properties.condition_score}
            </div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDispatch?.(feature);
            }}
            className="px-2 py-1 bg-surface-container text-transport-blue text-[11px] font-bold rounded hover:bg-primary-fixed cursor-pointer shrink-0"
          >
            Dispatch
          </button>
        </div>
      ))}
    </div>
  );
}
