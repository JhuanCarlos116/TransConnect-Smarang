"use client";

import { useRef, useState } from "react";
import Link from "next/link";

import { useLocalProfile } from "@/lib/useLocalProfile";

const MAX_PHOTO_BYTES = 2 * 1024 * 1024;

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/**
 * Bottom footer bar: Home + the local profile avatar. Tapping the avatar
 * opens a small editor for the per-device profile (see useLocalProfile) that
 * ReportFormWidget and CommentSection both read from, so a citizen only
 * types their name once per device instead of on every report/comment.
 */
export default function ProfileFooter() {
  const { profile, setProfile, loaded } = useLocalProfile();
  const [editing, setEditing] = useState(false);
  const [nameDraft, setNameDraft] = useState(profile.name);
  const [photoDraft, setPhotoDraft] = useState<string | null>(profile.photoDataUrl);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  function openEditor() {
    setNameDraft(profile.name);
    setPhotoDraft(profile.photoDataUrl);
    setError(null);
    setEditing(true);
  }

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_PHOTO_BYTES) {
      setError("Ukuran foto maksimal 2 MB.");
      e.target.value = "";
      return;
    }
    setError(null);
    setPhotoDraft(await readAsDataUrl(file));
  }

  function handleSave() {
    setProfile({ name: nameDraft.trim(), photoDataUrl: photoDraft });
    setEditing(false);
  }

  return (
    <>
      <footer className="z-40 flex h-14 w-full shrink-0 items-center justify-between border-t border-border-low bg-surface px-margin-page">
        <Link
          href="/"
          aria-label="Beranda"
          className="flex h-10 w-10 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container-low"
        >
          <span className="material-symbols-outlined text-[24px]">home</span>
        </Link>

        <button
          onClick={openEditor}
          aria-label="Profil"
          className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border-2 border-transport-blue bg-surface-container-low text-transport-blue"
        >
          {loaded && profile.photoDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.photoDataUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="material-symbols-outlined text-[22px]">account_circle</span>
          )}
        </button>
      </footer>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-xl border border-border-low bg-surface p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-headline-md text-[18px] font-bold text-on-surface">Profil Kamu</h3>
              <button
                onClick={() => setEditing(false)}
                aria-label="Tutup"
                className="text-alert-red hover:text-on-error border border-alert-red p-1.5 rounded-lg hover:bg-alert-red transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="mb-4 flex flex-col items-center gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-border-low bg-surface-container-low text-outline"
              >
                {photoDraft ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photoDraft} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="material-symbols-outlined text-[32px]">add_a_photo</span>
                )}
              </button>
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhotoChange} className="hidden" />
              <button onClick={() => fileInputRef.current?.click()} className="text-label-sm text-transport-blue font-bold">
                {photoDraft ? "Ganti Foto" : "Tambah Foto"}
              </button>
            </div>

            <label className="mb-1 block font-label-sm text-[12px] font-bold text-on-surface">Nama</label>
            <input
              type="text"
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              placeholder="Nama kamu"
              maxLength={60}
              className="mb-1 w-full rounded-lg border border-border-low bg-surface-container-low p-2.5 font-body-md text-[13px] text-on-surface focus:border-transport-blue focus:outline-none focus:ring-1 focus:ring-transport-blue"
            />
            {error && <p className="mb-2 text-label-sm text-alert-red">{error}</p>}
            <p className="mb-4 text-[11px] leading-relaxed text-on-surface-variant">
              Tersimpan di HP ini saja, dipakai otomatis untuk laporan dan komentar berikutnya.
            </p>

            <button
              onClick={handleSave}
              disabled={!nameDraft.trim()}
              className="w-full rounded-lg bg-transport-blue px-4 py-2.5 font-label-md text-label-md font-bold text-on-primary transition-colors hover:bg-primary disabled:cursor-not-allowed disabled:opacity-70"
            >
              Simpan
            </button>
          </div>
        </div>
      )}
    </>
  );
}
