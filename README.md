# PCnerd ID — AI PC Builder Indonesia

<div align="center">

**Rakit PC impian Anda dengan bantuan AI. Rekomendasi komponen cerdas, prediksi performa berbasis data benchmark nyata, dan analisis naratif dari LLM.**

</div>

## Fitur Utama

- **Rekomendasi Komponen Cerdas** — Distribusi budget otomatis berdasarkan tier dan kebutuhan (Gaming, Editing, Office, dll).
- **Prediksi Performa Benchmark** — FPS real dari 20+ GPU (RTX 4090 sampai GT 730) di resolusi 1080p/1440p/4K, di-compile dari TechPowerUp dan review hardware.
- **Analisis AI (LLM)** — Narasi dan analisis build yang dinamis dan kontekstual via OpenAI GPT-4o-mini atau Anthropic Claude 3 Haiku. Jujur, tidak selalu positif.
- **Upgrade Cerdas** — Deteksi komponen yang layak diupgrade dengan perbandingan harga 1-1.5x.
- **Deteksi Bottleneck** — Analisis keseimbangan CPU vs GPU dengan rasio harga.
- **Perhitungan TDP & PSU Safety** — Estimasi daya dan cek kecukupan PSU.
- **Scraper Harga Tokopedia** — Sinkronisasi harga real-time dari Tokopedia via GraphQL API.
- **Admin Dashboard** — Manajemen komponen (CRUD), kelola admin, trigger sync harga.
- **Multi-resolusi** — 1080p, 1440p, 4K.

## Tech Stack

| Layer | Teknologi |
|---|---|
| **Framework** | Next.js 16 (Turbopack) + React 19 + TypeScript 6 (strict) |
| **Styling** | Tailwind CSS v4 + Framer Motion + Lucide React |
| **Database** | SQLite via Prisma 7 + libSQL |
| **Auth** | JWT (httpOnly cookie) + bcryptjs, role-based (superadmin/admin) |
| **AI / LLM** | OpenAI API (`gpt-4o-mini`) atau Anthropic API (`claude-3-haiku`) |
| **Scraper** | Fetch-based GraphQL ke Tokopedia API |
| **CI/CD** | GitHub Actions (typecheck → lint → format → test → build) |

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

Opsional (untuk fitur LLM):
```
OPENAI_API_KEY="sk-..."
# atau
ANTHROPIC_API_KEY="sk-ant-..."
```

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

### 1. Distribusi Budget (`getExpertDistribution`)

Rule-based decision tree berdasarkan budget dan purpose:

| Budget Tier | GPU | CPU | MB | RAM | Storage | PSU | Case |
|---|---|---|---|---|---|---|---|
| < Rp 8jt | 20% | 35% | 12% | 10% | 8% | 8% | 7% |
| Rp 8-18jt | 40% | 25% | 10% | 8% | 7% | 6% | 4% |
| Rp 18-35jt | 48% | 22% | 9% | 7% | 6% | 5% | 3% |
| >= Rp 35jt | 55% | 18% | 8% | 7% | 6% | 3% | 3% |

Penyesuaian purpose (Editing/Rendering → +10% CPU, -15% GPU), termasuk peripheral 15%.

### 2. Prediksi Performa (`predictPerformance`)

Dua mode:

1. **Benchmark Lookup** — Jika GPU dikenal di database benchmark, tampilkan FPS real:
   - Data dari 23 GPU (NVIDIA + AMD)
   - Per resolusi: 1080p, 1440p, 4K
   - Dua kategori: AAA Games dan E-Sports
   - Contoh: `RTX 4090 → 200 FPS 1080p · 160 FPS 1440p · 95 FPS 4K`

2. **Price-based Fallback** — Jika GPU tidak dikenal, estimasi dari harga.

### 3. Narasi LLM (`generateNarrativeWithLLM`)

- Server-side: saat build digenerate, panggil `/api/ai/narrative`
- Prompt berisi seluruh komponen + budget + purpose
- LLM mengembalikan JSON: `{ general, detailed, strengths[], weaknesses[] }`
- Client-side upgrades: template narrative instant, lalu background refresh via API
- Fallback: jika API key tidak ada atau error, pakai template tanpa error

### 4. Scraper Harga (`POST /api/admin/sync`)

- Fetch GraphQL ke `gql.tokopedia.com/graphql/GetSearchProduct`
- Fallback query: strip brand prefix, lalu cari model
- Progress tracking via `SyncJob` + `SyncPanel` UI
- Delay 1.5s antar item

### 5. Upgrade Finder

Cari komponen dengan harga 1-1.5x dari part terpasang:
- GPU, CPU, RAM, Storage

## Struktur Proyek

```
src/
├── app/
│   ├── api/
│   │   ├── admin/         # CRUD komponen, auth admin, sync harga
│   │   ├── ai/narrative   # LLM narrative endpoint
│   │   └── recommendation  # Build recommendation endpoint
│   ├── build/
│   │   ├── page.tsx        # Build form wizard
│   │   └── results/       # Build results + AI analysis
│   ├── admin/             # Admin dashboard SPA
│   ├── page.tsx           # Landing page
│   └── layout.tsx         # Root layout
├── components/
│   ├── build/BuildForm.tsx # Multi-step build form
│   └── SyncPanel.tsx      # Floating sync progress
├── data/
│   └── benchmarks.ts      # GPU FPS benchmark data (23 GPU)
├── lib/
│   ├── llm.ts             # LLM client (OpenAI + Anthropic)
│   ├── recommendation-engine.ts  # Core AI engine
│   ├── build-service.ts   # Build orchestration
│   ├── auth.ts            # JWT + bcrypt auth
│   ├── prisma.ts          # Prisma client
│   └── scraper/           # Tokopedia scraper
└── proxy.ts               # Next.js middleware (auth)
```

## Scripts

| Command | Deskripsi |
|---|---|
| `npm run dev` | Dev server (Turbopack) |
| `npm run build` | Build production |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript check |
| `npm run test` | Vitest |
| `npm run format` | Prettier |
| `npm run seed` | Seed database (424 komponen) |

## API Endpoints

| Method | Endpoint | Auth | Deskripsi |
|---|---|---|---|
| POST | `/api/recommendation` | - | Generate build recommendation |
| POST | `/api/ai/narrative` | - | Generate LLM narrative untuk build |
| GET | `/api/admin/components` | JWT | List semua komponen |
| POST | `/api/admin/components` | JWT | Tambah komponen |
| PATCH | `/api/admin/components/[id]` | JWT | Edit komponen |
| DELETE | `/api/admin/components/[id]` | JWT | Hapus komponen |
| POST | `/api/admin/sync` | JWT | Trigger sync harga Tokopedia |
| POST | `/api/admin/auth/login` | - | Login admin |
| POST | `/api/admin/auth/logout` | - | Logout |
| GET | `/api/admin/auth/me` | - | Cek session |
| POST | `/api/admin/auth/change-password` | JWT | Ganti password |
| POST | `/api/admin/auth/forgot-password` | - | Lupa password |
| POST | `/api/admin/auth/reset-password` | - | Reset password |
| GET/POST | `/api/admin/admins` | JWT | List/tambah admin |
| PATCH/DELETE | `/api/admin/admins/[id]` | JWT | Edit/hapus admin |

## Catatan Penting

- **Database SQLite** (`dev.db`) di-commit — jangan dihapus.
- **API Key LLM** opsional. Tanpa API key, semua fitur tetap jalan (narrative pakai template, FPS pakai price-based fallback).
- **Admin Auth** via JWT httpOnly cookie `bw_admin_token`. Login admin di `/admin`.
- **Rate Limit** login: 5 attempt per 15 menit per IP.
- **Tidak ada ML model** — "AI" saat ini adalah rule engine + LLM API call + benchmark lookup.

## Lisensi

Proyek ini bersifat privat.
