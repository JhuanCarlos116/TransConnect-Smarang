import Image from "next/image";
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
 * Shared across both views: brand, the two-page nav, and a working search.
 *
 * An earlier pass added a notifications bell and a profile menu here. Both
 * were removed: the notifications dropdown mixed real halte names into
 * invented alerts ("+3,100 jiwa" blank-spot copy lifted straight from the
 * mockup's fabricated numbers) under a static "3 Baru" badge nothing ever
 * updates, and the profile menu showed a stock photo and a fake "Sesi Aktif
 * (Admin)" status with no auth system behind it. Neither was real, and both
 * looked like they were. Add them back only once there is something genuine
 * — a real alert feed, a real login — behind the icon.
 *
 * On the dashboard, the tab switcher is gone rather than offering "Peta
 * Publik" as a destination: this is DISHUB's internal tool, not a page a
 * staff workflow should be routing back out of the public map from. It used
 * to collapse to a plain "Dashboard DISHUB" label instead of disappearing
 * entirely, but that label was redundant with DashboardSidebar's own
 * "DISHUB Dashboard" heading right underneath it. The public page keeps
 * both tabs -- that direction (public -> staff dashboard) isn't the one in
 * question here.
 */
export default function AppHeader({ active, searchFeatures, onSearchSelect }: AppHeaderProps) {
  const showSearch = Boolean(searchFeatures && onSearchSelect);

  return (
    // grid-cols-[1fr_auto_1fr]: the two 1fr side columns always end up equal
    // width regardless of how much brand/nav content sits in the left one,
    // which keeps the middle (search) column mathematically centered on the
    // header as a whole -- a plain flex row with flex-1 on the search div
    // (the previous approach) centers it only within the *leftover* space
    // after the brand block, which drifts left/right depending on whether
    // the public-page nav tabs are present.
    <header className="z-50 grid h-16 w-full shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-6 border-b border-border-low bg-surface px-gutter">
      <div className="flex min-w-0 items-center gap-6 justify-self-start">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <Image src="/logo-icon.png" alt="" width={128} height={128} className="h-9 w-9" priority />
          <span className="font-headline-md text-headline-md font-bold text-transport-blue">TransConnect</span>
        </Link>

        {active === "public" && (
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
        )}
      </div>

      {showSearch && (
        <div className="hidden w-full max-w-md md:block">
          <HalteSearch features={searchFeatures!} onSelect={onSearchSelect!} />
        </div>
      )}

      <span className="hidden justify-self-end whitespace-nowrap rounded-full border border-transport-blue px-3 py-1 font-label-sm text-label-sm text-on-surface-variant lg:block">
        Kec. Tembalang, Kota Semarang
      </span>
    </header>
  );
}
