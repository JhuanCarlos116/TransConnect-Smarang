"use client";

interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// 1. Infrastructure AI Modal
export function InfrastructureAiModal({ isOpen, onClose }: BaseModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl border border-border-low bg-surface p-6 shadow-2xl animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between border-b border-border-low pb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-transport-blue/10 flex items-center justify-center text-transport-blue">
              <span className="material-symbols-outlined text-[24px]">analytics</span>
            </div>
            <div>
              <h3 className="font-headline-md text-[18px] font-bold text-on-surface">
                Infrastructure AI & Computer Vision
              </h3>
              <p className="font-label-sm text-[12px] text-on-surface-variant">
                Pipeline Deteksi & Segmentasi YOLOv8-seg (Automated QC + CLAHE)
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-container text-on-surface-variant">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="mt-4 flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-surface-container-low rounded-lg border border-border-low text-center">
              <div className="font-label-sm text-[11px] text-on-surface-variant">mAP50-95 (Seg)</div>
              <div className="font-headline-md text-[22px] font-bold text-transport-blue mt-1">87.4%</div>
              <div className="font-label-sm text-[10px] text-safety-green mt-0.5">High Accuracy</div>
            </div>
            <div className="p-3 bg-surface-container-low rounded-lg border border-border-low text-center">
              <div className="font-label-sm text-[11px] text-on-surface-variant">Precision / Recall</div>
              <div className="font-headline-md text-[22px] font-bold text-on-surface mt-1">91.2% / 84%</div>
              <div className="font-label-sm text-[10px] text-on-surface-variant mt-0.5">F1-Score: 0.87</div>
            </div>
            <div className="p-3 bg-surface-container-low rounded-lg border border-border-low text-center">
              <div className="font-label-sm text-[11px] text-on-surface-variant">Inference Speed</div>
              <div className="font-headline-md text-[22px] font-bold text-on-surface mt-1">18.5 ms</div>
              <div className="font-label-sm text-[10px] text-safety-green mt-0.5">Real-time Ready</div>
            </div>
          </div>

          <div className="rounded-lg border border-border-low bg-surface p-4">
            <h4 className="font-label-md text-[13px] font-bold text-on-surface mb-2">
              Objek Deteksi Prioritas MVP (Kecamatan Tembalang)
            </h4>
            <div className="flex flex-col gap-2 font-body-md text-[13px]">
              <div className="flex justify-between items-center p-2 rounded bg-surface-container-low">
                <span className="font-medium text-on-surface">1. Trotoar & Aksesibilitas Pejalan Kaki</span>
                <span className="font-label-sm text-[11px] font-bold px-2 py-0.5 rounded bg-safety-green/20 text-safety-green">
                  84% Valid (1,204 Terdeteksi)
                </span>
              </div>
              <div className="flex justify-between items-center p-2 rounded bg-surface-container-low">
                <span className="font-medium text-on-surface">2. Penerangan Lampu Jalan (Streetlights)</span>
                <span className="font-label-sm text-[11px] font-bold px-2 py-0.5 rounded bg-caution-yellow/20 text-caution-yellow">
                  22% Butuh QC (4,392 Terdeteksi)
                </span>
              </div>
              <div className="flex justify-between items-center p-2 rounded bg-surface-container-low">
                <span className="font-medium text-on-surface">3. Kanopi Peneduh & Halte Shelter</span>
                <span className="font-label-sm text-[11px] font-bold px-2 py-0.5 rounded bg-transport-blue/20 text-transport-blue">
                  76% Terpasang
                </span>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-surface-container text-label-sm text-[12px] text-on-surface-variant leading-relaxed">
            <strong>Alur AI:</strong> Foto diunggah via MAPID Apps → Uji Laplacian Variance (reject foto blur) → Koreksi kontras CLAHE → Inferensi YOLOv8-seg → Perhitungan skor prioritas AHP.
          </div>
        </div>

        <div className="mt-5 pt-3 border-t border-border-low flex justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-lg bg-transport-blue text-white font-label-md text-[13px] font-bold">
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}

// 2. Analytics Modal
export function AnalyticsModal({ isOpen, onClose }: BaseModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl border border-border-low bg-surface p-6 shadow-2xl animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between border-b border-border-low pb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-transport-blue/10 flex items-center justify-center text-transport-blue">
              <span className="material-symbols-outlined text-[24px]">bar_chart</span>
            </div>
            <div>
              <h3 className="font-headline-md text-[18px] font-bold text-on-surface">
                Spasial & Multi-Criteria Analytics
              </h3>
              <p className="font-label-sm text-[12px] text-on-surface-variant">
                Matriks Pembobotan AHP & Estimasi Cakupan Demografi Tembalang
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-container text-on-surface-variant">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="mt-4 flex flex-col gap-4">
          <div className="rounded-lg border border-border-low bg-surface p-4">
            <h4 className="font-label-md text-[13px] font-bold text-on-surface mb-2">
              Bobot Analytic Hierarchy Process (AHP)
            </h4>
            <div className="grid grid-cols-2 gap-3 font-label-sm text-[12px]">
              <div className="p-2.5 rounded bg-surface-container-low">
                <div className="flex justify-between font-bold text-on-surface">
                  <span>Kepadatan Penduduk (Demografi)</span>
                  <span className="text-transport-blue">35%</span>
                </div>
                <div className="w-full bg-border-low h-1.5 rounded-full mt-1.5 overflow-hidden">
                  <div className="bg-transport-blue h-full w-[35%]"></div>
                </div>
              </div>
              <div className="p-2.5 rounded bg-surface-container-low">
                <div className="flex justify-between font-bold text-on-surface">
                  <span>Aksesibilitas & Kondisi Trotoar</span>
                  <span className="text-transport-blue">25%</span>
                </div>
                <div className="w-full bg-border-low h-1.5 rounded-full mt-1.5 overflow-hidden">
                  <div className="bg-transport-blue h-full w-[25%]"></div>
                </div>
              </div>
              <div className="p-2.5 rounded bg-surface-container-low">
                <div className="flex justify-between font-bold text-on-surface">
                  <span>Blank Spot Transit (&gt;500m)</span>
                  <span className="text-transport-blue">25%</span>
                </div>
                <div className="w-full bg-border-low h-1.5 rounded-full mt-1.5 overflow-hidden">
                  <div className="bg-transport-blue h-full w-[25%]"></div>
                </div>
              </div>
              <div className="p-2.5 rounded bg-surface-container-low">
                <div className="flex justify-between font-bold text-on-surface">
                  <span>Kenyamanan Termal (LST MODIS)</span>
                  <span className="text-transport-blue">15%</span>
                </div>
                <div className="w-full bg-border-low h-1.5 rounded-full mt-1.5 overflow-hidden">
                  <div className="bg-transport-blue h-full w-[15%]"></div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-border-low bg-surface p-4">
            <h4 className="font-label-md text-[13px] font-bold text-on-surface mb-2">
              Ringkasan Jangkauan Jalan Kaki (Isochrone)
            </h4>
            <div className="grid grid-cols-3 gap-2 text-center text-label-sm text-[12px]">
              <div className="p-2.5 rounded bg-surface-container-low border border-border-low">
                <div className="font-bold text-transport-blue">3 Menit (&le;250m)</div>
                <div className="text-on-surface-variant mt-0.5">Luas: 2.14 km²</div>
                <div className="text-[11px] text-safety-green font-bold mt-0.5">Akses Sangat Cepat</div>
              </div>
              <div className="p-2.5 rounded bg-surface-container-low border border-border-low">
                <div className="font-bold text-transport-blue">5 Menit (&le;400m)</div>
                <div className="text-on-surface-variant mt-0.5">Luas: 4.82 km²</div>
                <div className="text-[11px] text-safety-green font-bold mt-0.5">Standar Pelayanan Minimal</div>
              </div>
              <div className="p-2.5 rounded bg-surface-container-low border border-border-low">
                <div className="font-bold text-transport-blue">10 Menit (&le;800m)</div>
                <div className="text-on-surface-variant mt-0.5">Luas: 6.96 km²</div>
                <div className="text-[11px] text-caution-yellow font-bold mt-0.5">Cakupan Maksimal Koridor</div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 pt-3 border-t border-border-low flex justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-lg bg-transport-blue text-white font-label-md text-[13px] font-bold">
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}

// 3. Reports Modal
export function ReportsModal({ isOpen, onClose }: BaseModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl border border-border-low bg-surface p-6 shadow-2xl animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between border-b border-border-low pb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-transport-blue/10 flex items-center justify-center text-transport-blue">
              <span className="material-symbols-outlined text-[24px]">description</span>
            </div>
            <div>
              <h3 className="font-headline-md text-[18px] font-bold text-on-surface">
                Executive Policy & Dispatch Reports
              </h3>
              <p className="font-label-sm text-[12px] text-on-surface-variant">
                Laporan Rekomendasi Halte & Prioritas Revitalisasi Pedestrian
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-container text-on-surface-variant">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="mt-4 flex flex-col gap-3">
          <div className="p-4 rounded-lg border border-border-low bg-surface flex items-center justify-between">
            <div>
              <h4 className="font-label-md text-[14px] font-bold text-on-surface">
                Daftar Prioritas Halte Baru DISHUB 2026
              </h4>
              <p className="font-label-sm text-[12px] text-on-surface-variant mt-0.5">
                Kandidat titik halte berdasarkan Location Allocation Model di Sendangmulyo & Meteseh
              </p>
            </div>
            <button
              onClick={() => alert("Mengunduh Laporan Rekomendasi Halte (PDF)...")}
              className="px-3 py-1.5 bg-transport-blue text-white rounded font-label-sm text-[12px] font-bold flex items-center gap-1 cursor-pointer shrink-0"
            >
              <span className="material-symbols-outlined text-[16px]">download</span> Unduh PDF
            </button>
          </div>

          <div className="p-4 rounded-lg border border-border-low bg-surface flex items-center justify-between">
            <div>
              <h4 className="font-label-md text-[14px] font-bold text-on-surface">
                Rencana Revitalisasi Fasilitas Trotoar PUPR
              </h4>
              <p className="font-label-sm text-[12px] text-on-surface-variant mt-0.5">
                Heatmap segmen trotoar rusak dan usulan perbaikan aksesibilitas difabel
              </p>
            </div>
            <button
              onClick={() => alert("Mengunduh Laporan Revitalisasi Trotoar (PDF)...")}
              className="px-3 py-1.5 bg-transport-blue text-white rounded font-label-sm text-[12px] font-bold flex items-center gap-1 cursor-pointer shrink-0"
            >
              <span className="material-symbols-outlined text-[16px]">download</span> Unduh PDF
            </button>
          </div>

          <div className="p-4 rounded-lg border border-border-low bg-surface flex items-center justify-between">
            <div>
              <h4 className="font-label-md text-[14px] font-bold text-on-surface">
                Laporan Hasil Survei Lapangan 42 Halte (#timGOPEK)
              </h4>
              <p className="font-label-sm text-[12px] text-on-surface-variant mt-0.5">
                Data ground truth, foto dokumentasi, skor kelayakan, dan catatan lapangan
              </p>
            </div>
            <button
              onClick={() => alert("Mengunduh Data Survei Lapangan (GeoJSON/CSV)...")}
              className="px-3 py-1.5 bg-transport-blue text-white rounded font-label-sm text-[12px] font-bold flex items-center gap-1 cursor-pointer shrink-0"
            >
              <span className="material-symbols-outlined text-[16px]">download</span> Export CSV
            </button>
          </div>
        </div>

        <div className="mt-5 pt-3 border-t border-border-low flex justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-[13px] font-bold">
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}

// 4. Help / Methodology Modal
export function HelpModal({ isOpen, onClose }: BaseModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl border border-border-low bg-surface p-6 shadow-2xl animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between border-b border-border-low pb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-transport-blue/10 flex items-center justify-center text-transport-blue">
              <span className="material-symbols-outlined text-[24px]">help</span>
            </div>
            <div>
              <h3 className="font-headline-md text-[18px] font-bold text-on-surface">
                Panduan Penggunaan DSS Dashboard
              </h3>
              <p className="font-label-sm text-[12px] text-on-surface-variant">
                TransConnect Semarang — MAPID WebGIS Competition 2026
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-container text-on-surface-variant">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="mt-4 flex flex-col gap-3 font-body-md text-[13px] text-on-surface leading-relaxed">
          <div className="p-3 bg-surface-container-low rounded-lg border border-border-low">
            <h4 className="font-label-md text-[13px] font-bold text-transport-blue mb-1">
              1. Navigasi Peta & Pencarian
            </h4>
            <p className="text-on-surface-variant">
              Ketik nama halte atau kelurahan pada bilah pencarian di bagian atas untuk langsung menuju lokasi dan membuka pop-up evaluasi kondisi halte.
            </p>
          </div>

          <div className="p-3 bg-surface-container-low rounded-lg border border-border-low">
            <h4 className="font-label-md text-[13px] font-bold text-transport-blue mb-1">
              2. Spatial Filters (Filter Spasial)
            </h4>
            <p className="text-on-surface-variant">
              Gunakan panel kiri bawah untuk mengaktifkan layer: Kepadatan Penduduk (BPS), Transit Blank Spots / Isochrone jangkauan jalan kaki, Suhu Permukaan (LST), dan Titik Survei Lapangan.
            </p>
          </div>

          <div className="p-3 bg-surface-container-low rounded-lg border border-border-low">
            <h4 className="font-label-md text-[13px] font-bold text-transport-blue mb-1">
              3. Tombol &quot;Run Spatial Analysis&quot;
            </h4>
            <p className="text-on-surface-variant">
              Menghitung ulang peringkat prioritas halte baru dan titik kritis secara terpadu menggunakan model Multi-Criteria AHP dan Maximal Coverage.
            </p>
          </div>

          <div className="p-3 bg-surface-container-low rounded-lg border border-border-low">
            <h4 className="font-label-md text-[13px] font-bold text-transport-blue mb-1">
              4. Penugasan Lapangan (&quot;Dispatch Team&quot;)
            </h4>
            <p className="text-on-surface-variant">
              Klik tombol &quot;Dispatch Team&quot; pada kartu prioritas halte untuk menugaskan tim perbaikan teknis ke Dinas Perhubungan, PUPR, atau DLH.
            </p>
          </div>
        </div>

        <div className="mt-5 pt-3 border-t border-border-low flex justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-lg bg-transport-blue text-white font-label-md text-[13px] font-bold">
            Saya Mengerti
          </button>
        </div>
      </div>
    </div>
  );
}

// 5. Settings Modal
export function SettingsModal({ isOpen, onClose }: BaseModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-md rounded-xl border border-border-low bg-surface p-6 shadow-2xl animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between border-b border-border-low pb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-transport-blue/10 flex items-center justify-center text-transport-blue">
              <span className="material-symbols-outlined text-[24px]">settings</span>
            </div>
            <div>
              <h3 className="font-headline-md text-[18px] font-bold text-on-surface">
                Pengaturan Tampilan
              </h3>
              <p className="font-label-sm text-[12px] text-on-surface-variant">
                Konfigurasi GIS & Preferensi Antarmuka
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-container text-on-surface-variant">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="mt-4 flex flex-col gap-3 font-label-sm text-[13px]">
          <div className="flex items-center justify-between p-2.5 rounded-lg border border-border-low bg-surface">
            <span>High-Contrast GIS Mode</span>
            <input type="checkbox" defaultChecked className="rounded text-transport-blue focus:ring-transport-blue h-4 w-4" />
          </div>
          <div className="flex items-center justify-between p-2.5 rounded-lg border border-border-low bg-surface">
            <span>Animasi Transisi Kamera (Fly-To)</span>
            <input type="checkbox" defaultChecked className="rounded text-transport-blue focus:ring-transport-blue h-4 w-4" />
          </div>
          <div className="flex items-center justify-between p-2.5 rounded-lg border border-border-low bg-surface">
            <span>Satuan Jarak Metrik (Meter / Km)</span>
            <input type="checkbox" defaultChecked disabled className="rounded text-transport-blue focus:ring-transport-blue h-4 w-4" />
          </div>
        </div>

        <div className="mt-5 pt-3 border-t border-border-low flex justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-lg bg-transport-blue text-white font-label-md text-[13px] font-bold">
            Simpan Pengaturan
          </button>
        </div>
      </div>
    </div>
  );
}

