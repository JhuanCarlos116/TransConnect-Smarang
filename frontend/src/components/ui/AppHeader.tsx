"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { conditionColor, conditionLabelText } from "@/lib/conditionScore";
import type { HalteFeature } from "@/types/halte";

interface AppHeaderProps {
  active?: "public" | "dashboard";
  searchFeatures?: HalteFeature[];
  onSearchSelect?: (feature: HalteFeature) => void;
  onOpenHelp?: () => void;
  onOpenSettings?: () => void;
  onOpenNotifications?: () => void;
}

export default function AppHeader({
  searchFeatures = [],
  onSearchSelect,
  onOpenHelp,
  onOpenSettings,
  onOpenNotifications,
}: AppHeaderProps) {
  const [query, setQuery] = useState("");
  const [openSearch, setOpenSearch] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement | null>(null);

  const filtered = query.trim()
    ? searchFeatures
        .filter((f) => {
          const q = query.toLowerCase();
          const p = f.properties;
          return (
            p.nama_halte.toLowerCase().includes(q) ||
            p.kelurahan.toLowerCase().includes(q) ||
            p.kecamatan.toLowerCase().includes(q) ||
            (p.catatan_lapangan && p.catatan_lapangan.toLowerCase().includes(q))
          );
        })
        .slice(0, 7)
    : [];

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target as Node)
      ) {
        setOpenSearch(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="bg-surface dark:bg-surface-dim top-0 border-b border-border-low dark:border-outline-variant flex justify-between items-center w-full px-gutter h-16 z-50 shrink-0">
      {/* Brand */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="h-8 w-8 rounded bg-transport-blue flex items-center justify-center text-white shadow-sm">
            <span className="material-symbols-outlined text-[20px]">shield</span>
          </div>
          <span className="font-headline-md text-headline-md font-bold text-transport-blue tracking-tight">
            TransConnect
          </span>
        </Link>
      </div>

      {/* Centered Search Bar */}
      <div className="flex-1 max-w-md mx-8 hidden md:block relative" ref={searchContainerRef}>
        <div className="relative w-full">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]">
            search
          </span>
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpenSearch(true);
            }}
            onFocus={() => setOpenSearch(true)}
            placeholder="Search locations, assets, or tasks..."
            className="w-full bg-surface-container-low border border-border-low rounded pl-10 pr-4 py-2 text-on-surface focus:outline-none focus:border-transport-blue focus:ring-1 focus:ring-transport-blue transition-colors font-body-md text-[14px]"
          />
          {query && (
            <button
              onClick={() => {
                setQuery("");
                setOpenSearch(false);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface text-xs cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          )}
        </div>

        {/* Search Results Dropdown */}
        {openSearch && query.trim().length > 0 && (
          <div className="absolute left-0 right-0 top-full mt-1.5 bg-surface border border-border-low rounded-lg shadow-xl max-h-80 overflow-y-auto z-50 p-1">
            {filtered.length > 0 ? (
              filtered.map((feature) => (
                <button
                  key={feature.properties.halte_id}
                  onClick={() => {
                    onSearchSelect?.(feature);
                    setOpenSearch(false);
                  }}
                  className="w-full text-left p-2.5 rounded hover:bg-surface-container flex items-center justify-between gap-2 transition-colors group cursor-pointer"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-label-md text-label-md font-bold text-on-surface group-hover:text-transport-blue truncate">
                      {feature.properties.nama_halte}
                    </div>
                    <div className="font-label-sm text-[11px] text-on-surface-variant">
                      Kel. {feature.properties.kelurahan}, {feature.properties.kecamatan}
                    </div>
                  </div>
                  <span
                    className="shrink-0 text-white font-label-sm text-[10px] font-bold px-2 py-0.5 rounded shadow-xs"
                    style={{ backgroundColor: conditionColor(feature.properties.condition_label) }}
                  >
                    {conditionLabelText(feature.properties.condition_label)} ({feature.properties.condition_score})
                  </span>
                </button>
              ))
            ) : (
              <div className="p-3 text-center font-label-sm text-label-sm text-on-surface-variant">
                Tidak ada titik halte yang cocok dengan &quot;{query}&quot;
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Notifications Button */}
        <div className="relative">
          <button
            onClick={() => {
              setShowNotifications(!showNotifications);
              onOpenNotifications?.();
            }}
            title="Notifikasi & Peringatan Lapangan"
            className="text-on-surface-variant dark:text-outline hover:bg-surface-container dark:hover:bg-surface-container-high transition-colors p-2 rounded-full cursor-pointer relative"
          >
            <span className="material-symbols-outlined text-[22px]">notifications</span>
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-alert-red ring-2 ring-surface"></span>
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 rounded-lg border border-border-low bg-surface p-3 shadow-xl z-50">
              <div className="flex items-center justify-between border-b border-border-low pb-2 mb-2">
                <span className="font-label-md text-label-md font-bold text-on-surface">Peringatan Lapangan</span>
                <span className="font-label-sm text-[10px] rounded bg-error-container text-on-error-container px-1.5 py-0.5 font-bold">
                  3 Baru
                </span>
              </div>
              <div className="flex flex-col gap-2">
                <div className="rounded border border-alert-red/30 bg-surface-container-low p-2">
                  <div className="flex items-center gap-1.5 font-label-sm text-[11px] font-bold text-alert-red">
                    <span className="material-symbols-outlined text-[14px]">warning</span>
                    Critical Obstruction
                  </div>
                  <p className="mt-0.5 text-[11px] text-on-surface">Trotoar rusak parah di Halte Dadapan Semarang 1 (Meteseh)</p>
                </div>
                <div className="rounded border border-border-low bg-surface-container-low p-2">
                  <div className="flex items-center gap-1.5 font-label-sm text-[11px] font-bold text-caution-yellow">
                    <span className="material-symbols-outlined text-[14px]">lightbulb</span>
                    Penerangan Minim
                  </div>
                  <p className="mt-0.5 text-[11px] text-on-surface">Halte SLB Negeri Semarang I belum memiliki lampu jalan</p>
                </div>
                <div className="rounded border border-border-low bg-surface-container-low p-2">
                  <div className="flex items-center gap-1.5 font-label-sm text-[11px] font-bold text-transport-blue">
                    <span className="material-symbols-outlined text-[14px]">add_location</span>
                    Kandidat Halte Baru
                  </div>
                  <p className="mt-0.5 text-[11px] text-on-surface">Blank spot terdeteksi di koridor Sendangmulyo (+3,100 jiwa)</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Settings Button */}
        <button
          onClick={onOpenSettings}
          title="Pengaturan Tampilan & GIS"
          className="text-on-surface-variant dark:text-outline hover:bg-surface-container dark:hover:bg-surface-container-high transition-colors p-2 rounded-full cursor-pointer"
        >
          <span className="material-symbols-outlined text-[22px]">settings</span>
        </button>

        {/* Help Button */}
        <button
          onClick={onOpenHelp}
          title="Panduan DSS & Metodologi"
          className="text-on-surface-variant dark:text-outline hover:bg-surface-container dark:hover:bg-surface-container-high transition-colors p-2 rounded-full cursor-pointer"
        >
          <span className="material-symbols-outlined text-[22px]">help</span>
        </button>

        {/* Profile Avatar */}
        <div className="relative">
          <button
            onClick={() => setShowProfile(!showProfile)}
            className="h-9 w-9 rounded-full bg-surface-variant overflow-hidden ml-1 cursor-pointer border border-border-low ring-2 ring-transparent hover:ring-transport-blue transition-all flex items-center justify-center"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className="h-full w-full object-cover"
              alt="Profil Petugas Dishub"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuAvZ7ZWe0xg0pmRCUuTkRNEZx1OwsTU-zN49MvnVPfZwCeLLAdOzWdJgf5W_XFg8ZE26EyTpvZ6aKmCw3fnYAeB0Fk4Y3Ie_eZxLTR66MO_1GjAZpeOtBDTotHlorFu0n2bvAlZIRLI4szutZ_WXD-9cX_XZjLrnl2zVmmhmIt1xhsYM-OOjqH0EleE8HzGQu23AXcaO_99YqIqNzUO0XMuxzlatGnB8OZU5rqjLC9R3OvzXBtZxOrR"
              onError={(e) => {
                (e.target as HTMLElement).style.display = "none";
              }}
            />
            <span className="material-symbols-outlined text-transport-blue text-[20px]">account_circle</span>
          </button>

          {showProfile && (
            <div className="absolute right-0 mt-2 w-64 rounded-lg border border-border-low bg-surface p-3 shadow-xl z-50">
              <div className="flex items-center gap-3 pb-3 border-b border-border-low">
                <div className="h-10 w-10 rounded-full bg-primary-fixed flex items-center justify-center text-on-primary-fixed font-bold">
                  DH
                </div>
                <div>
                  <div className="font-label-md text-label-md font-bold text-on-surface">Staf Perencanaan</div>
                  <div className="font-label-sm text-[11px] text-on-surface-variant">DISHUB Kota Semarang</div>
                </div>
              </div>
              <div className="py-2 flex flex-col gap-1 text-label-sm text-[12px]">
                <div className="flex justify-between py-1 text-on-surface-variant">
                  <span>Wilayah Studi:</span>
                  <span className="font-bold text-on-surface">Kec. Tembalang</span>
                </div>
                <div className="flex justify-between py-1 text-on-surface-variant">
                  <span>Status Sesi:</span>
                  <span className="text-safety-green font-bold flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-safety-green inline-block"></span>
                    Aktif (Admin)
                  </span>
                </div>
              </div>
              <div className="pt-2 border-t border-border-low">
                <Link
                  href="/"
                  className="flex items-center gap-2 p-1.5 rounded hover:bg-surface-container text-transport-blue font-bold text-label-sm text-[12px]"
                >
                  <span className="material-symbols-outlined text-[16px]">public</span>
                  Beralih ke Peta Publik
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
