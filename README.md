# PCnerd ID — AI PC Builder Indonesia

<div align="center">

**Rakit PC impian Anda dengan bantuan AI. Rekomendasi komponen cerdas, prediksi performa berbasis data benchmark nyata, dan analisis naratif dari LLM.**

</div>

## Fitur Utama

- **Rekomendasi Komponen Cerdas** — Distribusi budget otomatis berdasarkan tier dan kebutuhan (Gaming, Editing, Office, dll).
- **Prediksi Performa Benchmark** — FPS real dari 20+ GPU (RTX 4090 sampai GT 730) di resolusi 1080p/1440p/4K, di-compile dari TechPowerUp dan review hardware.
- **Analisis AI (LLM)** — Narasi dan analisis build via OpenAI (`gpt-4o-mini`), Anthropic (`claude-3-haiku`), atau LM Studio lokal (Mistral 7B). Streaming karakter per karakter ke UI.
- **AI Chat / Q&A** — Tanya jawab interaktif tentang komponen PC, perbandingan hardware, rekomendasi, langsung dari homepage. Intent detection otomatis (tanya vs build vs off-topic).
- **Conversation Context** — Riwayat percakapan dikirim ke LLM, follow-up question paham konteks diskusi sebelumnya.
- **Multi-factor Component Scoring** — Setiap komponen discor: compatibility 30%, performance 40%, value 20%, reliability 10%. Ditampilkan sebagai bar + tooltip breakdown.
- **Upgrade Impact Calculator** — FPS uplift konkret (current→new FPS) dengan bar visual merah/hijau untuk tiap kandidat GPU/CPU/RAM di modal ganti komponen.
- **Bottleneck Analysis** — Visual gauge (CPU↔Seimbang↔GPU) dengan rasio numerik, zona seimbang per resolusi.
- **Filter/Sort di Modal Ganti** — Search by nama/brand/socket/ramType, sort by harga/nama, brand filter.
- **RAM Performance Impact** — Perbandingan speed, kapasitas, gaming & productivity% vs DDR4-3200 baseline.
- **Deteksi Bottleneck** — Analisis keseimbangan CPU vs GPU dengan rasio harga.
- **Perhitungan TDP & PSU Safety** — Estimasi daya dan cek kecukupan PSU.
- **Scraper Harga Tokopedia** — Sinkronisasi harga real-time dari Tokopedia via GraphQL API.
- **Admin Dashboard** — Manajemen komponen (CRUD), kelola admin, trigger sync harga, pengaturan LLM (server URL, model selection, test connection).
- **Multi-resolusi** — 1080p, 1440p, 4K.
- **Mobile Responsive** — Layout adaptif, hover actions diganti tap untuk touch device.
- **Security** — Rate limiter (10 req/min/IP) di AI prompt, prompt injection detection (15 pattern regex + LLM validation), output sanitization (XSS filter, truncation), JWT auth admin.

## Tech Stack

| Layer         | Teknologi                                                        |
| ------------- | ---------------------------------------------------------------- |
| **Framework** | Next.js 16 (Turbopack) + React 19 + TypeScript 6 (strict)        |
| **Styling**   | Tailwind CSS v4 + Framer Motion + Lucide React                   |
| **Database**  | SQLite via Prisma 7 + libSQL                                     |
| **Auth**      | JWT (httpOnly cookie) + bcryptjs, role-based (superadmin/admin)  |
| **AI / LLM**  | OpenAI (`gpt-4o-mini`), Anthropic (`claude-3-haiku`), LM Studio (Mistral 7B, Llama, dll) |
| **Scraper**   | Fetch-based GraphQL ke Tokopedia API                             |
| **CI/CD**     | GitHub Actions (typecheck → lint → format → test → build)        |

## Panduan Memulai

### Prasyarat

- Node.js >= 18
- npm

### Instalasi

```bash
git clone https://github.com/initHD3v/PCnerd.git
cd PCnerd
npm install
```

### Konfigurasi Environment

Buat file `.env` dari template:

```bash
cp .env.example .env
```

Konfigurasi minimum:

```
DATABASE_URL="file:./dev.db"
JWT_SECRET="random-secret-min-32-karakter"
```

Opsional (untuk fitur LLM jarak jauh):

```
OPENAI_API_KEY="sk-..."
# atau
ANTHROPIC_API_KEY="sk-ant-..."
```

Atau gunakan LM Studio lokal (tanpa API key):
1. Buka LM Studio → Local Inference Server → http://127.0.0.1:1234
2. Load model (Mistral 7B, Llama 3.2 3B, dll)
3. Start server
4. Di Admin → LLM Settings, isi URL server, test connection, pilih model

### Setup Database

```bash
npx prisma migrate dev   # terapkan migrasi
npm run seed              # seed 424 komponen hardware + admin default
```

Admin default: `admin` / `admin123`

### Menjalankan

```bash
npm run dev
```

Akses di `http://localhost:3000`.

## Cara Kerja AI

### 1. Intent Detection (`POST /api/ai/build-prompt`)

Satu endpoint menangani dua mode:

- **Build Request** — Jika user menyebut budget + purpose → generate 3 tier build (cheapest/balanced/performance) + redirect ke hasil
- **General Question** — Jika user bertanya tentang komponen → jawab via LLM, tampilkan di chat bubble
- **Off-topic** — Rule-based filter (14 pattern) + LLM validation. Jika tidak PC-related → tolak dengan pesan ramah
- **Prompt Injection Defense** — 15 regex pattern deteksi + LLM diinstruksikan tolak perubahan perintah. Output disanitasi (XSS, truncation).

### 2. Distribusi Budget (`getExpertDistribution`)

Rule-based decision tree berdasarkan budget dan purpose:

| Budget Tier | GPU | CPU | MB  | RAM | Storage | PSU | Case |
| ----------- | --- | --- | --- | --- | ------- | --- | ---- |
| < Rp 8jt    | 20% | 35% | 12% | 10% | 8%      | 8%  | 7%   |
| Rp 8-18jt   | 40% | 25% | 10% | 8%  | 7%      | 6%  | 4%   |
| Rp 18-35jt  | 48% | 22% | 9%  | 7%  | 6%      | 5%  | 3%   |
| >= Rp 35jt  | 55% | 18% | 8%  | 7%  | 6%      | 3%  | 3%   |

Penyesuaian purpose (Editing/Rendering → +10% CPU, -15% GPU), termasuk peripheral 15%.

### 3. Multi-factor Component Scoring

Setiap komponen di-scoring saat build digenerate:

| Faktor        | Bobot | Metrik                                                |
| ------------- | ----- | ----------------------------------------------------- |
| Compatibility | 30%   | Kecocokan socket, RAM type, form factor, TDP, PSU     |
| Performance   | 40%   | FPS vs budget-tier, CPU PassMark, RAM speed           |
| Value         | 20%   | Price/performance ratio dalam tier yang sama           |
| Reliability   | 10%   | Brand reputation, warranty length                      |

### 4. Prediksi Performa (`predictPerformance`)

Dua mode:

1. **Benchmark Lookup** — Jika GPU dikenal di database benchmark, tampilkan FPS real:
   - Data dari 23 GPU (NVIDIA + AMD)
   - Per resolusi: 1080p, 1440p, 4K
   - Dua kategori: AAA Games dan E-Sports

2. **Price-based Fallback** — Jika GPU tidak dikenal, estimasi dari harga.

### 5. Upgrade Impact Calculator

- **GPU/CPU**: FPS uplift dihitung dari selisih FPS benchmark current vs candidate
- **RAM**: Perbandingan speed & kapasitas terhadap DDR4-3200 baseline
- Ditampilkan sebagai bar merah/hijau + label FPS di modal ganti komponen

### 6. Bottleneck Analysis

- Rasio harga CPU:GPU → visual gauge
- Zona seimbang bervariasi per resolusi:
  - 1080p: lebih berat GPU
  - 1440p: seimbang
  - 4K: lebih berat GPU

### 7. Narasi LLM (Streaming)

- **Server-side**: Generate 3 tier build paralel (tanpa LLM), lalu narrative sequential (2s delay antar model untuk LM Studio stability)
- **Client-side**: Streaming SSE — karakter per karakter real-time
- **Cache**: Narrative di-cache per build hash
- **Fallback**: Jika LLM error/tidak ada key, pakai template narrative

### 8. Scraper Harga (`POST /api/admin/sync`)

- Fetch GraphQL ke `gql.tokopedia.com/graphql/GetSearchProduct`
- Fallback query: strip brand prefix, lalu cari model
- Progress tracking via `SyncJob` + `SyncPanel` UI
- Delay 1.5s antar item

## Struktur Proyek

```
src/
├── app/
│   ├── api/
│   │   ├── admin/              # CRUD komponen, auth admin, sync harga, settings LLM
│   │   ├── ai/build-prompt     # Intent detection → Q&A atau build recommendation
│   │   └── ai/narrative        # LLM narrative endpoint (streaming SSE)
│   ├── build/
│   │   ├── page.tsx            # Build form wizard
│   │   └── results/            # Build results + streaming AI analysis
│   ├── admin/                  # Admin dashboard SPA
│   ├── page.tsx                # Landing page + AI Chat/Q&A
│   ├── layout.tsx              # Root layout + flash-prevention script
│   └── loading.tsx             # Route transition loading
├── components/
│   ├── build/BuildForm.tsx     # Multi-step build form
│   ├── AiLoadingOverlay.tsx    # Full-screen loading overlay
│   └── SyncPanel.tsx           # Floating sync progress
├── data/
│   └── benchmarks.ts           # GPU FPS benchmark data (23 GPU)
├── lib/
│   ├── llm.ts                  # LLM client (OpenAI + Anthropic + LM Studio)
│   ├── recommendation-engine.ts  # Core AI engine
│   ├── build-service.ts        # Build orchestration
│   ├── auth.ts                 # JWT + bcrypt auth
│   ├── rate-limit.ts           # Shared rate limiter utility
│   ├── prisma.ts               # Prisma client
│   └── scraper/                # Tokopedia scraper
└── proxy.ts                    # Next.js middleware (admin auth)
```

## Scripts

| Command             | Deskripsi                    |
| ------------------- | ---------------------------- |
| `npm run dev`       | Dev server (Turbopack)       |
| `npm run build`     | Build production             |
| `npm run lint`      | ESLint                       |
| `npm run typecheck` | TypeScript check             |
| `npm run test`      | Vitest                       |
| `npm run format`    | Prettier                     |
| `npm run seed`      | Seed database (424 komponen) |

## API Endpoints

| Method       | Endpoint                              | Auth | Deskripsi                          |
| ------------ | ------------------------------------- | ---- | ---------------------------------- |
| POST         | `/api/recommendation`                 | -    | Generate build recommendation      |
| POST         | `/api/ai/build-prompt`                | -    | Intent detection + Q&A + build     |
| POST         | `/api/ai/narrative`                   | -    | Generate LLM narrative (streaming) |
| GET          | `/api/admin/components`               | JWT  | List semua komponen                |
| POST         | `/api/admin/components`               | JWT  | Tambah komponen                    |
| PATCH        | `/api/admin/components/[id]`          | JWT  | Edit komponen                      |
| DELETE       | `/api/admin/components/[id]`          | JWT  | Hapus komponen                     |
| POST         | `/api/admin/sync`                     | JWT  | Trigger sync harga Tokopedia       |
| GET/PATCH    | `/api/admin/settings`                 | JWT  | Baca/update pengaturan LLM         |
| POST         | `/api/admin/settings/test-llm`        | JWT  | Test koneksi LM Studio             |
| POST         | `/api/admin/auth/login`               | -    | Login admin                        |
| POST         | `/api/admin/auth/logout`              | -    | Logout                             |
| GET          | `/api/admin/auth/me`                  | -    | Cek session                        |
| POST         | `/api/admin/auth/change-password`     | JWT  | Ganti password                     |
| POST         | `/api/admin/auth/forgot-password`     | -    | Lupa password                      |
| POST         | `/api/admin/auth/reset-password`      | -    | Reset password                     |
| GET/POST     | `/api/admin/admins`                   | JWT  | List/tambah admin                  |
| PATCH/DELETE | `/api/admin/admins/[id]`              | JWT  | Edit/hapus admin                   |

## Keamanan

| Lapisan                  | Implementasi                                                               |
| ------------------------ | -------------------------------------------------------------------------- |
| **Admin Auth**           | JWT httpOnly cookie `bw_admin_token`, dua role (superadmin/admin)          |
| **Rate Limit**           | 5 login attempt per 15 menit per IP + 10 AI prompt per menit per IP       |
| **Prompt Injection**     | 15 regex pattern + LLM validation. System prompt diperkuat tolak override  |
| **Output Sanitization**  | XSS filter (script/iframe/onclick), truncation 4000 chars                  |
| **Off-topic Filter**     | 14 rule-based pattern + LLM-based validation                               |
| **Flash Prevention**     | Inline script di `<body>` sebelum React hydrasi untuk cegah theme flash    |

## Catatan Penting

- **Database SQLite** (`dev.db`) di-commit — jangan dihapus.
- **API Key LLM** opsional. Tanpa API key, fitur Q&A dan narrative tetap jalan pakai LM Studio lokal atau template fallback.
- **LM Studio**: Untuk lokal LLM, pakai non-reasoning model (Mistral 7B, Llama 3.2 3B). Reasoning model (Qwen3) terlalu lambat + token habis untuk thinking.
- **Admin Auth** via JWT httpOnly cookie. Login di `/admin`.
- **Rate Limit** berlaku untuk login (5/15menit/IP) dan AI prompt (10/menit/IP).
- **Tidak ada ML model** — "AI" saat ini adalah rule engine + LLM API call + benchmark lookup.
- **Mobile**: Layout responsif, hover actions otomatis jadi tap di touch device.

## Lisensi

Proyek ini bersifat privat.
