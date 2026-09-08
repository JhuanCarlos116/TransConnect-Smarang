"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import AppHeader from "@/components/ui/AppHeader";
import ReportHaltePicker from "@/components/map/ReportHaltePicker";
import { createCitizenReport } from "@/lib/fetchCitizenReports";
import { useLocalProfile } from "@/lib/useLocalProfile";
import type { HalteFeature } from "@/types/halte";

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const MAX_VIDEO_BYTES = 25 * 1024 * 1024;

type Status = "idle" | "submitting" | "done" | "error";

/**
 * "Buat Laporan" as its own page rather than an in-map picking flow (see
 * ReportFormWidget.tsx's history) -- the report always ties to a specific
 * surveyed halte now (CitizenReport.halte_id), so picking one needs its own
 * map, not a single tap on the public map's already-busy canvas.
 */
export default function LaporPage() {
  const router = useRouter();
  const { profile } = useLocalProfile();

  const [halte, setHalte] = useState<HalteFeature | null>(null);
  const [name, setName] = useState(profile.name);
  const [description, setDescription] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [video, setVideo] = useState<File | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_PHOTO_BYTES) {
      setError("Ukuran foto maksimal 5 MB.");
      e.target.value = "";
      return;
    }
    setError(null);
    setPhoto(file);
  }

  function handleVideoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_VIDEO_BYTES) {
      setError("Ukuran video maksimal 25 MB.");
      e.target.value = "";
      return;
    }
    setError(null);
    setVideo(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!halte || !name.trim() || !description.trim()) return;

    setStatus("submitting");
    setError(null);
    try {
      await createCitizenReport({
        lat: halte.geometry.coordinates[1],
        lon: halte.geometry.coordinates[0],
        halteId: halte.properties.halte_id,
        reporterName: name.trim(),
        description: description.trim(),
        photo: photo ?? undefined,
        video: video ?? undefined,
      });
      setStatus("done");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Gagal mengirim laporan.");
    }
  }

  if (status === "done") {
    return (
      <div className="flex min-h-dvh flex-col font-sans">
        <AppHeader />
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
          <span className="material-symbols-outlined text-[48px] text-safety-green">check_circle</span>
          <h1 className="font-headline-md text-[20px] font-bold text-on-surface">Laporan Terkirim</h1>
          <p className="max-w-xs text-body-md text-on-surface-variant">
            Terima kasih, laporanmu tentang {halte?.properties.nama_halte} sudah kami terima.
          </p>
          <button
            onClick={() => router.push("/map")}
            className="rounded-lg bg-transport-blue px-5 py-2.5 font-label-md text-label-md font-bold text-on-primary transition-colors hover:bg-primary"
          >
            Kembali ke Peta
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col font-sans">
      <AppHeader />
      <div className="mx-auto w-full max-w-xl flex-1 px-4 py-5">
        <div className="mb-4 flex items-center gap-2">
          <button
            onClick={() => router.push("/map")}
            aria-label="Kembali"
            className="flex h-9 w-9 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container-low"
          >
            <span className="material-symbols-outlined text-[22px]">arrow_back</span>
          </button>
          <h1 className="font-headline-md text-[18px] font-bold text-on-surface">Buat Laporan</h1>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="mb-1.5 block font-label-sm text-[12px] font-bold text-on-surface">
              1. Pilih Halte/Bus Stop
            </label>
            <ReportHaltePicker selected={halte} onSelect={setHalte} />
            {halte && (
              <p className="mt-1.5 text-label-sm text-on-surface-variant">
                Dipilih: <span className="font-bold text-on-surface">{halte.properties.nama_halte}</span>
              </p>
            )}
          </div>

          <div>
            <label className="mb-1.5 block font-label-sm text-[12px] font-bold text-on-surface">2. Nama Kamu</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nama kamu"
              maxLength={60}
              required
              className="w-full rounded-lg border border-border-low bg-surface-container-low p-2.5 font-body-md text-[14px] text-on-surface focus:border-transport-blue focus:outline-none focus:ring-1 focus:ring-transport-blue"
            />
          </div>

          <div>
            <label className="mb-1.5 block font-label-sm text-[12px] font-bold text-on-surface">3. Laporan</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ceritakan kondisi halte/bus stop ini..."
              required
              rows={4}
              className="w-full rounded-lg border border-border-low bg-surface-container-low p-2.5 font-body-md text-[14px] text-on-surface focus:border-transport-blue focus:outline-none focus:ring-1 focus:ring-transport-blue"
            />
          </div>

          <div>
            <label className="mb-1.5 block font-label-sm text-[12px] font-bold text-on-surface">
              4. Tambah Foto / Video (opsional)
            </label>
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 rounded-lg border border-border-low bg-surface-container-low p-2.5 text-label-sm text-on-surface-variant">
                <span className="material-symbols-outlined text-[18px]">photo_camera</span>
                {photo ? photo.name : "Pilih foto (JPEG/PNG/WebP, maks 5 MB)"}
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhotoChange} className="hidden" />
              </label>
              <label className="flex items-center gap-2 rounded-lg border border-border-low bg-surface-container-low p-2.5 text-label-sm text-on-surface-variant">
                <span className="material-symbols-outlined text-[18px]">videocam</span>
                {video ? video.name : "Pilih video (MP4/WebM/MOV, maks 25 MB)"}
                <input type="file" accept="video/mp4,video/webm,video/quicktime" onChange={handleVideoChange} className="hidden" />
              </label>
            </div>
          </div>

          {error && <p className="text-label-sm text-alert-red">{error}</p>}

          <button
            type="submit"
            disabled={status === "submitting" || !halte || !name.trim() || !description.trim()}
            className="rounded-lg bg-transport-blue px-4 py-3 font-label-md text-label-md font-bold text-on-primary transition-colors hover:bg-primary disabled:cursor-not-allowed disabled:opacity-70"
          >
            {status === "submitting" ? "Mengirim..." : "Kirim Laporan"}
          </button>
        </form>
      </div>
    </div>
  );
}
