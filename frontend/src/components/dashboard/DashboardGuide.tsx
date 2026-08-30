const STEPS = [
  {
    icon: "layers",
    title: "Pilih layer",
    body: "Centang layer di kotak Spatial Filters (kiri bawah peta). Mulai dari satu layer dulu — menyalakan semuanya sekaligus membuat peta sulit dibaca.",
  },
  {
    icon: "touch_app",
    title: "Klik objek di peta",
    body: "Titik halte menampilkan foto survei dan skor kondisinya. Area isochrone menampilkan luas jangkauan dan jumlah halte yang melayaninya.",
  },
  {
    icon: "priority_high",
    title: "Telusuri daftar prioritas",
    body: "Klik salah satu halte di panel kanan untuk memindahkan peta ke lokasinya.",
  },
];

/**
 * Replaces the mockup's side navigation. That nav listed Infrastructure AI,
 * Safe Transit, Analytics, Reports and Support -- five links to pages that do
 * not exist -- plus a "Run Spatial Analysis" button with no handler. The two
 * real destinations now live in AppHeader, so this column carries the thing
 * the dashboard actually lacked: an explanation of where to start.
 */
export default function DashboardGuide() {
  return (
    <aside className="z-40 hidden h-full w-panel-width shrink-0 flex-col overflow-y-auto border-r border-border-low bg-surface md:flex">
      <div className="border-b border-border-low p-margin-page">
        <h2 className="text-headline-md text-on-surface">Dashboard DISHUB</h2>
        <p className="mt-1 text-body-md text-on-surface-variant">
          Decision Support System untuk prioritas perbaikan halte dan akses pejalan kaki di Kecamatan Tembalang.
        </p>
      </div>

      <div className="p-margin-page">
        <h3 className="mb-stack-md text-body-lg font-bold text-on-surface">Cara pakai</h3>
        <ol className="flex flex-col gap-stack-md">
          {STEPS.map((step, i) => (
            <li key={step.icon} className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-fixed text-label-sm font-bold text-on-primary-fixed-variant">
                {i + 1}
              </span>
              <div>
                <h4 className="text-label-md font-bold text-on-surface">{step.title}</h4>
                <p className="mt-0.5 text-label-sm leading-relaxed text-on-surface-variant">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <div className="mt-auto border-t border-border-low p-margin-page">
        <p className="text-label-sm leading-relaxed text-on-surface-variant">
          Layer LST, Slope, dan Blank Spot belum tersedia — datanya belum dibangun, jadi sengaja tidak ditampilkan
          sebagai pilihan.
        </p>
      </div>
    </aside>
  );
}
