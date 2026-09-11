"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

import HalteSearch from "@/components/ui/HalteSearch";
import type { HalteFeature } from "@/types/halte";

interface AppHeaderProps {
  searchFeatures?: HalteFeature[];
  onSearchSelect?: (feature: HalteFeature) => void;
  /**
   * Where the brand/logo links to. Defaults to /map (the public map) --
   * that's the right "home" for both the public map itself and the tasks
   * board, since neither should route out to the landing page at "/" or the
   * Penumpang/DISHUB chooser at "/masuk". The dashboard passes "/dashboard"
   * instead so its logo stays inside the staff app rather than leaving it
   * for the public map.
   */
  homeHref?: string;
}

/**
 * Shared across both views: brand and a working search (dashboard only --
 * see below).
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
 * The public/dashboard nav tabs that used to live here are gone too: the
 * public map was pared down to just condition viewing + the two action
 * widgets (Safe Transit Navigator, citizen reports), with no route back out
 * to DISHUB's internal dashboard from a citizen-facing page, and the
 * dashboard itself never showed the tabs in the first place (a staff
 * workflow has no reason to route out to the public map either). `active`
 * accordingly no longer exists as a prop -- nothing here depends on which
 * page rendered it anymore.
 */
export default function AppHeader({ searchFeatures, onSearchSelect, homeHref = "/map" }: AppHeaderProps) {
  const showSearch = Boolean(searchFeatures && onSearchSelect);
  // The full search + region badge don't fit a phone screen at once --
  // search collapses to this icon below md, expanding over the rest of the
  // header on tap instead.
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

  // No search on this page (the public map, and the tasks board) -- nothing
  // competes for header space, so the brand can sit small and centered
  // instead of pinned left the way it has to when a search bar shares the row.
  if (!showSearch) {
    return (
      <header className="z-50 flex h-12 w-full shrink-0 items-center justify-center border-b border-border-low bg-surface px-gutter">
        <Link href={homeHref} className="flex shrink-0 items-center gap-1.5">
          <Image src="/logo-icon.png" alt="" width={128} height={128} className="h-6 w-6" priority />
          <span className="font-headline-md text-[15px] font-bold text-transport-blue">TransConnect</span>
        </Link>
      </header>
    );
  }

  return (
    <header className="z-50 flex h-16 w-full shrink-0 items-center justify-between gap-6 border-b border-border-low bg-surface px-gutter">
      <Link href={homeHref} className="flex shrink-0 items-center gap-2">
        <Image src="/logo-icon.png" alt="" width={128} height={128} className="h-9 w-9" priority />
        <span className="font-headline-md text-headline-md font-bold text-transport-blue">TransConnect</span>
      </Link>

      <div className="hidden w-full max-w-md md:block">
        <HalteSearch features={searchFeatures!} onSelect={onSearchSelect!} />
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() => setMobileSearchOpen(true)}
          aria-label="Cari halte"
          className="flex h-9 w-9 items-center justify-center text-on-surface-variant md:hidden"
        >
          <span className="material-symbols-outlined text-[22px]">search</span>
        </button>
        <span className="hidden whitespace-nowrap rounded-full border border-transport-blue px-3 py-1 font-label-sm text-label-sm text-on-surface-variant lg:block">
          Kec. Tembalang, Kota Semarang
        </span>
      </div>
    </header>
  );
}
