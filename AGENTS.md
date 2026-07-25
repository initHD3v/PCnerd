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

| # | Fix | File |
|---|-----|------|
| 1 | Translate `PROMPT_SYSTEM_BUILD` ke Bahasa Indonesia | `src/app/api/ai/build-prompt/route.ts` |
| 2 | Unify narrative system prompt (recommendation-engine + narrative/route) | `src/app/api/ai/narrative/route.ts` |
| 3 | Anthropic streaming `max_tokens: 1024 → 4096` | `src/lib/llm.ts` |
| 4 | RAM base FPS 80 → actual GPU FPS from build | `src/lib/recommendation-engine.ts` |
| 5 | Remove dead `preferredGpu`/`preferredCpu` prompt fields | `src/app/api/ai/build-prompt/route.ts` |
| 6 | Add `AbortController` timeout to all LLM calls (30s non-streaming, 60s streaming) | `src/lib/llm.ts` |
| 7 | Truncate conversation history to ~4000 chars | `src/app/api/ai/build-prompt/route.ts` |
