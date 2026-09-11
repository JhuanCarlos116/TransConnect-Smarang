import Image from "next/image";
import Link from "next/link";

interface Feature {
  icon: string;
  title: string;
  description: string;
}

const FEATURES: Feature[] = [
  {
    icon: "signpost",
    title: "Peta Kondisi Halte",
    description:
      "42 titik halte tersurvei dengan skor kondisi (CCTV, penerangan, trotoar, papan info rute, kanopi) dan jaringan koridor BRT Trans Semarang.",
  },
  {
    icon: "photo_camera",
    title: "Laporan Warga + Deteksi Otomatis",
    description:
      "Warga melaporkan kondisi halte lewat foto -- dianalisis otomatis oleh detektor infrastruktur (YOLOv5) untuk melengkapi data survei tanpa menunggu petugas turun lapangan.",
  },
  {
    icon: "add_location_alt",
    title: "Rekomendasi Halte Baru",
    description:
      "Model Location Allocation mengusulkan lokasi halte baru berdasarkan kepadatan penduduk yang belum terlayani dalam jangkauan jalan kaki.",
  },
  {
    icon: "alt_route",
    title: "Navigasi Halte Teraman",
    description:
      "Menemukan halte tersurvei terdekat lewat jaringan jalan pejalan kaki sungguhan, lengkap dengan navigasi langsung yang mengikuti posisimu berjalan.",
  },
  {
    icon: "task_alt",
    title: "Dashboard Dispatcher DISHUB",
    description:
      "Staf mengelola laporan warga, mendispatch tugas perbaikan ke tim lapangan, dan memantau progres sampai selesai -- satu alur kerja tersambung penuh.",
  },
  {
    icon: "groups",
    title: "Chatbot Rekomendasi",
    description:
      "Tanya jawab bahasa natural yang menjelaskan hasil model rekomendasi halte -- angkanya selalu dari perhitungan nyata, bukan karangan AI.",
  },
];

const STATS: { value: string; label: string }[] = [
  { value: "42", label: "Halte Tersurvei" },
  { value: "9", label: "Kelurahan Tercakup" },
  { value: "1", label: "Kecamatan (Tembalang)" },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-surface-subtle font-sans">
      <header className="flex items-center justify-between px-6 py-5 md:px-12">
        <div className="flex items-center gap-2">
          <Image src="/logo-icon.png" alt="" width={40} height={40} className="h-8 w-8" priority />
          <span className="font-headline-md text-[18px] font-bold text-transport-blue">TransConnect</span>
        </div>
        <Link
          href="/masuk"
          className="rounded-lg bg-transport-blue px-4 py-2 font-label-sm text-label-sm font-bold text-on-primary transition-colors hover:bg-primary"
        >
          Masuk
        </Link>
      </header>

      <main className="flex flex-1 flex-col items-center px-6 py-10 md:px-12">
        {/* Hero */}
        <section className="flex max-w-2xl flex-col items-center gap-5 text-center">
          <span className="rounded-full bg-primary-fixed px-3 py-1 font-label-sm text-[12px] font-bold text-on-primary-fixed">
            MAPID WebGIS Competition #2 2026 &middot; Tim GOPEK, Universitas Diponegoro
          </span>
          <h1 className="font-headline-lg text-[32px] font-bold leading-tight text-on-surface md:text-[40px]">
            Sistem Pendukung Keputusan untuk Halte BRT Trans Semarang
          </h1>
          <p className="text-body-md text-on-surface-variant md:text-[16px]">
            Memetakan kondisi halte, menghubungkan laporan warga langsung ke tim perbaikan, dan
            merekomendasikan lokasi halte baru berbasis data -- untuk Kecamatan Tembalang, Kota
            Semarang.
          </p>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/masuk"
              className="flex items-center justify-center gap-2 rounded-lg bg-transport-blue px-6 py-3 font-label-md text-label-md font-bold text-on-primary shadow-lg transition-colors hover:bg-primary"
            >
              <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
              Mulai
            </Link>
            <Link
              href="/map"
              className="flex items-center justify-center gap-2 rounded-lg border-2 border-transport-blue bg-surface px-6 py-3 font-label-md text-label-md font-bold text-transport-blue transition-colors hover:bg-surface-container-low"
            >
              <span className="material-symbols-outlined text-[20px]">map</span>
              Lihat Peta
            </Link>
          </div>
        </section>

        {/* Stats */}
        <section className="mt-14 flex w-full max-w-2xl flex-wrap justify-center gap-8 border-y border-border-low py-8">
          {STATS.map((stat) => (
            <div key={stat.label} className="flex flex-col items-center">
              <span className="font-headline-lg text-[32px] font-bold text-transport-blue">{stat.value}</span>
              <span className="text-label-sm text-on-surface-variant">{stat.label}</span>
            </div>
          ))}
        </section>

        {/* Features */}
        <section className="mt-14 w-full max-w-5xl">
          <h2 className="mb-8 text-center font-headline-md text-[24px] font-bold text-on-surface">
            Apa yang Bisa Dilakukan
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="flex flex-col gap-3 rounded-xl border border-border-low bg-surface p-5 shadow-sm"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-fixed text-transport-blue">
                  <span className="material-symbols-outlined text-[22px]">{feature.icon}</span>
                </span>
                <h3 className="font-label-md text-label-md font-bold text-on-surface">{feature.title}</h3>
                <p className="text-label-sm text-on-surface-variant">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="flex items-center justify-center px-6 py-6 text-label-sm text-on-surface-variant">
        TransConnect Semarang &middot; Tim GOPEK
      </footer>
    </div>
  );
}
