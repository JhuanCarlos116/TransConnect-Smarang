interface DashboardSidebarProps {
  onResetView: () => void;
}

/**
 * Left column, styled after the mockup's SideNavBar.
 *
 * An earlier pass wired this to five destinations (Infrastructure AI,
 * Analytics, Reports, plus Support/Sign Out) that opened modals full of
 * invented numbers, or a toast claiming a fake login session. None of that
 * is real, so the only nav item left is this page itself. It used to also
 * link out to the public map, but this is DISHUB's internal tool -- a staff
 * workflow has no reason to be routed from here to the citizen-facing page,
 * so that link is gone (from the header tabs too, see AppHeader).
 * "Run Spatial Analysis" also previously simulated a computation with
 * setTimeout and reported fabricated results ("3 Kandidat Halte... berhasil
 * dihitung"); the button now does a real, if modest, thing: resets the
 * camera and every layer toggle.
 *
 * A numbered "Cara pakai" walkthrough lived here too, but its step 3
 * ("klik salah satu halte di panel kanan") pointed at the Prioritas
 * Perbaikan panel, which is gone. Removed rather than patched -- there is
 * no persistent onboarding copy here right now, put it back once the
 * dashboard's shape has settled enough that a walkthrough won't go stale
 * again in the next pass.
 */
export default function DashboardSidebar({ onResetView }: DashboardSidebarProps) {
  return (
    <nav className="z-40 hidden h-full w-panel-width shrink-0 flex-col overflow-y-auto border-r border-border-low bg-surface md:flex">
      <div className="flex items-center gap-4 border-b border-border-low p-gutter">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded bg-surface-container">
          <span className="material-symbols-outlined text-[24px] text-transport-blue">shield</span>
        </div>
        <div>
          <h2 className="font-headline-md text-headline-md font-bold leading-tight text-on-surface">
            DISHUB Dashboard
          </h2>
          <p className="font-label-sm text-label-sm text-on-surface-variant">Mobilitas Urban Semarang</p>
        </div>
      </div>

      <div className="flex flex-col gap-2 p-gutter">
        <span className="flex items-center gap-3 rounded-lg bg-primary-fixed px-4 py-3 font-label-md text-label-md font-bold text-on-primary-fixed-variant">
          <span className="material-symbols-outlined text-[20px]">map</span>
          Map View (DISHUB)
        </span>
      </div>

      <div className="border-t border-border-low p-gutter">
        <button
          onClick={onResetView}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-transport-blue py-3 font-label-md text-label-md font-bold text-on-primary transition-colors hover:bg-primary active:scale-95"
        >
          <span className="material-symbols-outlined text-[20px]">restart_alt</span>
          Atur Ulang Peta
        </button>
      </div>
    </nav>
  );
}
