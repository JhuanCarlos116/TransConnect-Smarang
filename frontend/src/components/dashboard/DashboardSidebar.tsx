import Link from "next/link";

const STEPS = [
  {
    n: 1,
    title: "Pilih layer",
    body: "Centang di kotak Layer Peta (kiri bawah). Nyalakan satu per satu — semuanya sekaligus membuat peta sulit dibaca.",
  },
  {
    n: 2,
    title: "Klik objek di peta",
    body: "Titik halte membuka detail foto survei, skor kondisi, dan catatan lapangan. Area isochrone menampilkan luas jangkauan.",
  },
  {
    n: 3,
    title: "Telusuri daftar prioritas",
    body: "Klik salah satu halte di panel kanan untuk memindahkan peta ke lokasinya.",
  },
];

interface DashboardSidebarProps {
  onResetView: () => void;
}

/**
 * Left column, styled after the mockup's SideNavBar.
 *
 * An earlier pass wired this to five destinations (Infrastructure AI,
 * Analytics, Reports, plus Support/Sign Out) that opened modals full of
 * invented numbers, or a toast claiming a fake login session. None of that
 * is real, so the nav here carries only the two pages that are: this one and
 * the public map. In their place is what the dashboard actually lacked —
 * numbered steps saying where to start. "Run Spatial Analysis" also
 * previously simulated a computation with setTimeout and reported fabricated
 * results ("3 Kandidat Halte... berhasil dihitung"); the button now does a
 * real, if modest, thing: resets the camera and every layer toggle.
 */
export default function DashboardSidebar({ onResetView }: DashboardSidebarProps) {
  return (
    <nav className="z-40 hidden h-full w-panel-width shrink-0 flex-col overflow-y-auto border-r border-border-low bg-surface md:flex">
      <div className="flex items-center gap-4 border-b border-border-low p-gutter">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded bg-surface-container">
          <span className="material-symbols-outlined text-[24px] text-transport-blue">shield</span>
        </div>
        <div>
          <h2 className="font-headline-md text-headline-md font-bold leading-tight text-on-surface">DSS Dashboard</h2>
          <p className="font-label-sm text-label-sm text-on-surface-variant">Mobilitas Urban Semarang</p>
        </div>
      </div>

      <div className="flex flex-col gap-2 px-3 py-4">
        <span className="flex items-center gap-3 rounded-lg bg-primary-fixed px-4 py-3 font-label-md text-label-md font-bold text-on-primary-fixed-variant">
          <span className="material-symbols-outlined">map</span>
          Map View (DISHUB)
        </span>
        <Link
          href="/"
          className="flex items-center gap-3 rounded-lg px-4 py-3 font-label-md text-label-md text-on-surface-variant transition-all hover:bg-surface-container-high hover:text-transport-blue"
        >
          <span className="material-symbols-outlined">public</span>
          Peta Publik
        </Link>
      </div>

      <div className="border-t border-border-low px-gutter py-4">
        <h3 className="mb-stack-md font-label-md text-label-md font-bold uppercase tracking-wider text-on-surface-variant">
          Cara pakai
        </h3>
        <ol className="flex flex-col gap-stack-md">
          {STEPS.map((step) => (
            <li key={step.n} className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-fixed font-label-sm text-label-sm font-bold text-on-primary-fixed-variant">
                {step.n}
              </span>
              <div>
                <h4 className="font-label-md text-label-md font-bold text-on-surface">{step.title}</h4>
                <p className="mt-0.5 font-label-sm text-label-sm leading-relaxed text-on-surface-variant">
                  {step.body}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <div className="p-gutter">
        <button
          onClick={onResetView}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-transport-blue py-3 font-label-md text-label-md font-bold text-on-primary transition-colors hover:bg-primary active:scale-95"
        >
          <span className="material-symbols-outlined">restart_alt</span>
          Atur Ulang Peta
        </button>
      </div>

      <div className="mt-auto border-t border-border-low p-gutter">
        <p className="font-label-sm text-label-sm leading-relaxed text-on-surface-variant">
          Layer LST, Slope, dan Blank Spot belum tersedia — datanya belum dibangun, jadi sengaja tidak ditampilkan
          sebagai pilihan.
        </p>
      </div>
    </nav>
  );
}
