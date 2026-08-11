# Fitur: Login User + Kuota AI/PCNerd + Sistem Kredit & Pembayaran

> Status: **RENCANA** — dikerjakan besok. Keputusan user sudah dikunci (lihat bagian "Keputusan").

## Ringkasan kebutuhan

1. Pengunjung (tanpa akun): **1x chat AI + 1x rakit PC** gratis → setelah itu diminta login.
2. Terlogin: gratis **3x chat + 3x rakit** → setelah itu diminta **beli kredit**.
3. Login dibuat rapi: **manual (email+password)** saat ini; **Google** disiapkan opsional (aktif bila kredensial tersedia).
4. Kredit untuk lanjut memakai chat & rakit.

## Keputusan (sudah dikunci)

- **Google OAuth**: implement dulu **manual saja**. Tombol "Lanjut dengan Google" hanya tampil jika `NEXT_PUBLIC_GOOGLE_CLIENT_ID` terisi. Helper OAuth + route callback disiapkan tapi inert (notice "belum dikonfigurasi") sampai kredensial ada.
- **Kuota gratis 3x chat + 3x build**: **sekali seumur akun** (tanpa reset bulanan). Kolom `freeChatUsed`/`freeBuildUsed` cap 3.
- **Harga**: 1 chat = **1 kredit**, 1 build = **3 kredit**.
  - Starter 10 kredit (±3 build) = **Rp 15.000**
  - Combo 30 kredit (±10 build) = **Rp 39.000**
  - Pro 100 kredit = **Rp 99.000**
- **Pembayaran**: **mode simulasi** dulu (tanpa gateway). `checkout` auto-kredit + label "Mode Uji". Adapter Midtrans + webhook `notification` disiapkan tetapi mengembalikan "gateway belum dikonfigurasi" hingga `MIDTRANS_SERVER_KEY` terisi.
- **Enforce pengunjung**: **cookie + fingerprint IP**. Tiap konsumsi guest dicatat ke baris `GuestUsage` per `guestId` (UX sisa kuota) **dan** per `ipHash` (hard cap).
- **Narrative** (`/api/ai/narrative`) **gratis** — bagian dari build yang sudah dibayar; cukup rate-limited.

## 1) Prisma (migrasi `add_users_credits`)

Model baru di `prisma/schema.prisma`:

- `User`: `id`, `email? unique`, `passwordHash?`, `name`, `avatar?`, `googleId? unique`, `credits Int = 0`, `freeChatUsed = 0`, `freeBuildUsed = 0`, relasi `creditLogs`, `payments`.
- `GuestUsage`: `id`, `guestId unique`, `ipHash unique`, `chatUsed`, `buildUsed`, `updatedAt`.
- `PaymentTransaction`: `id`, `userId`, `orderId unique`, `packageId`, `packageName`, `amount`, `credits`, `status` (initiated/pending/settlement/expired/cancel/deny), `paymentType?`, `snapToken?`, `raw Json?`.
- `CreditLog`: `id`, `userId`, `change Int ±`, `reason` ("purchase"|"chat"|"build"), `refId?`, `createdAt`.

Jalankan `npx prisma migrate dev --name add_users_credits` + `npx prisma generate`.

## 2) Auth manual

- `src/lib/user-auth.ts` — JWT user (cookie `pcnerd_token`, terpisah dari admin), `hashPassword`/`verifyPassword` (reuse `bcryptjs`), `signUserToken`/`verifyUserToken`, `getActor(req)`.
- Routes:
  - `POST /api/auth/register` — validasi password ≥8 (huruf besar/kecil/angka), rate-limit 5/15 mnt/IP, set cookie.
  - `POST /api/auth/login`
  - `POST /api/auth/logout`
  - `GET /api/auth/me` — { user (email,name,credits,freeChatUsed,freeBuildUsed), quota left, packages }.
- Google (scaffold): `getGoogleAuthUrl()`, `GET /api/auth/google` + `/api/auth/google/callback` (redirect ke home dengan notice bila tak terkonfigurasi).

## 3) Kuota & enforce

- `src/lib/quota.ts`:
  - `assertAndConsume(actor, 'chat'|'build')` — Guest: ≤1 chat & ≤1 build (cap per `guestId` + `ipHash`). User: 3/3 free dulu, lalu kredit (chat −1, build −3). Pakai Prisma transaction.
  - Error → respon **402** `{ error:'quota', code:'GUEST_LIMIT'|'FREE_EXHAUSTED'|'OUT_OF_CREDITS', freeChatLeft, freeBuildLeft, credits }`.
  - Konstanta `GUEST_IP_BUDGET` (default 1) untuk tune toleransi IP berbagi.
- Pasang di: `POST /api/ai/build-prompt` (konsumsi saat intent pasti: question → chat; SSE build siap streaming → build; tanpa dobel tagih) dan `POST /api/recommendation`.
- `src/proxy.ts`: perluas matcher agar memastikan cookie guest `pcnerd_guest` (HttpOnly, 90 hari) + hash IP untuk `/api/ai/*`, `/api/recommendation`, `/api/auth/*`, `/api/payments/*`.

## 4) Kredit & pembayaran (simulasi)

- `src/lib/credits.ts` — daftar paket (id, name, credits, priceRp).
- `GET /api/packages`.
- `src/lib/payments.ts` — `createCheckout(user, packageId)`:
  - Dev (tanpa `MIDTRANS_SERVER_KEY`): langsung credit + `CreditLog`("purchase") + `PaymentTransaction`(settlement) + kembalikan `{ mode:'dev' }`.
  - Production (key ada): buat Snap token Midtrans.
- `POST /api/payments/checkout` — butuh auth user.
- `POST /api/payments/notification` — webhook stub: 501 "gateway belum dikonfigurasi"; siap verifikasi `sha512(order_id+status_code+gross_amount+server_key)`.

## 5) Client / UI

- `src/components/SessionProvider.tsx` + `useSession` (di-mount di `layout.tsx`): muat `/api/auth/me`, cache, auto-refresh.
- `src/components/AuthModal.tsx` — tab Masuk/Daftar, form manual, tombol Google kondisional, pesan "sisa kuota habis → login".
- `src/components/CreditsModal.tsx` — tampilkan sisa free chat/build + saldo kredit + 3 paket + tombol "Beli (Mode Uji)".
- `page.tsx`: badge kuota di nav; interceptor respon 402 di `handleSubmit` → AuthModal/UpgradeModal sesuai `code`.
- `BuildForm.tsx`: tangani 402 dari `/api/recommendation` → modal yang sama.

## 6) Env (`src/lib/config.ts` + `.env.example`)

`NEXT_PUBLIC_GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `MIDTRANS_SERVER_KEY`, `MIDTRANS_CLIENT_KEY`, `MIDTRANS_IS_PRODUCTION`.

## 7) Keamanan

bcrypt rounds 12 · JWT user terpisah dari admin · rate-limit login/register & endpoint kuota · saldo & kuota atomik server-side (transaction) · tidak percaya klien untuk hitungan · tanpa secret di bundle klien.

## 8) Verifikasi & dokumen

1. `npm run typecheck` → `lint` → `format:check` → `test` → `build`.
2. Unit test baru: `quota.ts` (guest 1/1 + cookie/IP, user 3/3 → kredit −1/−3) dan `user-auth.ts` (register/login/me).
3. Update AGENTS.md (changelog + status).
