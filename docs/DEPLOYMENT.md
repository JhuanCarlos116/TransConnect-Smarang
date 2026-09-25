# Panduan Deployment — TransConnect Semarang

Dokumen ini menjelaskan cara men-deploy sistem TransConnect Semarang dari nol di server baru
(VPS/VM), sampai HTTPS aktif dan semua layanan terverifikasi.

Ditulis untuk kondisi sistem per **25 September 2026**. Semua perintah di sini sudah pernah
dijalankan di server produksi — bukan contoh teoretis. Fakta yang bergantung pada kode sudah
diverifikasi ulang terhadap commit `9906e17` (semua rute health check 200, dua rute POST-only 405).

> **Yang perlu diubah sebelum mulai.** Konfigurasi deploy saat ini melekat pada server produksi
> (domain `transconnect.ownmap.id`, direktori `/home/firman`). Untuk server baru, siapkan
> substitusi berikut dan pakai konsisten di seluruh dokumen:
>
> | Placeholder | Produksi saat ini | Server baru |
> |---|---|---|
> | `<DOMAIN>` | `transconnect.ownmap.id` | domain/subdomain Anda |
> | `<BASE>` | `/home/firman` | direktori home user deploy, mis. `/home/deploy` |
>
> Ganti **semua** kemunculan keduanya. Melewatkan satu saja adalah penyebab kegagalan paling
> sering (lihat §8).

---

## 1. Arsitektur

Lima container dalam satu stack Docker. Yang publik hanya reverse-proxy; sisanya hanya bisa
diakses antar-container.

```
                        Internet
                            │
                    :80/:443 │
                            ▼
                 ┌──────────────────────┐
                 │  reverse-proxy       │  nginx (stack lain, sudah ada)
                 │  TLS + routing       │
                 └──────────┬───────────┘
                            │  jaringan Docker: proxy-net
        ┌───────────────────┼───────────────────┬──────────────────┐
        │                   │                   │                  │
        ▼                   ▼                   ▼                  ▼
┌───────────────┐  ┌────────────────┐  ┌────────────────┐  ┌──────────────┐
│ frontend      │  │ backend        │  │ transconnect-  │  │ postgis      │
│ Next.js :3000 │  │ FastAPI :8000  │  │ api :8000      │  │ PostGIS :5432│
│ (peta, UI)    │  │ /api/v1/*      │  │ YOLOv5 /detect │  │              │
└───────────────┘  └───────┬────────┘  └────────────────┘  └──────┬───────┘
                           │  jaringan: data-net                  │
                           └──────────────────────────────────────┘
```

Routing di reverse-proxy (urutan penting, dari yang paling spesifik):

| Path | Ditujukan ke | Catatan |
|---|---|---|
| `/api/detect` | `transconnect-api:8000/detect` | exact-match; GET harus 405 |
| `/api/` | `transconnect-backend:8000` | `client_max_body_size 120M` untuk unggah foto |
| `/uploads/` | `transconnect-backend:8000` | foto warga + render ber-anotasi |
| `/` | `transconnect-frontend:3000` | aplikasi Next.js |

**Layanan dan fungsinya**

| Container | Isi | Sumber build |
|---|---|---|
| `transconnect-frontend` | Next.js App Router + MapLibre GL, basemap MAPID | repo `main` |
| `transconnect-backend` | FastAPI, osmnx, geopandas, chatbot DeepSeek | repo `main` |
| `transconnect-api` | YOLOv5 9 kelas, pembungkus FastAPI `/detect` | repo `main`, folder `detector/` |
| `postgis` | PostgreSQL 16 + PostGIS 3.4 | image `postgis/postgis:16-3.4` |
| `reverse-proxy` | nginx, TLS, routing semua subdomain | **stack terpisah**, tidak termasuk di sini |

Catatan penting: **tidak ada berkas konfigurasi VPS di dalam repo tim.** Repo hanya berisi
aplikasi (dan `docker-compose.yml` yang cuma mendefinisikan PostGIS). Dockerfile, compose untuk
aplikasi, skrip deploy, dan `.env` sengaja diletakkan di direktori deploy terpisah supaya pohon
repo tetap bersih dan bisa terus menerima push dari tim.

---

## 2. Prasyarat

**Server**

- Linux x86_64, RAM **minimal 4 GB** (8 GB lebih nyaman: citra Docker saja ~5,3 GB)
- Disk **minimal 20 GB** kosong; torch CPU ±1,5 GB, citra detektor ±2,8 GB
- CPU saja sudah cukup. Verifikasi terakhir: inferensi ±85–300 ms/gambar. **Tidak perlu GPU.**
- Docker Engine 24+ dan plugin Compose v2 (`docker compose`, bukan `docker-compose`)

Versi yang terbukti berjalan di produksi: Docker 29.6.1, Compose v5.2.0, Python 3.11, Node 22.

**Jaringan & DNS**

- A record `<DOMAIN>` → IP publik server. DNS harus sudah aktif **sebelum** menerbitkan
  sertifikat, karena Let's Encrypt memverifikasi lewat HTTP.
- Port **80 dan 443** terbuka dari internet (untuk ACME HTTP-01 dan akses pengguna).
- Port **5432 tidak boleh** terbuka ke publik. Lihat §8 pitfall 6.

**Akun & kredensial pihak ketiga**

| Nama variabel | Dibutuhkan untuk | Dari mana |
|---|---|---|
| `NEXT_PUBLIC_MAPID_API_KEY` | basemap peta (wajib — tanpa ini peta kosong) | geo.mapid.io → Map Services → API Keys |
| `DEEPSEEK_API_KEY` | chatbot rekomendasi halte | platform.deepseek.com → API Keys |
| `GEOMAPID_API_KEY` | penarikan data survei (dipakai manual, bukan runtime) | geo.mapid.io |
| `POSTGRES_PASSWORD` | password database | buat sendiri |
| bobot `yolo-best.pt` | detektor foto | **minta ke tim pelatih model** (§5.8) |

Nilai aslinya **tidak boleh** masuk git. Semua berkas `.env` sudah masuk `.gitignore`.

---

## 3. Menyiapkan kode

```bash
export BASE=<BASE>          # mis. /home/deploy
export DOMAIN=<DOMAIN>

git clone https://github.com/JhuanCarlos116/TransConnect-Smarang.git "$BASE/TransConnect-Smarang"
mkdir -p "$BASE/transconnect-deploy"
```

Repo bersifat publik, jadi clone tidak butuh kredensial. Untuk bisa push (kalau Anda perlu),
pastikan akun GitHub Anda punya izin tulis:

```bash
gh api repos/JhuanCarlos116/TransConnect-Smarang --jq '{private: .private, push: .permissions.push}'
# harus menghasilkan: {"private":false,"push":true}
```

Direktori deploy (`$BASE/transconnect-deploy/`) berisi berkas yang **tidak ada di repo** dan harus
dibuat ulang di server baru:

```
$BASE/transconnect-deploy/
├── docker-compose.yml        # definisi 3 layanan aplikasi (WAJIB disesuaikan)
├── backend.Dockerfile
├── frontend.Dockerfile
├── yolo.Dockerfile
├── deploy.sh                 # skrip deploy ulang (WAJIB disesuaikan)
├── .env                      # rahasia, chmod 600
├── yolo-best.pt              # bobot model (tidak di repo)
├── load_brt_transconnect.py  # loader layer BRT
├── load_brt_transconnect.sh
├── extract_arcgis_webmap.py  # ekstraksi ulang data BRT dari ArcGIS
└── yolo_healthcheck.py       # uji inferensi nyata saat deploy
```

Isi Dockerfile dan skrip loader bisa disalin dari server lama, atau dibuat ulang mengikuti §4–§6.

---

## 4. Jaringan Docker

Dua jaringan harus ada **sebelum** `docker compose up`. Keduanya `external`, jadi Compose tidak
akan membuatnya sendiri:

```bash
docker network create proxy-net                    # jaringan bersama reverse-proxy
docker network create transconnect-smarang_default # jaringan data ke PostGIS
```

`proxy-net` biasanya sudah ada jika server ini juga menjalankan reverse-proxy. Jaringan kedua
dibuat otomatis oleh Compose milik repo (proyek `transconnect-smarang`) saat PostGIS dijalankan —
jadi jalankan §5.1 lebih dulu bila belum ada.

---

## 5. Deployment

### 5.1 Jalankan PostGIS

Repo tim sudah menyediakan compose untuk database:

```bash
cd "$BASE/TransConnect-Smarang"
docker compose up -d
```

Compose tersebut sudah **mem-publish port 5432 ke 0.0.0.0**. Kalau server baru ini tidak butuh
akses Postgres dari luar, ubah dulu `ports: - "5432:5432"` menjadi `- "127.0.0.1:5432:5432"`.
Lihat §8 pitfall 6.

### 5.2 Muat data survei

42 titik halte hasil survei lapangan dibaca dari berkas yang **sudah ter-commit** di repo
(`backend/data/processed/halte-survey.geojson`), jadi tidak ada data mentah yang perlu ditarik
ulang.

```bash
cd "$BASE/TransConnect-Smarang/backend"
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# arahkan ke Postgres lokal
cat > .env <<'EOF'
DATABASE_URL=postgresql+asyncpg://transconnect:transconnect@localhost:5432/transconnect_semarang
EOF

python scripts/load_to_postgis.py
# harapan: "Loaded 42 halte points into halte_survey."
```

> **Jangan pakai `pip install -r requirements.txt` untuk image detektor.** requirements backend ini
> ringan, tapi `osmnx`/`geopandas` akan menarik banyak dependensi. Untuk keperluan build citra, pip
> dijalankan di dalam Dockerfile (lihat §5.5), bukan di host.

Semua berkas berikut sudah ter-commit dan cukup untuk menjalankan sistem tanpa membangun ulang apa
pun dari data mentah:

```
backend/data/processed/halte-survey.geojson          backend/data/processed/kelurahan_population.geojson
backend/data/processed/halte_isochrones.geojson      backend/data/processed/halte_recommendations.geojson
backend/data/processed/bus_stops.geojson             backend/data/processed/community-reports.geojson
backend/data/processed/pedestrian_network_edges.geojson
backend/data/processed/pedestrian_network_nodes.geojson
backend/data/reference/kelurahan_tembalang.geojson
backend/data/reference/manual_corrections.json
```

Hanya `backend/data/raw/` yang di-`.gitignore`, dan itu hanya diperlukan kalau Anda hendak
**membangun ulang** data terproses dari nol (`clean_survey_export.py` butuh tarikan mentah dari
MAPID Activities dan `bus_stops_raw.geojson`). Untuk sekadar deploy, berkas hasil olahan di atas
sudah cukup.

### 5.3 Buat konfigurasi deploy

Buat `docker-compose.yml` di direktori deploy. Perhatikan **dua hal yang wajib diganti**: seluruh
path absolut dan domain pada build arg.

```yaml
services:
  transconnect-frontend:
    build:
      context: /home/deploy/TransConnect-Smarang          # <-- ganti
      dockerfile: /home/deploy/transconnect-deploy/frontend.Dockerfile   # <-- ganti
      args:
        NEXT_PUBLIC_API_BASE_URL: https://example.org      # <-- ganti, TANPA garis miring di akhir
        NEXT_PUBLIC_MAPID_API_KEY: ${NEXT_PUBLIC_MAPID_API_KEY:-}
    container_name: transconnect-frontend
    restart: unless-stopped
    networks: [proxy-net]

  transconnect-backend:
    build:
      context: /home/deploy/TransConnect-Smarang           # <-- ganti
      dockerfile: /home/deploy/transconnect-deploy/backend.Dockerfile    # <-- ganti
    container_name: transconnect-backend
    restart: unless-stopped
    environment:
      # `postgis` harus sesuai nama service di compose repo
      DATABASE_URL: postgresql+asyncpg://transconnect:transconnect@postgis:5432/transconnect_semarang
      CORS_ORIGINS: https://example.org                    # <-- ganti
      GEOMAPID_API_KEY: ${GEOMAPID_API_KEY:-}
      DEEPSEEK_API_KEY: ${DEEPSEEK_API_KEY:-}
      # Biarkan default transconnect-api:8000 -- hanya bisa di-resolve di proxy-net.
    volumes:
      - /home/deploy/TransConnect-Smarang/backend/uploads:/app/uploads   # <-- ganti
      - /home/deploy/transconnect-uploads-quarantine:/app/uploads-quarantine  # <-- ganti
    networks: [proxy-net, data-net]

  transconnect-api:
    build:
      # Folder detector/ ADA DI DALAM repo (git subtree), bukan clone terpisah.
      context: /home/deploy/TransConnect-Smarang/detector   # <-- ganti
      dockerfile: /home/deploy/transconnect-deploy/yolo.Dockerfile
    container_name: transconnect-api
    restart: unless-stopped
    volumes:
      - /home/deploy/transconnect-deploy/yolo-best.pt:/app/best (1).pt:ro   # <-- ganti
    networks: [proxy-net]

networks:
  proxy-net:
    external: true
  data-net:
    external: true
    name: transconnect-smarang_default
```

Poin-poin yang mudah salah:

- `container_name` **harus** tetap persis seperti di atas (`transconnect-frontend`, `-backend`,
  `-api`) karena nginx mengarahkan ke nama tersebut, bukan ke nama service Compose.
- `NEXT_PUBLIC_*` adalah variabel **build-time**, bukan runtime. Mengubahnya di environment
  container tidak berpengaruh — harus lewat `build.args` lalu bangun ulang citra.
- Volume `uploads-quarantine` di-mount ke host dengan sengaja. `upload_cleanup.py` memindahkan berkas
  yatim ke sana; kalau disimpan di dalam container, berkasnya hilang saat citra dibangun ulang, dan
  justru itu alasan kuarantina dipakai alih-alih penghapusan.
- Bobot model di-mount, tidak dipanggang ke citra: `.dockerignore` repo mengecualikan `**/*.pt`, dan
  model hasil latih ulang bisa ditukar tanpa build ulang.

### 5.4 Isi rahasia

```bash
cd "$BASE/transconnect-deploy"
cat > .env <<'EOF'
NEXT_PUBLIC_MAPID_API_KEY=<isi>
DEEPSEEK_API_KEY=<isi>
EOF
chmod 600 .env
```

Docker Compose membaca `.env` di direktori yang sama secara otomatis; variabel di dalamnya dipakai
oleh `${...}` di compose. Dua kunci di atas wajib terisi:

| Variabel | Wajib? | Akibat kalau kosong |
|---|---|---|
| `NEXT_PUBLIC_MAPID_API_KEY` | **Wajib** | Peta tampil tanpa basemap (kanvas kosong), muncul banner `"API key belum diisi"`. Di-embed saat **build**, jadi mengisinya belakangan perlu build ulang citra frontend. |
| `DEEPSEEK_API_KEY` | **Wajib** | Endpoint chatbot 500 saat dipanggil. Rute tetap ada, jadi probe `405` masih lolos — jangan andalkan probe itu untuk membuktikan LLM hidup. |
| `GEOMAPID_API_KEY` | Opsional | **Tidak dipakai sama sekali oleh kode.** `config.py` mendeklarasikan `geomapid_api_key` tetapi tidak ada satu pun pembacaannya di backend. Di produksi nilainya memang kosong. Aman dibiarkan kosong; jangan buang waktu mencarinya. |

Verifikasi tanpa menampilkan nilainya — perintah ini hanya mencetak **nama** variabel yang kosong,
tidak pernah nilainya:

```bash
cd "$BASE/transconnect-deploy"
docker compose config | grep -oE '(DEEPSEEK|NEXT_PUBLIC_MAPID)_API_KEY: ""' \
  || echo "OK: kedua kunci wajib sudah terisi"
```

`GEOMAPID_API_KEY` sengaja tidak ikut diperiksa karena kode tidak pernah membacanya. Jangan pernah
menyalin nilai kunci ke dalam terminal bersama, tiket, atau commit.

### 5.5 Bangun dan jalankan

```bash
cd "$BASE/transconnect-deploy"
docker compose build          # ±5–15 menit pada server baru
docker compose up -d
docker compose ps
```

### 5.6 Terapkan penambahan skema

Skema database **tidak memakai tool migrasi**. Tabel inti dibuat otomatis oleh ORM saat backend
start, tetapi kolom-kolom yang ditambahkan setelah rilis awal harus di-`ALTER` manual. Urutan ini
**wajib** dijalankan setelah container hidup, karena ORM menyeleksi kolom-kolom ini *berdasarkan
nama*: kolom yang hilang membuat endpoint 500 sementara halaman tetap tampil normal 200.

```bash
PSQL="docker exec transconnect-smarang-postgis-1 psql -U transconnect -d transconnect_semarang"

# FK citizen_report -> halte_survey butuh UNIQUE; geopandas to_postgis tidak membuatnya
$PSQL -c "ALTER TABLE halte_survey ADD CONSTRAINT halte_survey_halte_id_key UNIQUE (halte_id);"

$PSQL -c "
  ALTER TABLE citizen_report ADD COLUMN IF NOT EXISTS ai_detections JSONB;
  ALTER TABLE citizen_report ADD COLUMN IF NOT EXISTS ai_analyzed_at TIMESTAMPTZ;
  ALTER TABLE citizen_report ADD COLUMN IF NOT EXISTS photo_annotated_url VARCHAR;
  ALTER TABLE citizen_report ADD COLUMN IF NOT EXISTS photos JSONB;
  ALTER TABLE halte_survey ADD COLUMN IF NOT EXISTS facility_sources JSONB NOT NULL DEFAULT '{}'::jsonb;
  ALTER TABLE maintenance_task ADD COLUMN IF NOT EXISTS citizen_report_id VARCHAR;
  ALTER TABLE maintenance_task ADD COLUMN IF NOT EXISTS technician_video_url VARCHAR;
  ALTER TABLE maintenance_task ADD COLUMN IF NOT EXISTS facility_updates JSONB;
  ALTER TABLE maintenance_task ADD COLUMN IF NOT EXISTS facility_updates_approved BOOLEAN NOT NULL DEFAULT FALSE;
  ALTER TABLE maintenance_task ADD COLUMN IF NOT EXISTS facility_updates_snapshot JSONB;
  ALTER TABLE maintenance_task ADD COLUMN IF NOT EXISTS technician_photo_rejected BOOLEAN NOT NULL DEFAULT FALSE;
  ALTER TABLE maintenance_task ADD COLUMN IF NOT EXISTS facility_updates_rejected BOOLEAN NOT NULL DEFAULT FALSE;
  ALTER TABLE maintenance_task ADD COLUMN IF NOT EXISTS technician_photo_urls JSONB;
  ALTER TABLE maintenance_task ADD COLUMN IF NOT EXISTS technician_video_rejected BOOLEAN NOT NULL DEFAULT FALSE;
"

$PSQL -c "ALTER TABLE maintenance_task ADD CONSTRAINT maintenance_task_citizen_report_id_fkey
          FOREIGN KEY (citizen_report_id) REFERENCES citizen_report(report_id);"
```

Catat juga `maintenance_task` dan `citizen_report` tidak dibuat oleh `load_to_postgis.py` — keduanya
dibuat ORM saat backend pertama kali start. Pastikan container backend sudah pernah berjalan
sebelum menjalankan `ALTER` di atas.

### 5.7 Tambahkan layer BRT (opsional tapi disarankan)

Layer "Jaringan BRT Trans Semarang" (673 titik halte + 34 garis koridor) berasal dari Web Map
ArcGIS Online publik, **bukan** dari repo. Data ada di `$BASE/gis-data/brt-trans-semarang/`.

Kalau direktori itu belum ada, ekstrak ulang dari sumber aslinya:

```bash
# item ArcGIS: 1c3f6d0097324b63abf0cb0020621cae  ("Rute BRT Trans Semarang 2")
python3 extract_arcgis_webmap.py <webmap.json> "$BASE/gis-data/brt-trans-semarang"
```

Data disimpan di geometry-nya, **bukan** di kolom atribut `Latitude__`/`Longitude` milik sumber —
kolom-kolom itu meleset rata-rata 128 m (maksimum 1,15 km) dari geometrinya sendiri.

Muat ke PostGIS:

```bash
bash load_brt_transconnect.sh
# harapan: halte_brt 673 | fasilitas_umum 185 | rute_brt 34, semuanya SRID 4326
```

`load_brt_transconnect.sh` bersifat idempoten (drop lalu buat ulang tabel). Endpoint
`/api/v1/brt-network` sengaja memakai SQL mentah dan mengembalikan FeatureCollection kosong bila
tabel belum ada — layer ini tidak boleh bisa menjatuhkan API.

### 5.8 Siapkan bobot detektor

Bobot model **tidak ada di git** (`.gitignore` mengecualikan `**/*.pt`). Minta `best.pt` dari tim
pelatih model, atau salin dari server lama, lalu tempatkan sebagai:

```
$BASE/transconnect-deploy/yolo-best.pt     # di-mount ke container sebagai /app/best (1).pt
```

Model produksi saat ini: YOLOv5s, 9 kelas (crosswalk, sidewalk/trotoar, road, shelter, sign,
street_light, warning-tile, dan dua varian *directional tile*), dilatih 15 epoch @ 416 px pada
Colab. Verifikasi berkas yang benar dengan sidik jari, jangan hanya ukuran:

```bash
md5sum yolo-best.pt
# produksi: 014a9218228e457303a3c9b468b988b4  (14.362.543 byte)
```

Kalau sidik jarinya berbeda, itu model lain — jangan langsung pakai di produksi tanpa diuji
bandingkan (presisi deteksi memengaruhi langsung `halte_survey` yang dinilai lomba).

### 5.9 Reverse proxy dan HTTPS

Tambahkan blok server untuk `<DOMAIN>`. Dua baris yang paling menentukan:

```nginx
    server {
        listen 443 ssl;
        http2 on;
        server_name <DOMAIN>;

        ssl_certificate     /var/www/letsencrypt/live/<DOMAIN>/fullchain.pem;
        ssl_certificate_key /var/www/letsencrypt/live/<DOMAIN>/privkey.pem;

        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_prefer_server_ciphers off;
        ssl_session_cache shared:SSL:10m;

        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
        add_header X-Frame-Options SAMEORIGIN always;
        add_header X-Content-Type-Options nosniff always;
        add_header Referrer-Policy "strict-origin-when-cross-origin" always;

        # PENTING: nginx me-resolve nama container SEKALI saat start. Tanpa baris
        # resolver ini, setiap kali container aplikasi dibuat ulang (IP baru)
        # seluruh subdomain jadi 502 sampai nginx di-reload.
        resolver 127.0.0.11 valid=10s ipv6=off;

        # Detektor (exact match). Harus di atas location /api/.
        location = /api/detect {
            client_max_body_size 20m;
            proxy_pass http://transconnect-api:8000/detect;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto https;
            proxy_read_timeout 300s;
        }

        location /api/ {
            # Harus lebih besar dari batas terburuk unggah laporan:
            # 5 foto x 15 MB + 1 video 25 MB = ~100 MB, plus overhead multipart.
            # Menaikkan MAX_PHOTOS/MAX_PHOTO_BYTES di backend berarti menaikkan ini juga.
            client_max_body_size 120M;
            client_body_timeout 300s;
            set $tc_backend http://transconnect-backend:8000;
            proxy_pass $tc_backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto https;
            proxy_read_timeout 300s;
        }

        location /uploads/ {
            set $tc_backend http://transconnect-backend:8000;
            proxy_pass $tc_backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        }

        location / {
            set $tc_frontend http://transconnect-frontend:3000;
            proxy_pass $tc_frontend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto https;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection $connection_upgrade;
            proxy_read_timeout 300s;
        }
    }
```

Tambahkan juga `<DOMAIN>` ke `server_name` blok port 80 yang sudah ada, supaya verifikasi ACME dan
redirect ke HTTPS ikut berlaku. Cek keseimbangan kurung sebelum reload:

```bash
python3 -c "s=open('/path/nginx.conf').read(); print('OK' if s.count('{')==s.count('}') else 'TIDAK SEIMBANG')"
docker exec reverse-proxy nginx -t && docker exec reverse-proxy nginx -s reload
```

**Sertifikat tanpa sudo.** `/etc/letsencrypt` milik root. Kalau Anda punya sudo, `certbot
--nginx -d <DOMAIN>` sudah cukup. Kalau tidak, alurnya: bootstrap sertifikat dummy agar `nginx -t`
lolos → arahkan `.well-known/acme-challenge/` ke direktori yang bisa ditulis user → terbitkan
sertifikat asli dengan `certbot certonly --webroot` memakai `--config-dir` di home Anda → reload.
Sertifikat user-space **tidak** otomatis diperbarui; tambahkan cron:

```cron
17 3 * * * certbot renew --config-dir $BASE/letsencrypt/config \
  --work-dir $BASE/letsencrypt/work --logs-dir $BASE/letsencrypt/logs \
  --quiet --deploy-hook "docker exec reverse-proxy nginx -s reload"
```

---

## 6. Verifikasi

Jalankan seluruh pemeriksaan ini setelah deploy. Jangan hanya melihat "200" pada halaman depan —
itu bisa benar sementara API-nya mati.

```bash
D=<DOMAIN>
for p in / /masuk /map /login /dashboard /dashboard/tasks \
         /api/v1/halte-survey /api/v1/brt-network /api/v1/tasks /api/v1/citizen-reports; do
  printf "%-30s %s\n" "$p" "$(curl -s -o /dev/null -w '%{http_code}' --max-time 25 https://$D$p)"
done
```

Harapan: **semua 200**. Rute POST-only harus **405** (artinya rute ada, metodenya salah) — bukan
404 (rute hilang / impor modul gagal):

```bash
printf "/api/v1/chat/halte-recommendation → %s\n" \
  "$(curl -s -o /dev/null -w '%{http_code}' https://$D/api/v1/chat/halte-recommendation)"   # 405
printf "/api/detect                      → %s\n" \
  "$(curl -s -o /dev/null -w '%{http_code}' https://$D/api/detect)"                          # 405
```

Probe 405 sengaja dipakai agar tidak membelanjakan token LLM hanya untuk membuktikan rute hidup.

**Pastikan detektor benar-benar berinferensi.** Probe yang hanya memuat model akan lolos pada
detektor yang rusak — checkpoint bisa termuat lalu gagal saat inferensi:

```bash
docker logs transconnect-api 2>&1 | grep -i "Model loaded"
# harapan: "[api] Model loaded: /app/best (1).pt | 9 classes | stride 32"
docker exec -i transconnect-api python - < yolo_healthcheck.py
# harapan: "inference ok (<xx> ms, <n> detections)" — 0 deteksi tetap LULUS
```

**Pastikan API benar-benar mengembalikan data**, bukan hanya 200 kosong:

```bash
curl -s https://$D/api/v1/halte-survey | python3 -c \
  "import json,sys; d=json.load(sys.stdin); print(len(d['features']), 'halte')"     # 42
curl -s https://$D/api/v1/brt-network  | python3 -c \
  "import json,sys; f=json.load(sys.stdin)['features']; \
   print(sum(x['geometry']['type']=='Point' for x in f), 'titik BRT;', \
         sum(x['geometry']['type']=='LineString' for x in f), 'garis koridor')"     # 673 ; 34
```

**Pastikan peta benar-benar tergambar.** Status HTTP 200 tidak membuktikan peta tampil — kunci
basemap yang kosong atau salah tetap menghasilkan 200 dengan kanvas kosong.

Pemeriksaan cepat (dua menit), tanpa perlu browser:

```bash
cd "$BASE/transconnect-deploy"

# 1. Kunci benar-benar terisi di .env? (hitung saja, jangan cetak nilainya)
grep -cE '^NEXT_PUBLIC_MAPID_API_KEY=.+' .env      # harapan: 1

# 2. Konfigurasi basemap benar-benar ter-embed di bundel hasil build?
#    NEXT_PUBLIC_* disisipkan saat BUILD, jadi yang salah di sini berarti
#    perlu build ulang citra frontend, bukan sekadar restart container.
docker exec transconnect-frontend sh -c \
  "grep -rl 'basemap.mapid.io' /app/.next/static/chunks | head -3"
# harapan: satu atau lebih berkas tercetak. Kosong = kunci tidak ikut ter-build.
```

Untuk bukti yang sesungguhnya, muat halamannya dengan Chromium headless dan periksa jumlah respons
tile basemap, pesan error konsol, dan keberadaan kanvas WebGL. Ini satu-satunya cara membuktikan
peta tergambar. Tiga catatan penting:

- Untuk `/dashboard`, suntikkan `localStorage["transconnect-dishub-session"] = "true"` **sebelum**
  skrip halaman berjalan (di Playwright: `page.addInitScript`), karena halaman itu dijaga guard
  sisi klien dan tanpa itu Anda akan dialihkan ke `/login` dan memverifikasi halaman yang salah.
- Cari juga teks banner `"API key belum diisi"`; kalau muncul, kuncinya tidak terbawa ke bundel.
- Untuk WebGL di Chromium headless, jalankan dengan `--use-gl=swiftshader`.

---

## 7. Runbook operasional

### Deploy ulang setelah tim push

```bash
$BASE/transconnect-deploy/deploy.sh
```

Skrip ini: tarik `main` → build → `up -d` → reload nginx → terapkan skema → muat layer BRT bila
hilang → jalankan health check lengkap dan **keluar dengan kode bukan-nol** bila ada yang gagal.

`deploy.sh` memakai `git pull --rebase --autostash`, **bukan** `--ff-only`, supaya commit
sisi-server tetap hidup di atas push tim. Kalau Anda menyesuaikan skrip untuk server baru, ubah juga
daftar URL di bagian health check — semuanya masih menunjuk `transconnect.ownmap.id`.

### Melihat log

```bash
docker compose -f $BASE/transconnect-deploy/docker-compose.yml logs -f transconnect-backend
docker logs -f transconnect-api          # detektor
docker logs --tail 200 reverse-proxy     # error 502/upstream
```

### Mengganti bobot model

Bobot di-mount, jadi tidak perlu build ulang:

```bash
cp model-baru.pt $BASE/transconnect-deploy/yolo-best.pt
cd $BASE/transconnect-deploy && docker compose up -d --no-deps transconnect-api
docker logs transconnect-api 2>&1 | grep "Model loaded"
```

### Membersihkan berkas unggahan yatim

`upload_cleanup.py` menghapus berkas unggahan yang tidak lagi dirujuk baris mana pun. Tersedia juga
mode CLI yang memindahkan (bukan menghapus) ke direktori karantina, default **dry-run**:

```bash
docker exec transconnect-backend python -m app.services.upload_cleanup            # laporan saja
docker exec transconnect-backend python -m app.services.upload_cleanup --apply    # jalankan
```

---

## 8. Pitfall yang sudah pernah menggigit

Semuanya sudah terjadi di produksi; jangan mengulanginya.

1. **Bind-mount satu berkas tidak melihat penulisan atomik.** Editor/alat yang mengganti berkas lewat
   temp+rename menukar inode, sedangkan bind mount tetap terikat inode lama. `docker exec ... cat`
   masih menampilkan isi lama, dan `nginx -s reload` pun tidak menolong. Pakai
   `docker compose up -d --force-recreate`, lalu bandingkan `md5sum` host vs dalam container.

2. **Jaringan `external` tidak dibuat otomatis.** `docker compose up` gagal dengan
   "network ... not found" bila `proxy-net` / `transconnect-smarang_default` belum ada. Jalankan §4.

3. **`NEXT_PUBLIC_*` itu build-time.** Kunci basemap atau base URL API yang salah tidak bisa
   diperbaiki dengan mengubah environment container — harus lewat `build.args` dan build ulang.

4. **nginx meng-cache IP container.** `proxy_pass` dengan nama host literal di-resolve sekali saat
   start; setelah container dibuat ulang, seluruh subdomain 502 sampai nginx reload. Karena itu blok
   di §5.9 memakai `resolver 127.0.0.11` + `set $var` (bentuk variabel). Untuk `location
   = /api/detect` bentuk statis dipertahankan, jadi reload setelah recreate tetap wajib.

5. **Container tidak bisa menjangkau layanan yang berjalan di host.** Firewall host memblokir trafik
   container → host sepenuhnya. Semua layanan **harus** dijalankan sebagai container di `proxy-net`.
   `uvicorn`/`next start` di host akan selalu 502, sekeras apa pun Anda mengikat alamatnya.

6. **PostGIS ter-publish ke `0.0.0.0:5432`.** Compose repo tim memakai `"5432:5432"`, artinya
   database bisa dijangkau dari internet kalau firewall mengizinkan. Sebaiknya ubah ke
   `127.0.0.1:5432:5432`. Ini juga sumber tabrakan port bila server menjalankan Postgres lain.

7. **Kolom ORM yang hilang = deploy hijau tapi API mati.** Menambah kolom pada model SQLAlchemy
   membuat ORM menyeleksi kolom itu *berdasarkan nama* di setiap query, sehingga kolom yang hilang
   membuat endpoint 500 — sementara semua halaman tetap 200 dan skrip deploy melaporkan sukses. Ini
   alasan §5.6 ada, dan alasannya `deploy.sh` menyimpan daftar periksa kolomnya.

8. **`load_to_postgis.py` menghapus constraint.** Skrip itu memakai `if_exists="replace"`, jadi
   setiap kali dijalankan ulang, `UNIQUE(halte_id)` hilang dan FK `citizen_report` rusak — backend
   gagal start (`InvalidForeignKeyError`). Karena itu penambahan constraint harus ada di `deploy.sh`,
   bukan dilakukan sekali manual.

9. **`geopandas.to_postgis()` tidak membuat unique constraint sama sekali.** Muncul sebagai
   `InvalidForeignKeyError: there is no unique constraint matching given keys for referenced table
   "halte_survey"`.

10. **pip 26.x menghapus `--index-strategy`.** Perintah instalasi yang didokumentasikan repo
    detektor (`--extra-index-url ... --index-strategy unsafe-best-match`) langsung ditolak, dan
    menaikkan versi pip tidak mengembalikannya. Pasang torch dari indeks CPU secara eksplisit
    sebelum `-r requirements.txt`, seperti di `yolo.Dockerfile`.

11. **`import cv2` gagal di `python:3.11-slim`.** ultralytics mengimpor OpenCV yang butuh `libGL`.
    Pasang `libgl1 libglib2.0-0` di image detektor.

12. **Checkpoint tidak mau dimuat tanpa shim `pathlib`.** Berkas `.pt` ini di-pickle di Linux dan
    mereferensikan `pathlib._local` (backport era Python 3.7). Tanpa `sitecustomize.py`, errornya
    justru menyesatkan: "appears to be an Ultralytics YOLOv5 model ... NOT forward compatible",
    padahal modelnya tidak rusak. Shim dan `PYTHONPATH=/app` sudah ada di folder `detector/` repo.

13. **`api_yolo.py` memang tidak bisa melayani checkpoint ini.** Ia memanggil
    `ultralytics.YOLO()`, yang gagal dua cara berbeda dan keduanya menyesatkan. Pembungkus produksi
    yang benar ada di `detector/api_server.py` dan memakai `DetectMultiBackend` — loader milik
    YOLOv5 sendiri.

14. **Menaikkan batas unggah harus dilakukan di dua tempat.** Batas per-berkas ada di backend
    (`MAX_PHOTOS=5`, `MAX_PHOTO_BYTES=15 MB`, `MAX_VIDEO_BYTES=25 MB`); batas per-request ada di
    nginx (`client_max_body_size 120M`). Permintaan yang melewati batas nginx ditolak dengan halaman
    HTML, sehingga pengguna tidak melihat pesan "foto maksimal 15 MB" dari API.

15. **Backend butuh ±30 detik saat start** untuk membangun graf pejalan kaki osmnx. Health check yang
    hanya `sleep 10` akan melaporkan 502 di semua endpoint dan tampak seperti deploy gagal. Lakukan
    polling, jangan tidur tetap.

16. **Akun dashboard masih hardcoded** di
    `frontend/src/lib/useDishubAuth.ts` (`DISHUB#1` / `DISHUB#1jaya`), disimpan sebagai flag di
    `localStorage` — bukan autentikasi sungguhan. **Ganti sebelum dipakai di server publik mana pun.**
    Tidak ada sesi server, tidak ada JWT, tidak ada kedaluwarsa.

---

## 9. Checklist go-live

- [ ] A record `<DOMAIN>` sudah mengarah ke server baru (`dig +short <DOMAIN>`)
- [ ] Port 80/443 terbuka; port 5432 ditutup atau di-bind ke loopback
- [ ] `docker network ls` memuat `proxy-net` dan `transconnect-smarang_default`
- [ ] `load_to_postgis.py` melaporkan **42 halte**
- [ ] Layer BRT memuat **673 / 185 / 34** baris, SRID 4326
- [ ] `md5sum yolo-best.pt` cocok dengan model yang disetujui
- [ ] Log detektor memuat "9 classes"; `yolo_healthcheck.py` melaporkan "inference ok"
- [ ] Semua URL health check mengembalikan 200; dua rute POST-only mengembalikan 405
- [ ] `/api/v1/halte-survey` mengembalikan 42 fitur; `/api/v1/brt-network` 707 fitur
- [ ] Peta tergambar dengan basemap MAPID (dicek dengan browser, bukan hanya `curl`)
- [ ] HTTPS valid dan perpanjangan otomatis terjadwal
- [ ] Kredensial dashboard default sudah diganti
- [ ] `.env` ber-`chmod 600` dan tidak ada rahasia yang ter-commit
