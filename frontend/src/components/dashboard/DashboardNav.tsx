"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Map View (DISHUB)", icon: "map" },
  { href: "/dashboard/tasks", label: "Tugas Perbaikan", icon: "checklist" },
] as const;

/**
 * Brand header + the two DISHUB dashboard destinations, shared by
 * DashboardSidebar (map view) and the tasks page's own sidebar shell -- kept
 * separate from DashboardSidebar itself because that component's other
 * props (layer toggles, legends) are meaningless on a page with no map.
 */
export default function DashboardNav() {
  const pathname = usePathname();

  return (
    <>
      <div className="flex items-center gap-4 border-b border-border-low p-gutter">
        <Image
          src="/dishub-logo.png"
          alt="Logo Kementerian Perhubungan"
          width={137}
          height={160}
          className="h-12 w-auto shrink-0"
        />
        <h2 className="font-headline-lg text-headline-lg font-bold leading-tight text-transport-blue">
          DISHUB Dashboard
        </h2>
      </div>

      <div className="flex flex-col gap-2 p-gutter">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={
              pathname === item.href
                ? "flex items-center gap-3 rounded-lg bg-primary-fixed px-4 py-3 font-label-md text-label-md font-bold text-on-primary-fixed-variant"
                : "flex items-center gap-3 rounded-lg px-4 py-3 font-label-md text-label-md font-bold text-on-surface-variant transition-colors hover:bg-surface-container"
            }
          >
            <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </div>
    </>
  );
}
