"use client";

import { useState } from "react";
import type { HalteFeature } from "@/types/halte";

interface DispatchModalProps {
  feature: HalteFeature | null;
  onClose: () => void;
  onConfirmDispatch: (details: {
    halteName: string;
    team: string;
    priority: string;
    notes: string;
  }) => void;
}

const TEAMS = [
  { id: "dishub-patrol", name: "DISHUB Kota Semarang — Tim Patroli & Fasilitas", role: "Transportasi" },
  { id: "pupr-pedestrian", name: "Dinas PUPR — Unit Revitalisasi Trotoar & Pedestrian", role: "Infrastruktur" },
  { id: "dlh-lighting", name: "Dinas Lingkungan Hidup — Unit Penerangan & Penghijauan", role: "Penerangan & Peneduh" },
];

export default function DispatchModal({
  feature,
  onClose,
  onConfirmDispatch,
}: DispatchModalProps) {
  const [selectedTeam, setSelectedTeam] = useState(TEAMS[0].id);
  const [priority, setPriority] = useState("Tinggi (24 Jam)");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!feature) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const teamObj = TEAMS.find((t) => t.id === selectedTeam);

    setTimeout(() => {
      onConfirmDispatch({
        halteName: feature.properties.nama_halte,
        team: teamObj?.name || selectedTeam,
        priority,
        notes: notes.trim() || `Tindak lanjut hasil deteksi AI & survei lapangan di ${feature.properties.kelurahan}.`,
      });
      setIsSubmitting(false);
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-lg rounded-xl border border-border-low bg-surface p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-border-low pb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-transport-blue/10 flex items-center justify-center text-transport-blue">
              <span className="material-symbols-outlined text-[24px]">send</span>
            </div>
            <div>
              <h3 className="font-headline-md text-[18px] font-bold text-on-surface">
                Dispatch Technical Team
              </h3>
              <p className="font-label-sm text-[12px] text-on-surface-variant">
                Penugasan tindak lanjut fasilitas lapangan
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-on-surface-variant hover:text-on-surface p-1.5 rounded-lg hover:bg-surface-container transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
          {/* Target Location Card */}
          <div className="rounded-lg border border-border-low bg-surface-container-low p-3 flex items-start justify-between">
            <div>
              <span className="font-label-sm text-[10px] uppercase font-bold text-transport-blue tracking-wider block">
                Lokasi Target Evaluasi
              </span>
              <div className="font-label-md text-[14px] font-bold text-on-surface mt-0.5">
                {feature.properties.nama_halte}
              </div>
              <div className="font-label-sm text-[12px] text-on-surface-variant">
                Kelurahan {feature.properties.kelurahan}, Kec. {feature.properties.kecamatan}
              </div>
            </div>
            <span className="font-label-sm text-[11px] font-bold px-2 py-0.5 rounded bg-error-container text-on-error-container">
              Skor: {feature.properties.condition_score}
            </span>
          </div>

          {/* Team Selection */}
          <div>
            <label className="block font-label-sm text-[12px] font-bold text-on-surface mb-1.5">
              Pilih Unit Dinas Pelaksana
            </label>
            <div className="flex flex-col gap-2">
              {TEAMS.map((team) => (
                <label
                  key={team.id}
                  className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition-all ${
                    selectedTeam === team.id
                      ? "border-transport-blue bg-primary-fixed/20 text-on-surface"
                      : "border-border-low bg-surface hover:bg-surface-container-low"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <input
                      type="radio"
                      name="team"
                      value={team.id}
                      checked={selectedTeam === team.id}
                      onChange={(e) => setSelectedTeam(e.target.value)}
                      className="text-transport-blue focus:ring-transport-blue"
                    />
                    <div>
                      <span className="block font-label-sm text-[12px] font-bold">{team.name}</span>
                      <span className="block font-label-sm text-[10px] text-on-surface-variant">Fokus: {team.role}</span>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Priority */}
          <div>
            <label className="block font-label-sm text-[12px] font-bold text-on-surface mb-1.5">
              Tingkat Prioritas Penanganan
            </label>
            <div className="grid grid-cols-3 gap-2">
              {["Tinggi (24 Jam)", "Sedang (48 Jam)", "Normal (1 Minggu)"].map((p) => (
                <button
                  type="button"
                  key={p}
                  onClick={() => setPriority(p)}
                  className={`py-2 px-1 text-center rounded-lg border font-label-sm text-[11px] font-bold cursor-pointer transition-colors ${
                    priority === p
                      ? "border-transport-blue bg-transport-blue text-white"
                      : "border-border-low bg-surface text-on-surface-variant hover:bg-surface-container"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block font-label-sm text-[12px] font-bold text-on-surface mb-1.5">
              Instruksi Kerja Petugas Lapangan
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: Lakukan pengecekan ketebalan trotoar dan perbaiki lampu penerangan jalan di radius 20 meter dari halte..."
              rows={3}
              className="w-full rounded-lg border border-border-low bg-surface p-2.5 text-on-surface text-[13px] font-body-md focus:border-transport-blue focus:ring-1 focus:ring-transport-blue focus:outline-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-border-low">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-border-low text-on-surface-variant hover:bg-surface-container font-label-md text-[13px] font-bold cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-lg bg-transport-blue text-white font-label-md text-[13px] font-bold hover:bg-primary transition-colors cursor-pointer flex items-center gap-2 disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                  <span>Mengirim Tugas...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[16px]">send</span>
                  <span>Kirim Penugasan</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

