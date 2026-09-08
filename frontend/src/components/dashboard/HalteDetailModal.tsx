"use client";

import { useState } from "react";
import Link from "next/link";

import { conditionColor, conditionLabelText } from "@/lib/conditionScore";
import { createTask } from "@/lib/fetchTasks";
import MediaCarousel from "@/components/map/MediaCarousel";
import CitizenReportSection from "@/components/dashboard/CitizenReportSection";
import type { HalteFeature, HalteProperties } from "@/types/halte";

interface HalteDetailModalProps {
  feature: HalteFeature | null;
  onClose: () => void;
}

const ATTRIBUTE_ROWS: Array<{ key: keyof HalteProperties; label: string; icon: string }> = [
  { key: "cctv", label: "CCTV Pengawas", icon: "videocam" },
  { key: "lighting", label: "Penerangan Jalan", icon: "lightbulb" },
  { key: "sidewalk_condition", label: "Kondisi Trotoar", icon: "directions_walk" },
  { key: "route_info_signage", label: "Papan Informasi Rute", icon: "signpost" },
  { key: "canopy", label: "Kanopi / Peneduh", icon: "roofing" },
];

function formatState(value: string): { text: string; colorClass: string } {
  if (value === "ada") return { text: "Tersedia & Baik", colorClass: "text-safety-green bg-green-50" };
  if (value === "tidak") return { text: "Tidak Ada / Rusak", colorClass: "text-alert-red bg-red-50" };
  return { text: "Tidak Disebutkan", colorClass: "text-on-surface-variant bg-surface-container" };
}

interface FieldNoteSectionProps {
  note: string;
}

/** Collapsible like TaskCreateSection/CitizenReportSection below -- this is
 * the team's own field survey note (HalteProperties.catatan_lapangan),
 * distinct from CitizenReportSection's real citizen-submitted reports. */
function FieldNoteSection({ note }: FieldNoteSectionProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-lg border border-border-low bg-surface p-3">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between font-label-md text-[13px] font-bold text-on-surface"
      >
        <span className="flex items-center gap-2">
          <span className="material-symbols-outlined text-transport-blue text-[18px]">edit_note</span>
          Catatan Survei Lapangan (#timGOPEK)
        </span>
        <span className="material-symbols-outlined text-[18px] text-on-surface-variant">
          {open ? "expand_less" : "expand_more"}
        </span>
      </button>

      {open && (
        <p className="mt-3 font-body-md text-[13px] text-on-surface-variant leading-relaxed italic bg-surface-container-low p-2.5 rounded">
          &ldquo;{note}&rdquo;
        </p>
      )}
    </div>
  );
}

interface TaskCreateSectionProps {
  halteId: string;
}

/**
 * Policy & Task Dispatcher Dashboard (PRD roadmap item) -- every task traces
 * back to a specific surveyed halte, entered here rather than as a
 * free-floating to-do. See app/routers/task.py for why "assigned_to" is
 * plain text: there is no staff login/account system in this project.
 */
function TaskCreateSection({ halteId }: TaskCreateSectionProps) {
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!description.trim()) return;
    setStatus("submitting");
    setError(null);
    try {
      await createTask({ halte_id: halteId, description: description.trim(), assigned_to: assignedTo.trim() || undefined });
      setStatus("done");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Gagal membuat tugas.");
    }
  }

  if (status === "done") {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-safety-green/30 bg-green-50 p-3 text-label-sm text-on-surface">
        <span className="material-symbols-outlined text-[18px] text-safety-green">check_circle</span>
        Tugas berhasil dibuat. Lihat di{" "}
        <Link href="/dashboard/tasks" className="font-bold text-transport-blue underline">
          Tugas Perbaikan
        </Link>
        .
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border-low bg-surface p-3">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between font-label-md text-[13px] font-bold text-on-surface"
      >
        <span className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px] text-transport-blue">assignment_add</span>
          Buat Tugas Perbaikan
        </span>
        <span className="material-symbols-outlined text-[18px] text-on-surface-variant">
          {open ? "expand_less" : "expand_more"}
        </span>
      </button>

      {open && (
        <form onSubmit={handleSubmit} className="mt-3 flex flex-col gap-2.5">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Deskripsi perbaikan yang dibutuhkan..."
            required
            rows={3}
            className="w-full rounded-lg border border-border-low bg-surface-container-low p-2.5 font-body-md text-[13px] text-on-surface focus:border-transport-blue focus:outline-none focus:ring-1 focus:ring-transport-blue"
          />
          <input
            type="text"
            value={assignedTo}
            onChange={(e) => setAssignedTo(e.target.value)}
            placeholder="Ditugaskan ke (opsional, mis. Tim Trotoar Wilayah 1)"
            className="w-full rounded-lg border border-border-low bg-surface-container-low p-2.5 font-body-md text-[13px] text-on-surface focus:border-transport-blue focus:outline-none focus:ring-1 focus:ring-transport-blue"
          />
          {error && <p className="text-label-sm text-alert-red">{error}</p>}
          <button
            type="submit"
            disabled={status === "submitting"}
            className="self-start rounded-lg bg-transport-blue px-4 py-2 font-label-sm text-label-sm font-bold text-on-primary transition-colors hover:bg-primary disabled:cursor-not-allowed disabled:opacity-70"
          >
            {status === "submitting" ? "Menyimpan..." : "Simpan Tugas"}
          </button>
        </form>
      )}
    </div>
  );
}

export default function HalteDetailModal({ feature, onClose }: HalteDetailModalProps) {
  if (!feature) return null;
  const p = feature.properties;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto scrollbar-hide rounded-xl border border-border-low bg-surface p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border-low pb-4">
          <div>
            <span className="font-label-sm text-[11px] font-bold uppercase tracking-wider text-transport-blue block">
              Evaluasi Fasilitas Lapangan • ID: {p.halte_id.slice(-6)}
            </span>
            <h3 className="font-headline-md text-[20px] font-bold text-on-surface mt-0.5">
              {p.nama_halte}
            </h3>
            <p className="font-label-sm text-[12px] text-on-surface-variant">
              Kelurahan {p.kelurahan}, Kecamatan {p.kecamatan}, Kota Semarang
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-alert-red hover:text-on-error border border-alert-red p-1.5 rounded-lg hover:bg-alert-red transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="mt-4 flex flex-col gap-4">
          {/* Media carousel & score banner */}
          <div className="relative h-56 w-full rounded-lg overflow-hidden bg-surface-container border border-border-low">
            <MediaCarousel key={p.halte_id} media={p.media} alt={p.nama_halte} />
            <div className="pointer-events-none absolute top-3 left-3 bg-surface/90 backdrop-blur-sm px-3 py-1 rounded-lg border border-border-low shadow-sm flex items-center gap-2">
              <span
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: conditionColor(p.condition_label) }}
              />
              <span className="font-label-md text-[13px] font-bold text-on-surface">
                {conditionLabelText(p.condition_label)} (Skor: {p.condition_score}/100)
              </span>
            </div>
            {p.survey_date && (
              <div className="pointer-events-none absolute bottom-3 right-3 bg-black/70 text-white font-label-sm text-[11px] px-2.5 py-1 rounded-md">
                Survei: {p.survey_date}
              </div>
            )}
          </div>

          {/* Coordinates Info */}
          <div className="grid grid-cols-2 gap-2 text-label-sm text-[12px] bg-surface-container-low p-3 rounded-lg border border-border-low">
            <div>
              <span className="text-on-surface-variant block">Koordinat Longitude:</span>
              <span className="font-bold text-on-surface font-mono">{feature.geometry.coordinates[0].toFixed(6)}</span>
            </div>
            <div>
              <span className="text-on-surface-variant block">Koordinat Latitude:</span>
              <span className="font-bold text-on-surface font-mono">{feature.geometry.coordinates[1].toFixed(6)}</span>
            </div>
          </div>

          {/* Facility Attributes Checklist */}
          <div>
            <h4 className="font-label-md text-[13px] font-bold text-on-surface mb-1">
              Ketersediaan Fasilitas
            </h4>
            <p className="font-label-sm text-[11px] text-on-surface-variant mb-2">
              Hasil pengamatan manual tim survei di lapangan -- YOLOv8 belum terintegrasi ke aplikasi ini, jadi ini
              bukan deteksi otomatis.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {ATTRIBUTE_ROWS.map(({ key, label, icon }) => {
                const state = formatState(p[key] as string);
                return (
                  <div
                    key={key}
                    className="flex items-center justify-between p-2.5 rounded-lg border border-border-low bg-surface"
                  >
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-outline text-[18px]">{icon}</span>
                      <span className="font-label-sm text-[12px] text-on-surface font-medium">{label}</span>
                    </div>
                    <span className={`font-label-sm text-[11px] font-bold px-2 py-0.5 rounded ${state.colorClass}`}>
                      {state.text}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <CitizenReportSection halteId={p.halte_id} />

          {p.catatan_lapangan && <FieldNoteSection note={p.catatan_lapangan} />}

          <TaskCreateSection key={p.halte_id} halteId={p.halte_id} />
        </div>
      </div>
    </div>
  );
}
