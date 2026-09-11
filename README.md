# TransConnect Semarang

WebGIS Decision Support System untuk perencanaan halte Bus Rapid Transit (BRT) Trans Semarang dan
evaluasi aksesibilitas pejalan kaki menuju halte, di Kecamatan Tembalang, Kota Semarang.
Dibangun untuk MAPID WebGIS Competition #2 2026 oleh Tim GOPEK (Universitas Diponegoro).

**Live**: https://transconnect.ownmap.id

## Status

Proyek sudah melewati seluruh tahapan utama roadmap awal dan berjalan di produksi:

- Peta publik dengan 42 titik survei halte terkurasi (kode warna skor kondisi, foto, komentar
  warga) dan jaringan koridor BRT Trans Semarang (per-koridor, foldable).
- Alur laporan warga sungguhan (bukan lagi data contoh): warga memilih halte di peta, menulis
  deskripsi, dan opsional melampirkan foto/video. Foto otomatis dianalisis oleh **detektor
  infrastruktur YOLOv5** (9 kelas: crosswalk, trotoar, rambu, lampu jalan, shelter, dll.) — hasil
  deteksi bisa mengisi otomatis atribut survei halte yang sebelumnya tidak diketahui (lihat
  `backend/app/services/photo_detection.py`).
- Network Isochrone Analysis (jangkauan jalan kaki 3/5/10 menit dari tiap halte).
- Location Allocation Model — solver Maximal Covering Location Problem (greedy) yang
  merekomendasikan lokasi halte baru berdasarkan kepadatan penduduk yang belum terlayani.
- Chatbot yang menjelaskan hasil Location Allocation Model dalam bahasa natural (LLM hanya
  menerjemahkan angka yang sudah dihitung solver, tidak menentukan lokasi sendiri).
- Safe Transit Navigator: mencari halte tersurvei terdekat lewat jaringan jalan pejalan kaki
  sungguhan (bukan garis lurus), dengan **navigasi live** (posisi & rute ter-update berjalan,
  mirip aplikasi peta pada umumnya) begitu warga menekan "Navigasi ke Halte Ini".
- Policy & Task Dispatcher Dashboard (khusus staf DISHUB, `/dashboard`): mengelola laporan warga,
  membuat/mendispatch tugas perbaikan (dari laporan warga maupun manual) ke salah satu dari empat
  tim lapangan, menandai tugas selesai, dan melihat catatan survei lapangan yang selalu
  diperbarui dari laporan teknisi terbaru.
- Deploy produksi di VPS dengan domain & HTTPS (lihat bagian Deployment).

Belum dikerjakan (dinilai *nice to have*, bukan kebutuhan inti saat ini):

- Weighted Overlay & AHP sebagai metodologi skor kondisi halte yang lebih formal — skor kondisi
  saat ini masih heuristik rule-based sederhana (`backend/app/services/condition_score.py`) dari
  atribut tri-state ("ada"/"tidak"/"-").
- Layer tambahan LST (Land Surface Temperature) / Slope.

## Struktur Repo

```
frontend/   Next.js (App Router, TypeScript) + MapLibre GL JS (basemap dari MAPID)
backend/    FastAPI + PostgreSQL/PostGIS
detector/   YOLOv5 (vendored via git subtree dari repo tim) -- layanan deteksi foto infrastruktur
```

Lihat `.env.example` di root dan `backend/.env.example` untuk daftar environment variable.

## Setup & Menjalankan Lokal

### 1. Frontend

```bash
cd frontend
npm install
```

Buat `frontend/.env.local` (tidak di-commit) berisi:

```
NEXT_PUBLIC_MAPID_API_KEY=       # dari geo.mapid.io Dashboard > Map Services > API Keys
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

```bash
npm run dev
```

Buka http://localhost:3000 — peta memuat data lewat `NEXT_PUBLIC_API_BASE_URL`; tanpa backend
hidup, layer yang butuh data (halte, BRT, dsb.) tidak akan tampil.

### 2. Backend + PostGIS

```bash
docker-compose up -d          # jalankan PostGIS
cd backend
python -m venv .venv && .venv\Scripts\activate   # Windows
pip install -r requirements.txt
cp .env.example .env          # isi GEOMAPID_API_KEY, GEMINI_API_KEY sesuai kebutuhan
uvicorn app.main:app --reload
```

Cek `http://localhost:8000/api/v1/halte-survey` mengembalikan `FeatureCollection`.

Catatan `YOLO_API_URL` (dipakai `photo_detection.py` untuk menganalisis foto laporan warga):
default-nya `http://transconnect-api:8000`, hostname Docker yang hanya bisa di-resolve di jaringan
proxy VPS produksi. Untuk menguji analisis foto dari lokal, set env var ini ke instance detektor
yang bisa dijangkau (mis. endpoint produksi `https://transconnect.ownmap.id/api`, atau jalankan
`detector/` sendiri secara lokal). Tanpa ini, laporan warga tetap tersimpan normal — hanya
`ai_detections` pada laporan itu yang mencatat error koneksi, dan tidak ada atribut survei yang
ter-update otomatis.

Skema database tidak memakai tool migrasi — perubahan kolom perlu dijalankan manual
(`ALTER TABLE ... ADD COLUMN IF NOT EXISTS ...`) di tiap environment. Cek riwayat model terbaru di
`backend/app/models/` untuk kolom yang perlu ditambahkan pada database yang sudah ada.

### 3. Menyiapkan data dasar

Data survei 42 titik halte, kepadatan penduduk, jaringan BRT, dan graf pejalan kaki sudah tersedia
sebagai file terproses di `backend/data/processed/` dan `frontend/public/data/`. Untuk membangun
ulang dari sumber mentah, jalankan script di `backend/scripts/` sesuai urutan dependensinya (baca
docstring tiap file untuk detail sumber data dan metodologinya):

1. `clean_survey_export.py` — membersihkan hasil tarikan data survei MAPID Activities (hashtag
   `#timGOPEK`) dan menebak atribut kondisi dari teks deskripsi. Koreksi manual tim disimpan
   permanen di `backend/data/reference/manual_corrections.json` (keyed by `halte_id`) supaya
   re-pull data tidak menimpa nilai yang sudah diverifikasi.
2. `build_pedestrian_network.py` — graf jalan pejalan kaki dari OpenStreetMap (osmnx), dasar untuk
   isochrone, location allocation, dan Safe Transit Navigator.
3. `build_isochrones.py` — jangkauan jalan kaki 3/5/10 menit. File yang di-commit sebenarnya berasal
   dari isochrone Valhalla (Stadia Maps) yang lebih akurat; script ini adalah fallback berbasis
   buffer jaringan kalau akses Valhalla tidak tersedia.
4. `build_population_layer.py` + `add_survey_coverage_to_population.py` — layer kepadatan penduduk
   per kelurahan dari data BPS.
5. `build_location_allocation.py` — solver MCLP (greedy) untuk rekomendasi lokasi halte baru.
6. `build_bus_stops.py` + `match_survey_to_bus_stops.py` — inventaris titik bus stop di luar 42
   titik survei tim, dicocokkan dengan laporan warga yang mungkin menggambarkan halte yang sama.
7. `load_to_postgis.py` — memuat semua GeoJSON terproses ke PostGIS.

### 4. Detektor foto (YOLOv5)

`detector/` adalah salinan (git subtree) dari repo YOLOv5 tim, plus dua file wrapper produksi:

- `detector/api_server.py` — FastAPI wrapper yang memuat `best.pt` dan menyediakan endpoint
  `/detect` (dipanggil backend lewat `YOLO_API_URL`).
- `detector/sitecustomize.py` — shim kompatibilitas pathlib supaya checkpoint model yang dilatih di
  Linux bisa dimuat di Windows.

Model weights (`best.pt`) tidak ikut di-commit (`.gitignore`) — perlu didapatkan terpisah dari tim
yang melatih model, atau dari lingkungan produksi.

## Deployment

Produksi berjalan di VPS (ownmap.id) dengan domain & HTTPS, dikelola oleh dosen pembimbing:
frontend dan backend di-build langsung dari branch `main` repo ini, detektor dibangun dari folder
`detector/` di repo yang sama. Konfigurasi Docker/deploy spesifik VPS (`Dockerfile`, `fly.toml`,
dsb.) tidak seluruhnya di-commit ke repo ini karena sebagian bersifat environment-specific.

## Catatan

- Skor kondisi (`condition_score`/`condition_label`) masih heuristik rule-based sederhana dari
  atribut tri-state ("ada"/"tidak"/"-") -- lihat `backend/app/services/condition_score.py`. Foto
  laporan warga bisa memperkaya atribut yang sebelumnya tidak diketahui lewat deteksi YOLOv5
  (`backend/app/services/photo_detection.py`), tapi tidak pernah menimpa nilai yang sudah ada atau
  menandai sesuatu sebagai "tidak ada" -- foto cuma bisa membuktikan keberadaan, bukan ketiadaan.
- Skema Pydantic (backend), TypeScript types (frontend), dan file GeoJSON statis disinkronkan
  manual untuk saat ini (wajar di skala puluhan data) -- perlu diperhatikan kalau data bertambah.
