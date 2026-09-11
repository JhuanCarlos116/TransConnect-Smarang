import Image from "next/image";
import Link from "next/link";

/**
 * Role chooser -- lived at "/" until the landing page took that slot over.
 * Kept as its own step rather than folded into the landing page so the
 * landing page can stay a single scroll of promotional content with one
 * clear call to action, instead of mixing "learn about the project" and
 * "pick your role" in the same screen.
 */
export default function MasukPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-8 bg-surface-subtle px-6 font-sans">
      <div className="flex flex-col items-center gap-3">
        <Image src="/logo-icon.png" alt="" width={128} height={128} className="h-16 w-16" priority />
        <div className="text-center">
          <h1 className="font-headline-lg text-headline-lg font-bold text-transport-blue">TransConnect</h1>
          <p className="mt-1 text-body-md text-on-surface-variant">Selamat datang! Pilih masuk sebagai:</p>
        </div>
      </div>

      <div className="flex w-full max-w-xs flex-col gap-3">
        <Link
          href="/map"
          className="flex items-center justify-center gap-2 rounded-lg bg-transport-blue px-5 py-3.5 font-label-md text-label-md font-bold text-on-primary shadow-lg transition-colors hover:bg-primary"
        >
          <span className="material-symbols-outlined text-[20px]">directions_walk</span>
          Penumpang
        </Link>
        <Link
          href="/login"
          className="flex items-center justify-center gap-2 rounded-lg border-2 border-transport-blue bg-surface px-5 py-3.5 font-label-md text-label-md font-bold text-transport-blue shadow-sm transition-colors hover:bg-surface-container-low"
        >
          <span className="material-symbols-outlined text-[20px]">badge</span>
          DISHUB
        </Link>
      </div>

      <Link
        href="/"
        className="flex items-center gap-1 font-label-sm text-label-sm text-on-surface-variant transition-colors hover:text-transport-blue"
      >
        <span className="material-symbols-outlined text-[16px]">arrow_back</span>
        Kembali ke halaman utama
      </Link>
    </div>
  );
}
