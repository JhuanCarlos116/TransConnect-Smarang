interface NavItemProps {
  icon: string;
  label: string;
  href?: string;
  active?: boolean;
}

function NavItem({ icon, label, href, active }: NavItemProps) {
  return (
    <a
      href={href ?? "#"}
      className={
        active
          ? "flex items-center gap-3 rounded-lg bg-primary-fixed px-4 py-3 font-bold text-on-primary-fixed-variant transition-all"
          : "flex items-center gap-3 rounded-lg px-4 py-3 text-on-surface-variant transition-all hover:bg-surface-container-high hover:text-transport-blue"
      }
    >
      <span className="material-symbols-outlined">{icon}</span>
      <span className="text-body-md">{label}</span>
    </a>
  );
}

export default function DashboardSideNav() {
  return (
    <nav className="z-40 hidden h-full w-panel-width shrink-0 flex-col overflow-y-auto border-r border-border-low bg-surface md:flex">
      <div className="flex items-center gap-4 border-b border-border-low p-gutter">
        <div className="flex h-12 w-12 items-center justify-center rounded bg-surface-container">
          <span className="material-symbols-outlined text-[24px] text-transport-blue">shield</span>
        </div>
        <div>
          <h2 className="text-headline-md font-bold leading-tight text-on-surface">DSS Dashboard</h2>
          <p className="text-label-sm text-on-surface-variant">Mobilitas Urban Semarang</p>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2 px-3 py-4">
        <NavItem icon="map" label="Map View (DISHUB)" href="/dashboard" active />
        <NavItem icon="public" label="Peta Publik" href="/" />
        <NavItem icon="analytics" label="Infrastructure AI" />
        <NavItem icon="security" label="Safe Transit" />
        <NavItem icon="bar_chart" label="Analytics" />
        <NavItem icon="description" label="Reports" />
      </div>

      <div className="p-gutter">
        <button className="flex w-full items-center justify-center gap-2 rounded-lg bg-transport-blue py-3 font-bold text-on-primary transition-colors hover:bg-primary active:scale-95">
          <span className="material-symbols-outlined">play_arrow</span>
          Run Spatial Analysis
        </button>
      </div>

      <div className="flex flex-col gap-2 border-t border-border-low p-4">
        <a
          href="#"
          className="flex items-center gap-3 rounded-lg px-4 py-2 text-on-surface-variant transition-all hover:text-transport-blue"
        >
          <span className="material-symbols-outlined">contact_support</span>
          <span className="text-label-md">Support</span>
        </a>
      </div>
    </nav>
  );
}
