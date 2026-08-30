import Link from "next/link";

export default function PublicHeader() {
  return (
    <header className="z-50 flex h-16 w-full shrink-0 items-center justify-between border-b border-border-low bg-surface px-gutter">
      <div className="flex h-full items-center gap-8">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded bg-transport-blue text-on-primary">
            <span className="material-symbols-outlined text-[18px]">shield</span>
          </div>
          <span className="font-sans text-headline-md font-bold text-transport-blue">TransConnect</span>
        </div>

        <nav className="hidden h-full items-end gap-6 md:flex">
          <Link
            href="/"
            className="flex h-full items-end border-b-2 border-transport-blue pb-4 font-bold text-transport-blue"
          >
            Peta Publik
          </Link>
          <Link
            href="/dashboard"
            className="flex h-full items-end px-2 pb-4 text-on-surface-variant transition-colors hover:bg-surface-container hover:text-transport-blue"
          >
            Dashboard DISHUB
          </Link>
        </nav>
      </div>

      <div className="mx-8 hidden max-w-md flex-1 md:block">
        <div className="relative w-full">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline">
            search
          </span>
          <input
            className="w-full rounded border border-border-low bg-surface-container-low py-2 pl-10 pr-4 text-body-md text-on-surface transition-colors focus:border-transport-blue focus:outline-none focus:ring-1 focus:ring-transport-blue"
            placeholder="Cari lokasi atau nama halte..."
            type="text"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button className="cursor-pointer rounded-full p-2 text-on-surface-variant transition-colors hover:bg-surface-container active:opacity-80">
          <span className="material-symbols-outlined">notifications</span>
        </button>
        <button className="cursor-pointer rounded-full p-2 text-on-surface-variant transition-colors hover:bg-surface-container active:opacity-80">
          <span className="material-symbols-outlined">settings</span>
        </button>
        <button className="cursor-pointer rounded-full p-2 text-on-surface-variant transition-colors hover:bg-surface-container active:opacity-80">
          <span className="material-symbols-outlined">help</span>
        </button>
        <div className="ml-2 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-border-low bg-surface-variant text-on-surface-variant">
          <span className="material-symbols-outlined text-[18px]">person</span>
        </div>
      </div>
    </header>
  );
}
