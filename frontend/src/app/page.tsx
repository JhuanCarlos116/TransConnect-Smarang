import Image from "next/image";
import Link from "next/link";

/**
 * Landing chooser -- MapView used to render directly at "/" (now at /map).
 * This exists so the same site can serve two audiences with nothing in
 * common (a citizen browsing the map, DISHUB staff running the internal
 * dashboard) without either one bleeding into the other's entry point.
 */
export default function Home() {
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
    </div>
  );
}
