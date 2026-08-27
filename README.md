# TransConnect Semarang

WebGIS Decision Support System untuk perencanaan halte Bus Rapid Transit (BRT) Trans Semarang dan
evaluasi aksesibilitas pejalan kaki menuju halte, di Kecamatan Tembalang, Kota Semarang.
Dibangun untuk MAPID WebGIS Competition #2 2026 oleh Tim GOPEK (Universitas Diponegoro).

Status saat ini: **Fase 1 MVP** — peta interaktif dengan layer titik survei halte terkurasi
(kode warna sesuai skor kondisi, popup foto & atribut). Lihat roadmap fase berikutnya di bagian
bawah.

## Prasyarat

- Node.js LTS (sudah diverifikasi jalan dengan Node 26 / npm 11)
- Python 3.11+ (untuk backend FastAPI dan script data — **belum terinstall di setup ini**, install
  dulu sebelum menjalankan `backend/`)
- Docker Desktop (untuk PostGIS lewat `docker-compose`)
- API Key dari [geo.mapid.io](https://geo.mapid.io) (Dashboard → Map Services → API Keys) — dipakai
  untuk basemap (MapLibre GL) **dan** untuk menarik data survei (endpoint Activities). Tidak perlu
  akun Mapbox terpisah.

## Struktur Repo

```
frontend/   Next.js (App Router, TypeScript) + MapLibre GL JS (basemap dari MAPID)
backend/    FastAPI + PostgreSQL/PostGIS
```

Lihat `.env.example` di root untuk daftar lengkap environment variable yang dipakai kedua sisi.

## Setup & Menjalankan

### 1. Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local   # isi NEXT_PUBLIC_MAPID_API_KEY
npm run dev
```

Buka http://localhost:3000 — peta akan langsung menampilkan **data contoh** (termasuk satu titik
data asli: "Bus Stop Bukit Kencana Jaya") dari `frontend/public/data/halte-survey.geojson` selama
backend belum jalan (lihat `src/lib/fetchHalteData.ts` untuk logika fallback-nya).

### 2. Backend + PostGIS (opsional untuk lihat peta, wajib untuk jalur data "sungguhan")

```bash
docker-compose up -d          # jalankan PostGIS
cd backend
python -m venv .venv && .venv\Scripts\activate   # Windows
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload
```

Cek `http://localhost:8000/api/v1/halte-survey` mengembalikan `FeatureCollection`. Frontend akan
otomatis memakai endpoint ini begitu backend terdeteksi hidup.

### 3. Menarik 40 titik data survei asli dari MAPID

Data survei disubmit lewat fitur **Activities** (Community Maps) di MAPID Apps, ditandai hashtag
`#timGOPEK` — bukan form terstruktur, jadi atribut kondisi (CCTV/penerangan/trotoar/dst) tidak
punya field sendiri, melainkan tertulis bebas di deskripsi tiap post.

1. Tarik data lewat endpoint Activities MAPID (perlu API Key dari geo.mapid.io, header `x-api-key`):
   ```bash
   curl -X POST https://server.mapid.io/web/competition/activities \
     -H "Content-Type: application/json" \
     -H "x-api-key: API_KEY_KALIAN" \
     -d '{
       "feature": {
         "type": "Polygon",
         "coordinates": [[[110.38,-7.10],[110.49,-7.10],[110.49,-7.00],[110.38,-7.00],[110.38,-7.10]]]
       },
       "start_date": "2026-08-21",
       "end_date": "2026-08-23",
       "hashtag": ["timGOPEK"]
     }' > tembalang_activities.json
   ```
   (Kotak koordinat di atas cuma bounding box longgar yang mencakup Kecamatan Tembalang, bukan
   batas administrasi presisi — cukup untuk menyaring data tahap ini.)

2. Jalankan script pembersih + ekstraksi atribut dari teks:
   ```bash
   cd backend
   python scripts/clean_survey_export.py path/to/tembalang_activities.json
   ```
   Ini akan:
   - Membaca `title`/`description`/`geometry`/`medias`/`created_at` tiap Activity.
   - **Menebak** nilai `cctv`, `lighting`, `sidewalk_condition`, `route_info_signage`, `canopy`
     ("ada" / "tidak" / "-" kalau tidak disebutkan) dari teks deskripsi, pakai pencarian kata kunci
     + deteksi kata negasi ("tidak", "tanpa", dst.) di sekitarnya.
   - Menghitung `condition_score`/`condition_label`.
   - Menyimpan teks deskripsi asli ke `catatan_lapangan` di setiap fitur, supaya bisa dicek ulang.
   - Menulis hasilnya ke `backend/data/processed/halte-survey.geojson` **dan**
     `frontend/public/data/halte-survey.geojson` (menggantikan data contoh).

   **Penting**: ini heuristik berbasis kata kunci, bukan pemahaman bahasa yang sempurna — SELALU
   cek ulang `condition_score`/label tiap titik terhadap `catatan_lapangan`-nya sebelum dipakai,
   terutama untuk kasus kalimat yang tidak biasa. Script akan cetak peringatan kalau ada `kelurahan`
   yang tidak berhasil ditebak dari teks maupun batas kelurahan (perlu dicek manual).

3. (Opsional, untuk jalur PostGIS) `python scripts/load_to_postgis.py`.

4. (Opsional) `python scripts/build_community_reports.py` — menurunkan layer "Community Maps"
   (`frontend/public/data/community-reports.geojson`) dari `halte-survey.geojson` yang baru saja
   dibersihkan. Lihat penjelasan di bawah.

### 3b. Layer Community Maps (data contoh laporan warga)

PRD mendefinisikan alur AI: warga melapor lewat Community Maps → foto diverifikasi otomatis
(QC Pipeline + YOLOv8-seg) → laporan yang lolos tampil di dashboard DISHUB. Partisipasi warga
organik dan model YOLOv8 belum ada di tahap ini, jadi `scripts/build_community_reports.py`
memakai 40+ titik survei tim (yang sudah melalui QA manual — lihat `manual_corrections.json`)
sebagai **data contoh** laporan warga, dengan QA manual itu berperan sebagai pengganti sementara
untuk verifikasi YOLOv8 (semua ditandai `verification_status: "verified"`).

Ini murni untuk mendemokan bentuk pipeline-nya sekarang; setiap field yang berhubungan dengan ini
(`pelapor`, `verified_by`) sengaja diberi label eksplisit "data contoh" / "placeholder" supaya
tidak disalahartikan sebagai partisipasi warga sungguhan. Ganti `build_community_reports.py`
dengan endpoint submission warga + panggilan YOLOv8 sungguhan begitu keduanya sudah dibangun —
skema GeoJSON-nya (`report_id`, `judul`, `deskripsi`, `verification_status`, dst., lihat
`frontend/src/types/communityReport.ts`) sudah dirancang untuk itu.

Jalankan setelah `clean_survey_export.py`:
```
python scripts/build_community_reports.py
```
Ini menulis ke `backend/data/processed/community-reports.geojson` dan
`frontend/public/data/community-reports.geojson`. Layer ini muncul di peta sebagai marker biru
ber-cluster (toggle "Laporan Warga (contoh)", nonaktif secara default), dan laporan yang lolos
verifikasi terdaftar di halaman `/dashboard` ("Dashboard DISHUB").

### 4. Menarik ulang data (re-pull) setelah data awal berubah

Karena MAPID Apps memungkinkan posting/edit kapan saja, setiap re-pull memproses ULANG semua
activity dari nol — bukan cuma yang baru. Supaya titik yang atributnya sudah pernah dibaca &
dikoreksi manual oleh tim TIDAK balik lagi ke tebakan otomatis, `clean_survey_export.py` menyimpan
koreksi itu secara permanen di `backend/data/reference/manual_corrections.json` (keyed by
`halte_id` MAPID) dan otomatis menerapkannya di setiap run.

Alurnya:

1. Jalankan ulang curl di langkah 3.1 (ganti `start_date`/`end_date` sesuai kebutuhan) →
   overwrite `tembalang_activities.json`.
2. `python scripts/clean_survey_export.py path/to/tembalang_activities.json` seperti biasa.
3. Baca output di terminal:
   - Titik yang `halte_id`-nya sudah ada di `manual_corrections.json` otomatis dapat nilai yang
     sudah diverifikasi tim — aman, tidak perlu dikerjakan ulang.
   - Titik **baru** (belum pernah ada) akan dicetak sebagai daftar `N NEW point(s) not found in
     manual_corrections.json` lengkap dengan `halte_id` dan nama halte-nya — atribut titik ini
     masih tebakan otomatis murni.
4. Untuk tiap titik baru itu: buka `catatan_lapangan`-nya di GeoJSON hasil, baca manual, lalu
   tambahkan entrinya ke `manual_corrections.json` (format: `"halte_id": {"cctv": "...",
   "lighting": "...", "sidewalk_condition": "...", "route_info_signage": "...", "canopy": "..."}`).
5. Jalankan ulang `clean_survey_export.py` sekali lagi — sekarang seharusnya tercetak "All points
   are covered".
6. (Kalau memakai layer Community Maps) jalankan ulang `python scripts/build_community_reports.py`
   supaya `community-reports.geojson` ikut ter-update dari `halte-survey.geojson` terbaru.

## Catatan

- Skor kondisi (`condition_score`/`condition_label`) di Fase 1 dihitung dengan heuristik rule-based
  sederhana di `backend/app/services/condition_score.py`, dari atribut tri-state ("ada"/"tidak"/"-")
  yang ditebak dari teks — bukan hasil visual dari foto. Akan digantikan skor YOLOv8-seg + Weighted
  Overlay/AHP di fase berikutnya, begitu model itu jadi.
- Skema Pydantic (backend), TypeScript types (frontend), dan file GeoJSON statis disinkronkan
  manual untuk saat ini (wajar di skala 40 data) — perlu diperhatikan kalau data bertambah.

## Roadmap Setelah Fase 1

Layer Community Maps (cluster) → YOLOv8-seg + Automated QC Pipeline (klasifikasi kondisi trotoar/
lampu dari foto, gantikan tebakan dari teks) → Network Isochrone Analysis → Location Allocation
Model → Weighted Overlay & AHP + layer LST/Slope → Safe Transit Navigator → Policy & Task
Dispatcher Dashboard → deployment ke VPS dengan domain & HTTPS.
