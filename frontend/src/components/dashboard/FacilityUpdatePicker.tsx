"use client";

import type { FacilityVariable } from "@/types/halte";
import type { TaskFacilityState } from "@/types/task";

const ROWS: Array<{ key: FacilityVariable; label: string; icon: string }> = [
  { key: "cctv", label: "CCTV Pengawas", icon: "videocam" },
  { key: "lighting", label: "Penerangan Jalan", icon: "lightbulb" },
  { key: "sidewalk_condition", label: "Kondisi Trotoar", icon: "directions_walk" },
  { key: "route_info_signage", label: "Papan Informasi Rute", icon: "signpost" },
  { key: "canopy", label: "Kanopi / Peneduh", icon: "roofing" },
];

export type FacilityUpdates = Partial<Record<FacilityVariable, TaskFacilityState>>;

interface FacilityUpdatePickerProps {
  value: FacilityUpdates;
  onChange: (value: FacilityUpdates) => void;
}

/**
 * Lets a technician flag which of the 5 survey facilities changed while
 * they were on site, and to what -- separate from FacilityEditor's dropdown
 * (that one edits every row unconditionally; this one is opt-in per row,
 * since most repairs only touch one or two facilities, and the ones not
 * mentioned here should stay exactly as they are until DISHUB approves this
 * batch, not silently reset to some default).
 *
 * A row starts unset (not included in the report). Clicking "Ada"/"Tidak"
 * both includes the row and picks that value; clicking the already-active
 * one again removes the row from the report entirely, mirroring
 * AssigneePicker's toggle-to-deselect behavior.
 */
export default function FacilityUpdatePicker({ value, onChange }: FacilityUpdatePickerProps) {
  function setState(key: FacilityVariable, state: TaskFacilityState) {
    if (value[key] === state) {
      const next = { ...value };
      delete next[key];
      onChange(next);
      return;
    }
    onChange({ ...value, [key]: state });
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span className="font-label-sm text-[12px] font-bold text-on-surface">
        Fasilitas yang berubah (opsional)
      </span>
      <div className="grid grid-cols-1 gap-2">
        {ROWS.map(({ key, label, icon }) => {
          const current = value[key];
          return (
            <div
              key={key}
              className="flex items-center justify-between gap-2 rounded-lg border border-border-low bg-surface p-2.5"
            >
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-outline">{icon}</span>
                <span className="font-label-sm text-[12px] font-medium text-on-surface">{label}</span>
              </div>
              <div className="flex shrink-0 gap-1.5">
                <button
                  type="button"
                  onClick={() => setState(key, "ada")}
                  aria-pressed={current === "ada"}
                  className={
                    current === "ada"
                      ? "rounded-full bg-safety-green px-2.5 py-1 text-[11px] font-bold text-on-primary"
                      : "rounded-full border border-border-low px-2.5 py-1 text-[11px] text-on-surface-variant transition-colors hover:border-safety-green hover:text-safety-green"
                  }
                >
                  Ada
                </button>
                <button
                  type="button"
                  onClick={() => setState(key, "tidak")}
                  aria-pressed={current === "tidak"}
                  className={
                    current === "tidak"
                      ? "rounded-full bg-alert-red px-2.5 py-1 text-[11px] font-bold text-on-primary"
                      : "rounded-full border border-border-low px-2.5 py-1 text-[11px] text-on-surface-variant transition-colors hover:border-alert-red hover:text-alert-red"
                  }
                >
                  Tidak
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
