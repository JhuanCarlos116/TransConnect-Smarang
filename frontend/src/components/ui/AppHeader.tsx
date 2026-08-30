import Link from "next/link";

interface AppHeaderProps {
  active: "public" | "dashboard";
}

const TABS = [
  { key: "public", href: "/", label: "Peta Publik" },
  { key: "dashboard", href: "/dashboard", label: "Dashboard DISHUB" },
] as const;

/**
 * Shared across both views. Deliberately holds nothing but the brand and the
 * two-page navigation: the Stitch mockup this was skinned from also drew a
 * search field, a notification bell, settings, help and a profile avatar, but
 * none of those had anything behind them. Controls that do nothing are worse
 * than no controls -- they read as broken, and they bury the handful of things
 * that genuinely work. Add them back here as they become real.
 */
export default function AppHeader({ active }: AppHeaderProps) {
  return (
    <header className="z-50 flex h-16 w-full shrink-0 items-center gap-8 border-b border-border-low bg-surface px-margin-page">
      <Link href="/" className="flex shrink-0 items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded bg-transport-blue text-on-primary">
          <span className="material-symbols-outlined text-[18px]">shield</span>
        </div>
        <span className="font-sans text-headline-md font-bold text-transport-blue">TransConnect</span>
      </Link>

      <nav className="flex h-full items-stretch gap-1">
        {TABS.map((tab) => (
          <Link
            key={tab.key}
            href={tab.href}
            aria-current={active === tab.key ? "page" : undefined}
            className={
              active === tab.key
                ? "flex items-center border-b-2 border-transport-blue px-3 text-body-md font-bold text-transport-blue"
                : "flex items-center border-b-2 border-transparent px-3 text-body-md text-on-surface-variant transition-colors hover:text-transport-blue"
            }
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      <span className="ml-auto hidden text-label-sm text-on-surface-variant lg:block">
        Kecamatan Tembalang, Kota Semarang
      </span>
    </header>
  );
}
