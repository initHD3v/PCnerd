# PCnerd ID — Agent Guide

## Stack

- **Next.js 16** (Turbopack) + **React 19** + **TypeScript 6** (strict)
- **Tailwind CSS v4** (class-based dark mode via `ThemeProvider`)
- **Prisma 7** + **SQLite** via `@libsql/client` + `@prisma/adapter-libsql`
- **Playwright** for Tokopedia price scraping
- **Framer Motion**, **Lucide React**, **clsx**, **tailwind-merge**
- **ESM** (`"type": "module"`)
- Path alias: `@/*` → `./src/*`

## Commands

| Command    | Script                                |
| ---------- | ------------------------------------- |
| Dev server | `npm run dev`                         |
| Build      | `npm run build`                       |
| Lint       | `npm run lint` (ESLint 9 flat config) |
| Typecheck  | `npm run typecheck` (`tsc --noEmit`)  |
| Test       | `npm run test` (Vitest)               |
| Format     | `npm run format` (Prettier)           |
| Seed DB    | `npm run seed`                        |

- `NODE_OPTIONS='--no-deprecation'` is required before `next dev` and `seed` to suppress Prisma deprecation warnings.
- Use `node --loader ts-node/esm` for any ad-hoc TS scripts (matches the seed pattern).
- `npm run seed` generates hundreds of dummy `HardwareComponent` records into SQLite.
- Pre-commit validation pass: `typecheck → lint → format:check → test → build`.

## AI Engine

- **No ML models yet.** The "AI" consists of:
  1. **Rule-based budget distribution** (`getExpertDistribution` in `recommendation-engine.ts`)
  2. **LLM-powered narrative** (`src/lib/llm.ts` + `POST /api/ai/narrative`) — supports OpenAI (`gpt-4o-mini`) and Anthropic (`claude-3-haiku`). Reads `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` from env. Falls back to template on failure or missing key.
  3. **Benchmark-based FPS** (`src/data/benchmarks.ts`) — real FPS data for 20+ GPU models at 1080p/1440p/4K for AAA and E-Sports. Falls back to price-based lookup if GPU not found.
  4. **Template narrative** (`generateNarrative`) — used client-side for instant upgrade feedback; LLM narrative loads asynchronously via `/api/ai/narrative`.

- `generateNarrativeWithLLM()` in `recommendation-engine.ts` is called server-side in `build-service.ts`.
- Client-side upgrades call `/api/ai/narrative` in the background after updating with template fallback.
- No API key = transparent fallback to template/price-based, no errors.
- `.env` requires `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` for LLM features.

## CI

- GitHub Actions workflow at `.github/workflows/ci.yml` runs on push/PR to `main`:
  `npm ci → typecheck → lint → format:check → test → build`

## Database

- SQLite database at `dev.db` (committed, not in `.gitignore` — do not delete).
- Prisma schema: `prisma/schema.prisma` (4 models: `HardwareComponent`, `Build`, `BuildComponent`, `SyncJob`).
- Prisma config: `prisma.config.ts` (separate from `schema.prisma`).
- Datasource URL from `DATABASE_URL` in `.env`: `"file:./dev.db"`.
- Migrations directory: `prisma/migrations/` (initial migration `0_init` already applied).
- After schema changes: `npx prisma migrate dev --name <name>` (creates + applies migration).
- Prisma client is generated into `node_modules/.prisma/client` (default). Only re-generate if schema changes.

## Admin Auth

- API routes under `/api/admin/*` are protected via `src/proxy.ts` (Next.js 16 Proxy/Middleware).
- Uses JWT httpOnly cookie (`bw_admin_token`), not API key.
- Admin page (`/admin`) shows a login form if not authenticated; session stored in cookie.
- Two roles: `superadmin` (full access) and `admin` (components + sync only).
- Rate limit: 5 login attempts per 15 minutes per IP.
- `.env` requires `JWT_SECRET` (see `.env.example`).

## Architecture

- **App Router** (`src/app/`) with routes:
  - `/` — landing page
  - `/build` → `/build/results` — multi-step PC builder wizard
  - `/admin` — CRUD dashboard for components + price sync trigger (auth-protected)
  - `/api/recommendation` (POST) — calls `src/lib/build-service.ts` → `src/lib/recommendation-engine.ts`
  - `/api/admin/components` — CRUD for hardware components
  - `/api/admin/sync` (POST) — triggers Playwright Tokopedia scraper
- API routes live in standard Next.js App Router `route.ts` files.

## Scraper

- Standalone test: `node --loader ts-node/esm test-scraper.ts`
- Uses Playwright Chromium headless to scrape Tokopedia.
- Scraped data flows through `src/lib/scraper/`.

## Codegen / Artifacts

- `.next/` — Next.js build output (gitignored).
- `dev.db` — SQLite database (checked in — do not delete).
- `prisma/migrations/` — migration history (checked in).

## Changelog — 23 Jul 2026

### Done

- [x] **Local LLM integration (LM Studio)** — added `AppSetting` model, settings API (GET/PATCH/test-llm), and LM Studio provider to `llm.ts`. Users can connect to any OpenAI-compatible local server via admin LLM Settings.
- [x] **LLM Settings UI redesign** — clean 3-step flow: input server URL → Test Connection → pick model from available list → save.
- [x] **Increased `max_tokens` 1024 → 4096** — reasoning models (Qwen3) previously spent all tokens on "thinking", outputting empty/truncated JSON.
- [x] **Sequential LLM narratives** — `generateTieredBuilds` now skips LLM during parallel build generation, then calls narratives sequentially with 2s delay to avoid LM Studio Channel Error.
- [x] **Animated loading overlay** — full-screen blur overlay with spinning conic ring, pulsing CPU icon, cycling status messages, and animated dots during build generation.
- [x] **Results page loading screen** — matching animated ring + dots while reading from localStorage.
- [x] **Repo made public** — `initHD3v/PCnerd` is now public on GitHub.

### Issues Encountered

- **Qwen3-8B (reasoning model)**: terlalu lama (~80s reasoning per request) + token habis untuk berpikir, output JSON kosong/kepotong. Solusi: ganti ke non-reasoning model (Mistral 7B).
- **LM Studio Channel Error**: Mistral 7B dengan Parallel=4 + Context=8192 kehabisan memory di M1 Pro 16GB. Belum terverifikasi fix Parallel=1 + Context=4096. Alternatif: Llama 3.2 3B atau Ollama.
- **Prisma stale client**: setelah add model AppSetting, perlu `npx prisma generate` + restart dev server.

### Files Touched

| File                                           | Change                                                                     |
| ---------------------------------------------- | -------------------------------------------------------------------------- |
| `prisma/schema.prisma`                         | Added `AppSetting` model                                                   |
| `prisma/migrations/`                           | New migration `add_app_setting`                                            |
| `src/lib/llm.ts`                               | Added LM Studio provider, DB-backed `detectConfig()`, increased max_tokens |
| `src/lib/build-service.ts`                     | Sequential narrative generation with delay                                 |
| `src/lib/recommendation-engine.ts`             | Passes benchmark FPS data in LLM prompt                                    |
| `src/app/admin/page.tsx`                       | New LLMSettingsPanel component                                             |
| `src/app/api/admin/settings/route.ts`          | GET/PATCH for LLM settings                                                 |
| `src/app/api/admin/settings/test-llm/route.ts` | Test connection endpoint                                                   |
| `src/app/build/results/page.tsx`               | Enhanced loading animation                                                 |
| `src/components/build/BuildForm.tsx`           | Loading overlay component                                                  |

## Status Pekerjaan

### Selesai (26 Jul 2026)

- [x] **AI quality improvement (7 fixes)**:

| #   | Fix                                                                                          | File                                   |
| --- | -------------------------------------------------------------------------------------------- | -------------------------------------- |
| 1   | Translate `PROMPT_SYSTEM_BUILD` ke Bahasa Indonesia                                          | `src/app/api/ai/build-prompt/route.ts` |
| 2   | Unify narrative system prompt (recommendation-engine + narrative/route)                      | `src/app/api/ai/narrative/route.ts`    |
| 3   | Anthropic streaming `max_tokens: 1024 → 4096`                                                | `src/lib/llm.ts`                       |
| 4   | RAM base FPS 80 → actual GPU FPS from build                                                  | `src/lib/recommendation-engine.ts`     |
| 5   | Remove dead `preferredGpu`/`preferredCpu` prompt fields                                      | `src/app/api/ai/build-prompt/route.ts` |
| 6   | Add `AbortController` timeout to all LLM calls (30s non-streaming, 60s streaming)            | `src/lib/llm.ts`                       |
| 7   | Truncate conversation history to ~4000 chars                                                 | `src/app/api/ai/build-prompt/route.ts` |
| 8   | Greeting detection & simplified PROMPT_QA — "hai" no longer triggers weird security rambling | `src/app/api/ai/build-prompt/route.ts` |

## Price Sync Progress (Tokopedia MCP)

### Done (applied to DB via `tmp/update.ts`)

- **Peripherals (41)**: HEADSET 5/6, SPEAKER 6/8, MOUSE 7/8, KEYBOARD 8/8, MONITOR 11/11.
- **RAM (6)**, **CASE (11)**, **STORAGE (5)**, **COOLER (14)**, **PSU (19)**, **CPU (27)** — all via respective `tmp/findings_*.tsv`.
- **MOTHERBOARD (54)**: ASRock (30) + ASUS (24). Remaining: ASUS TUF, Colorful, Gigabyte, MSI (~154).
- **GPU (213→317)**: ASUS (~83), MSI (~33), Gigabyte (~26), Colorful (~15), Zotac (~11), Palit (8), Galax (6), Sapphire (7), PowerColor (7), ASRock (7). Findings in `tmp/findings_gpu.tsv`. ASUS done via direct matches + same-chip/same-line variant reuse with real source URLs (`tmp/reuse_asus.ts`). MSI RTX + Gigabyte WINDFORCE/GAMING OC + Colorful iGAME ULTRA + Zotac RTX NVIDIA lines largely done via direct matches. Skipped: legacy GT/GTX + AORUS ELITE/Vulcan/EX GAMER premium variants + BATTLE-AX/STORMX/GAMINGPRO non-surfacing & AMD RX lines that rarely surface clean.
- **GPU gen-anyar RTX 5050-5090 (59)**: full grind selesai — `tmp/findings_gpu2.tsv`. ASUS DUAL/PRIME/ROG STRIX/ASTRAL/TUF, MSI GAMING OC/SHADOW/VENTUS/GAMING TRIO, Gigabyte WINDFORCE/GAMING/AERO/AORUS MASTER, Zotac TWIN EDGE/SOLID, Colorful BATTLE AX/iGame Ultra W/Advanced, Galax 1-CLICK OC/EX Gamer, Palit StormX/GamingPro/GameRock. 0 sisa RTX 5050-5090.
- **GPU AMD RX tambahan (47)**: `tmp/findings_gpu_rx.tsv`. ASRock CHALLENGER/Steel Legend (7700 XT/7900 XT/XTX/9060 XT/9070/9070 XT), ASUS TUF/DUAL (7800 XT/7900 XT/XTX/9060 XT/9070 XT), Gigabyte GAMING OC/AORUS ELITE (7600/7800 XT/7900 XT/XTX/9060 XT/9070/9070 XT), MSI MECH 2X 7600, PowerColor FIGHTER/Reaper/Hellhound (7800 XT/9060 XT/9070/9070 XT), Sapphire PULSE (7700 XT/9060 XT).

### Data-Quality Cleanup (12 Aug 2026)

Seed data for GPU/motherboard contained **fabricated SKUs** — impossible brand × chip × line-variant combos (cartesian product). Full audit done; changes applied:

- **GPU**: deleted **32 fabricated** entries — budget chips (GT 730, GT 1030, GTX 1050 Ti, GTX 1650) in high-end lines that never shipped (ASUS ROG STRIX, Gigabyte AORUS ELITE, Colorful iGAME ULTRA/ADVANCED, Zotac TRINITY OC, Galax EX GAMING, Palit GAMINGPRO OC). No build refs. GPU total 632→600, un-synced 421→389.
- **MOTHERBOARD renamed (9) + re-synced (8)** — all validated: corrected names now surface clean on Tokopedia.
  - ASUS ROG STRIX B450M-A→**PRIME B450M-A**, B550M-A→PRIME, B560M-A→PRIME, B760M-A→PRIME, B650M-E WIFI→**TUF GAMING B650M-E WIFI**, B850M-E→**TUF GAMING B850M-E WIFI**, B860M-E→**ASUS B860M-E**, X870E-A→**ROG STRIX X870E-E GAMING WIFI**; Gigabyte X670E GAMING PLUS→**X670 GAMING X AX**.
  - Clean prices applied to 8 via `tmp/findings_mb.tsv` (ASRock/MOTHERBOARD synced 164→172).
- Remaining un-synced mothers (36) are **real products that don't surface on Tokopedia MCP** even with fuzzy/minimal queries (e.g. MSI B760M BAZOOKA, B550M-VC WIFI, ASRock H810M-HDV / X870E PG RIPTIDE / B840M Pro RS, Colorful Battle-Ax). Not fake — just unsyncable via this tool / uncommon in ID.

### Next

- Remaining GPU: **283 un-synced** (600 total, 317 synced): RX 126 (9070 29, 9070 XT 15, 580 20, 6600 15, 7900 XTX 9, 7600 9, 9060 8, 7700 XT 8…), RTX lama 28 (3050/3060/4060/4070/4080/4090 premium), GT/GTX 68, OTHER 16. Mostly RX 580/6600 (2nd-hand/brand aneh) + RTX premium variants that rarely surface clean; optional.
- Remaining mothers: 36 real-but-unsurfaced boards (list in `tmp/dump.ts MOTHERBOARD`); mostly skip.
- Run `node --loader ts-node/esm tmp/update.ts tmp/<findings>.tsv` after each batch.
- `tmp/dump.ts <TYPE>` to query; `ls tmp/ | grep findings` to see applied TSVs.
