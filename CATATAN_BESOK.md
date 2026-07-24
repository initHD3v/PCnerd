# Catatan Pekerjaan Besok — 26 Juli 2026

## ✅ Sudah Selesai (Hari Ini)

### Fix Engine Rekomendasi
- **Office iGPU**: F-suffix CPU mendapat penalty scoring 0.3× untuk Office. Over-budget swap juga skip F-suffix.
- **GPU sampling**: `take: 30` → `take: 100` agar GPU mid-range (RTX 5050, RX 6600, GTX 1660S) tidak kelewatan.
- **Last-resort GPU**: Kalau benar-benar tidak ada CPU dengan iGPU, pasang GT 730 (Rp 756k).
- **Data**: Tambah `Intel Core i3-12100` (non-F) ke seed + database.
- **Threshold**: Low budget advice naik Rp 2.5jt → Rp 4.5jt.

### Laporan
- `test_build_01.md` — 15 test builds lengkap dengan tabel performa.

---

## ⏳ Prioritas Besok

### 1. [High] Streaming narrative — wire SSE ke results page
- `/api/ai/narrative` sudah support SSE
- Tapi hasil build masih pakai template fallback, LLM narrative gak muncul
- Perlu: setelah halaman results load, fetch `/api/ai/narrative` via SSE dan update narrative card

### 2. [High] Upgrade impact calculator di UI
- `getUpgradeImpact()` di recommendation-engine.ts sudah ada
- Tapi belum ditampilkan di halaman results
- Upgrade options (GPU/CPU/RAM) ada di `upgrades[]` response, tinggal di-render

### 3. [Medium] Stabilkan LM Studio + Ollama
- AGENTS.md nyatet: LM Studio Channel Error dengan Mistral 7B (Parallel=4, Context=8192)
- Test dengan Parallel=1 + Context=4096
- Alternatif: install Ollama, pake Llama 3.2 3B
- Update `/api/admin/settings` UI kalau perlu

### 4. [Medium] RAM performance di component scoring
- `findRamImpact()` dan `ramImpact.gamingFpsMultiplier` sudah ada di benchmarks.ts
- Tapi RAM speed belum dipakai di scoring `findBestScored()` — hanya dipakai di `predictPerformance()`
- Tambah: RAM DDR5-6000 dapat score lebih tinggi dari DDR4-3200

### 5. [Low] LLM prompt enrichment
- Data benchmark FPS + PassMark sudah di-inject ke prompt LLM
- Tapi bisa diperkaya dengan: bottleneck analysis, perbandingan harga-performa, saran upgrade
- Cek `generateNarrativeWithLLM()` di recommendation-engine.ts:548

### 6. [Low] Multi-factor component scoring
- AGENTS.md nyebut: skor = compatibility 30% + performance 40% + value 20% + reliability 10%
- Ini sudah diimplementasi di `scoreComponent()` benchmarks.ts:418
- Tapi reliability hanya bedahin premium brand vs non-premium — bisa diperhalus

### 7. [Testing] Verify LM Studio connection flow
- Buka `/admin` → LLM Settings
- Test: input URL → Test Connection → pilih model → save
- Pastikan narrative yang dihasilkan pake LLM, bukan template

---

## Arsitektur File yang Relevan

| File | Fungsi |
|------|--------|
| `src/lib/build-service.ts` | Orchestrator: milih komponen, scoring, budget fix |
| `src/lib/recommendation-engine.ts` | Budget distribution, performance predict, narrative, upgrade impact |
| `src/lib/llm.ts` | LLM provider (OpenAI, Anthropic, LM Studio), detectConfig() |
| `src/data/benchmarks.ts` | GPU/CPU benchmark, RAM impact, scoring, bottleneck analysis |
| `prisma/seed.ts` | Database seeding — 1019 komponen hardware |
| `src/app/build/results/page.tsx` | Halaman hasil build (Client-side, localStorage) |
| `src/app/api/ai/narrative/route.ts` | SSE endpoint untuk LLM narrative |
| `src/app/api/admin/settings/route.ts` | CRUD AppSetting (LLM config) |

---

## Perintah Cepat

```bash
# Dev server (wajib pake --no-deprecation)
NODE_OPTIONS='--no-deprecation' npm run dev

# Typecheck
npm run typecheck

# Lint
npm run lint

# Test build (cek server dulu)
bash /var/folders/5n/jx0_8j9n5875q1g4vg2wm2400000gn/T/opencode/test-builds.sh

# Seed DB (kalau ada perubahan schema)
NODE_OPTIONS='--no-deprecation' npm run seed

# Format
npm run format
```
