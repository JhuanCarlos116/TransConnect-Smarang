"use client";

import { useMemo, useRef, useState } from "react";

import { conditionColor, conditionLabelText } from "@/lib/conditionScore";
import type { HalteFeature } from "@/types/halte";

const MAX_RESULTS = 6;

interface HalteSearchProps {
  features: HalteFeature[];
  onSelect: (feature: HalteFeature) => void;
  placeholder?: string;
}

/**
 * The mockup puts a search field in the header. In the version we shipped it
 * was an <input> with nothing behind it; here it actually searches the 42
 * surveyed halte by name or kelurahan and flies the map to the pick.
 */
export default function HalteSearch({ features, onSelect, placeholder }: HalteSearchProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return features
      .filter(
        (f) =>
          f.properties.nama_halte.toLowerCase().includes(q) ||
          (f.properties.kelurahan ?? "").toLowerCase().includes(q),
      )
      .slice(0, MAX_RESULTS);
  }, [features, query]);

  function choose(feature: HalteFeature) {
    onSelect(feature);
    setQuery("");
    setOpen(false);
  }

  return (
    <div className="relative w-full">
      <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-outline">
        search
      </span>
      <input
        type="text"
        value={query}
        placeholder={placeholder ?? "Cari nama halte atau kelurahan..."}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        // Let a click on a result register before the list unmounts.
        onBlur={() => {
          blurTimer.current = setTimeout(() => setOpen(false), 120);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
          if (e.key === "Enter" && results[0]) choose(results[0]);
        }}
        className="w-full rounded border border-border-low bg-surface-container-low py-2 pl-10 pr-4 font-body-md text-body-md text-on-surface transition-colors focus:border-transport-blue focus:outline-none focus:ring-1 focus:ring-transport-blue"
      />

      {open && query.trim() && (
        <ul
          className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded border border-border-low bg-surface shadow-[0_4px_16px_rgba(0,0,0,0.12)]"
          onMouseDown={() => {
            if (blurTimer.current) clearTimeout(blurTimer.current);
          }}
        >
          {results.length === 0 && (
            <li className="px-3 py-2 font-label-sm text-label-sm text-on-surface-variant">Tidak ada halte yang cocok.</li>
          )}
          {results.map((f) => (
            <li key={f.properties.halte_id}>
              <button
                onClick={() => choose(f)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-surface-container"
              >
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: conditionColor(f.properties.condition_label) }}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-label-md text-label-md text-on-surface">
                    {f.properties.nama_halte}
                  </span>
                  <span className="block font-label-sm text-label-sm text-on-surface-variant">
                    {f.properties.kelurahan}
                  </span>
                </span>
                <span className="shrink-0 font-label-sm text-label-sm text-on-surface-variant">
                  {conditionLabelText(f.properties.condition_label)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
