import Link from "next/link";

import HalteSearch from "@/components/ui/HalteSearch";
import type { HalteFeature } from "@/types/halte";

interface AppHeaderProps {
  active: "public" | "dashboard";
  searchFeatures?: HalteFeature[];
  onSearchSelect?: (feature: HalteFeature) => void;
}

const TABS = [
  { key: "public", href: "/", label: "Peta Publik" },
  { key: "dashboard", href: "/dashboard", label: "Dashboard DISHUB" },
] as const;

/**
 * Three-zone header from the mockup: brand, centred search, trailing detail.
 *
 * The mockup's trailing zone was a notification bell, a settings gear, a help
 * button and an account avatar. None of them can be real here — there is no
 * account system, no notifications and no settings to change — so the zone
 * carries the study area instead. The search, which was also inert in the
 * mockup, is wired to the real halte data.
 */
export default function AppHeader({ active, searchFeatures, onSearchSelect }: AppHeaderProps) {
  const showSearch = Boolean(searchFeatures && onSearchSelect);

  return (
    <header className="z-50 flex h-16 w-full shrink-0 items-center gap-6 border-b border-border-low bg-surface px-gutter">
      <Link href="/" className="flex shrink-0 items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded bg-transport-blue text-on-primary">
          <span className="material-symbols-outlined text-[18px]">shield</span>
        </div>
        <span className="font-headline-md text-headline-md font-bold text-transport-blue">TransConnect</span>
      </Link>

      <nav className="flex h-full items-stretch">
        {TABS.map((tab) => (
          <Link
            key={tab.key}
            href={tab.href}
            aria-current={active === tab.key ? "page" : undefined}
            className={
              active === tab.key
                ? "flex items-center whitespace-nowrap border-b-2 border-transport-blue px-3 font-label-md text-label-md font-bold text-transport-blue"
                : "flex items-center whitespace-nowrap border-b-2 border-transparent px-3 font-label-md text-label-md text-on-surface-variant transition-colors hover:text-transport-blue"
            }
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      {showSearch && (
        <div className="mx-4 hidden max-w-md flex-1 md:block">
          <HalteSearch features={searchFeatures!} onSelect={onSearchSelect!} />
        </div>
      )}

      <span
        className={`hidden shrink-0 font-label-sm text-label-sm text-on-surface-variant lg:block ${showSearch ? "" : "ml-auto"}`}
      >
        Kec. Tembalang, Kota Semarang
      </span>
    </header>
  );
}
