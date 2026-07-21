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
- Requires `x-api-key` header matching `ADMIN_API_KEY` env var.
- Admin page (`/admin`) shows a login form if not authenticated; key stored in `sessionStorage`.
- Set `ADMIN_API_KEY` in `.env` (`.env.example` included — copy and change for production).

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
