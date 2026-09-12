"use client";

import { useState } from "react";

import { updateHalteFacilities } from "@/lib/updateHalteFacilities";
import type { FacilitySource, FacilityState, FacilityVariable, HalteFeature, HalteProperties } from "@/types/halte";

const ROWS: Array<{ key: FacilityVariable; label: string; icon: string }> = [
  { key: "cctv", label: "CCTV Pengawas", icon: "videocam" },
  { key: "lighting", label: "Penerangan Jalan", icon: "lightbulb" },
  { key: "sidewalk_condition", label: "Kondisi Trotoar", icon: "directions_walk" },
  { key: "route_info_signage", label: "Papan Informasi Rute", icon: "signpost" },
  { key: "canopy", label: "Kanopi / Peneduh", icon: "roofing" },
];

const STATE_OPTIONS: Array<{ value: FacilityState; label: string }> = [
  { value: "ada", label: "Tersedia & baik" },
  { value: "tidak", label: "Tidak ada / rusak" },
  { value: "-", label: "Tidak disebutkan" },
];

// Same solid-color-box treatment as HaltePublicModal's facility chips
// (see stateChipClasses there) -- the team asked for the dashboard's view
// to match what a passenger sees exactly, dropping the "baik/rusak" wording
// since a photo/survey only ever proves presence or absence, not quality.
function stateBoxClasses(value: FacilityState): string {
  if (value === "ada") return "bg-safety-green text-on-primary";
  if (value === "tidak") return "bg-alert-red text-on-primary";
  return "bg-outline-variant text-on-surface";
}

/**
 * Provenance badge, so a dispatcher can tell a machine-written value from a
 * surveyed one. This is the whole reason the detector is allowed to write to
 * the survey at all: it only ever fills variables nobody recorded, and every
 * value it touches stays marked as such until a human overrules it.
 *
 * Kept outside the color box (absolute, top-right corner) rather than
 * dropped entirely once the box itself switched to the passenger-style
 * solid-color look -- staff still need to see which values are
 * machine-written or hand-corrected, a passenger has no reason to.
 */
function sourceBadge(source: FacilitySource | undefined) {
  if (source === "ai") {
    return (
      <span
        title="Diisi otomatis dari foto laporan warga"
        className="rounded bg-surface/90 px-1.5 py-0.5 font-label-sm text-[9px] font-bold text-transport-blue backdrop-blur-sm"
      >
        dari foto
      </span>
    );
  }
  if (source === "manual") {
    return (
      <span
        title="Dikoreksi manual oleh admin DISHUB"
        className="rounded bg-surface/90 px-1.5 py-0.5 font-label-sm text-[9px] font-bold text-on-surface-variant backdrop-blur-sm"
      >
        dikoreksi
      </span>
    );
  }
  return null;
}

interface FacilityEditorProps {
  feature: HalteFeature;
  /** Hands the updated feature back to the dashboard so the map marker, its
   * colour and the score banner all move together with this edit. */
  onUpdated: (feature: HalteFeature) => void;
}

/**
 * Facility availability, with the manual-correction path DISHUB needs.
 *
 * The detector fills in variables the survey left unknown, but it cannot be
 * the last word: it only proves PRESENCE (a missing class means "not in
 * frame", not "absent"), it has no CCTV class at all, and `lighting` /
 * `route_info_signage` are its weakest reads. So every row is editable, and
 * a corrected row is labelled as such -- the dashboard should never present a
 * human correction and a model guess as if they were the same thing.
 */
export default function FacilityEditor({ feature, onUpdated }: FacilityEditorProps) {
  const p: HalteProperties = feature.properties;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Partial<Record<FacilityVariable, FacilityState>>>({});
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  function startEditing() {
    setDraft(Object.fromEntries(ROWS.map(({ key }) => [key, p[key]])) as Partial<Record<FacilityVariable, FacilityState>>);
    setError(null);
    setStatus("idle");
    setEditing(true);
  }

  async function handleSave() {
    const changes = Object.fromEntries(
      ROWS.filter(({ key }) => draft[key] !== undefined && draft[key] !== p[key]).map(({ key }) => [key, draft[key]!]),
    ) as Partial<Record<FacilityVariable, FacilityState>>;

    if (Object.keys(changes).length === 0) {
      setEditing(false);
      return;
    }

    setStatus("saving");
    setError(null);
    try {
      const updated = await updateHalteFacilities(p.halte_id, changes);
      onUpdated(updated);
      setEditing(false);
      setStatus("idle");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Gagal menyimpan koreksi fasilitas.");
    }
  }

  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2">
        <h4 className="font-label-md text-[13px] font-bold text-on-surface">Ketersediaan Fasilitas</h4>
        {!editing && (
          <button
            onClick={startEditing}
            className="flex items-center gap-1 rounded-lg border border-border-low px-2 py-1 font-label-sm text-[11px] font-bold text-transport-blue transition-colors hover:bg-surface-container"
          >
            <span className="material-symbols-outlined text-[15px]">edit</span>
            Koreksi manual
          </button>
        )}
      </div>

      {editing ? (
        <div className="grid grid-cols-1 gap-2">
          {ROWS.map(({ key, label, icon }) => {
            const value = p[key];
            return (
              <div
                key={key}
                className="flex items-center justify-between gap-2 rounded-lg border border-border-low bg-surface p-2.5"
              >
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-outline">{icon}</span>
                  <span className="font-label-sm text-[12px] font-medium text-on-surface">{label}</span>
                </div>
                <select
                  aria-label={`${label} — status fasilitas`}
                  value={draft[key] ?? value}
                  onChange={(e) => setDraft((cur) => ({ ...cur, [key]: e.target.value as FacilityState }))}
                  className="shrink-0 rounded border border-border-low bg-surface px-1.5 py-1 font-label-sm text-[11px] text-on-surface"
                >
                  {STATE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            );
          })}
        </div>
      ) : (
        // Same 2-column solid-color box grid as HaltePublicModal's public
        // facility display -- see ATTRIBUTE_ROWS/stateChipClasses there.
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {ROWS.map(({ key, label, icon }) => {
            const value = p[key];
            const badge = sourceBadge(p.facility_sources?.[key]);
            return (
              <div key={key} className={`relative flex items-center gap-2 rounded-lg p-2.5 ${stateBoxClasses(value)}`}>
                <span className="material-symbols-outlined text-[18px]">{icon}</span>
                <span className="font-label-sm text-[12px] font-medium">{label}</span>
                {badge && <span className="absolute right-2 top-2">{badge}</span>}
              </div>
            );
          })}
        </div>
      )}

      {editing && (
        <div className="mt-2 flex flex-col gap-2">
          {error && <p className="text-label-sm text-[11px] text-alert-red">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={status === "saving"}
              className="rounded-lg bg-transport-blue px-3 py-1.5 font-label-sm text-[11px] font-bold text-on-primary transition-colors hover:bg-primary disabled:cursor-not-allowed disabled:opacity-70"
            >
              {status === "saving" ? "Menyimpan..." : "Simpan koreksi"}
            </button>
            <button
              onClick={() => setEditing(false)}
              className="rounded-lg border border-border-low px-3 py-1.5 font-label-sm text-[11px] font-bold text-on-surface-variant transition-colors hover:bg-surface-container"
            >
              Batal
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
