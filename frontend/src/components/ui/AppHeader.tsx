"use client";

import { useState } from "react";
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
  // The full nav tabs + search + region badge don't fit a phone screen at
  // once (the tabs alone used to get silently clipped by the grid column,
  // e.g. "Dashboard DISHUB" cut down to "Da") -- search collapses to this
  // icon below md, expanding over the rest of the header on tap instead.
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  if (mobileSearchOpen && showSearch) {
    return (
      <header className="z-50 flex h-16 w-full shrink-0 items-center gap-3 border-b border-border-low bg-surface px-gutter md:hidden">
        <button
          onClick={() => setMobileSearchOpen(false)}
          aria-label="Tutup pencarian"
          className="flex h-9 w-9 shrink-0 items-center justify-center text-on-surface-variant"
        >
          <span className="material-symbols-outlined text-[22px]">arrow_back</span>
        </button>
        <div className="w-full">
          <HalteSearch features={searchFeatures!} onSelect={onSearchSelect!} />
        </div>
      </header>
    );
  }

  return (
    // grid-cols-[1fr_auto_1fr] (md+ only): the two 1fr side columns always end
    // up equal width regardless of how much brand/nav content sits in the
    // left one, which keeps the middle (search) column mathematically
    // centered on the header as a whole -- a plain flex row with flex-1 on
    // the search div (the previous approach) centers it only within the
    // *leftover* space after the brand block, which drifts left/right
    // depending on whether the public-page nav tabs are present. Below md the
    // search/badge columns are empty (both hidden), but an empty grid track
    // still reserves its own space -- splitting the remaining width in half
    // regardless -- so brand+tabs got squeezed into just one of those halves
    // and clipped ("Dashboard DISHUB" cut down to "Da"). A plain flex row
    // with justify-between has no such fixed track to overflow into.
    <header className="z-50 flex h-16 w-full shrink-0 items-center justify-between gap-6 border-b border-border-low bg-surface px-gutter md:grid md:grid-cols-[1fr_auto_1fr]">
      <div className="flex min-w-0 items-center gap-6 justify-self-start">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <Image src="/logo-icon.png" alt="" width={128} height={128} className="h-9 w-9" priority />
          <span className="font-headline-md text-headline-md font-bold text-transport-blue">TransConnect</span>
        </Link>

        {/* Tabs are hidden below md instead of shrinking -- there's only ever
            two destinations and PublicMapInfoPanel's own "Buka Dashboard
            DISHUB" button already covers that link on a phone. */}
        {active === "public" && (
          <nav className="hidden h-full items-stretch md:flex">
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

      <div className="flex items-center justify-self-end">
        {showSearch && (
          <button
            onClick={() => setMobileSearchOpen(true)}
            aria-label="Cari halte"
            className="flex h-9 w-9 items-center justify-center text-on-surface-variant md:hidden"
          >
            <span className="material-symbols-outlined text-[22px]">search</span>
          </button>
        )}
        <span className="hidden whitespace-nowrap rounded-full border border-transport-blue px-3 py-1 font-label-sm text-label-sm text-on-surface-variant lg:block">
          Kec. Tembalang, Kota Semarang
        </span>
      </div>
    </header>
  );
}
