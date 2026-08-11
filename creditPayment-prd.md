# PRD — Login User, Kuota AI/PCNerd, Kredit & Pembayaran

- Versi: 1.0 · Status: Draft · Pemilik: PCnerd ID · Target rilis: iterasi ini
- Tautan task: `creditPayment.md`

## 1. Konteks & Masalah
PCNerd memakai LLM (chat QA + narasi build) yang kini **gratis tanpa batas** → biaya API tanpa pendapatan. Tidak ada akun pengguna, sehingga tak ada retensi maupun potensi yield. Perlu: batas penggunaan, jalur login, dan monetisasi kredit.

## 2. Tujuan & Metrik
- T2: Tutup overspend LLM (non-logged users dibatasi hard-cap; user berbayar diukur kredit).
- T3: Konversi pengunjung → akun (`signup rate`).
- T4: Revenue per user aktif (`ARPACU`), `purchase conversion`.
- T5: Abandonment rendah saat gate energi muncul (gesture "sisa N kali" proaktif).

## 3. Persona
| Persona | Tipe | Kebutuhan |
|---|---|---|
| Pengunjung | belum akun | cobain chat+build sekali, enggan registrasi |
| User Free | akun baru | 3x chat + 3x build, paham limit |
| User Berbayar | beli kredit | lanjut pakai, riwayat saldo jelas |

## 4. User Stories
1. Pengunjung kirim chat/build pertama → tetap jalan; saat 1+1 habis → **login prompt** (modal), bukan mati diam.
2. User daftar/masuk manual (email+password) → dapat 3x chat + 3x build.
3. Saat 3/3 habis → tawaran **top-up kredit** (paket + price), bukan blokir.
4. User beli kredit (mode uji) → saldo bertambah seketika + tercatat di log.
5. Pengguna 1 IP mencoba hapus cookie → tetap tersegmentasi oleh `ipHash` (hard cap).
6. Narrative build (`/api/ai/narrative`) tidak menagih kredit tambahan.
7. Nav & BuildForm selalu menampilkan sisa batas & saldo agar ekspektasi jelas.

## 5. Requirement Fungsional
R1 **Auth manual**: register/login/logout/me; validasi password ≥8 (Besar,kecil,angka); rate-limit 5/15 mnt/IP; cookie `pcnerd_token`.
R2 **Google (opsional, inert)**: helper + route callback tersedia; UI tombol hanya muncul bila `NEXT_PUBLIC_GOOGLE_CLIENT_ID` ada; tanpa kredensial → notice bukan error.
R3 **Kuota**: guest 1/1 (cookie+IP); user 3/3 seumur akun → kemudian kredit (chat −1, build −3). Atomic via Prisma transaction.
R4 **Enforce endpoint**: `/api/ai/build-prompt` & `/api/recommendation`; respon 402 terstruktur `{code, freeChatLeft, freeBuildLeft, credits}`.
R5 **Tidak dobel tagih**: pesan yang berubah jadi build dihitung 1 build (bukan chat).
R6 **Kredit**: paket (10/Rp15rb, 30/Rp39rb, 100/Rp99rb) dari `src/lib/credits.ts`; `GET /api/packages`.
R7 **Checkout (simulasi)**: `POST /api/payments/checkout` butuh login → auto-kredit di dev; bila `MIDTRANS_SERVER_KEY` ada → token Snap (arsitektur siap).
R8 **Webhook stub**: `/api/payments/notification` → 501 "belum dikonfigurasi".
R9 **UI**: SessionProvider+useSession; AuthModal; CreditsModal; badge kuota; interceptor 402 di `page.tsx` & `BuildForm.tsx`.

## 6. Requirement Non-Fungsional
- Keamanan: bcrypt (12) · JWT user terpisah admin · hitungan/saldo 100% server-side · tanpa secret di klien (hanya client key).
- Performa: `/api/auth/me` < 100ms; konsumsi kuota via transaksi singkat; tanpa blocking pada chat stream.
- Reliabilitas: jika konsumsi gagal di tengah → rollback, user tak dirugikan.
- Privasi: simpan hash IP (bukan IP mentah); hapus-cookie tidak merusak UX.

## 7. Alur Kunci (Sequence)
```
[Guest] Pengunjung chat/build
  → proxy: pastikan cookie guest + hitung ipHash
  → quota.assertAndConsume(GUEST)
    → jika >1/1 → 402 GUEST_LIMIT → UI AuthModal
    → jika ok → proses normal, sisa kuota dikirim di respon

[User Free] sisa 0/0 & kredit 0
  → 402 FREE_EXHAUSTED → UI CreditsModal (tawarkan paket)

[Top-up dev]
  → checkout → PaymentTransaction + CreditLog(purchase) → saldo +N → CreditsModal refresh via useSession
```

## 8. Acceptance Criteria (per user story)
- US1–2: hard-cap & login prompt terbukti di test + manual (guest pakai 1/1 lalu 402 → modal login muncul).
- US3–4: setelah beli (mode uji) saldo & badge bertambah, `CreditLog` mencatat "purchase", 401 sebelum login untuk `/api/payments/checkout`.
- US5: dua guestId pada 1 IP tak bisa melewati cap `ipHash`.
- US6: narrative tetap jalan tanpa potong kredit.
- R5: satu pesan yang menjadi build dikurangi hanya 1 build.
- NFR: `npm run typecheck && lint && format:check && test && build` hijau; unit test quota & auth ≥ 80% lintasan.

## 9. Out of Scope (v1.1+)
- Midtrans/Xendit Live + verifikasi signature aktif (tergantung akun merchant).
- Reset kuota bulanan; email verification; forgot password; Google selesai.
- Paket langganan / auto-renewal / refund.

## 10. Asumsi & Risiko
- Asumsi: `dev.db` tetap satu-satunya store; registrasi akun baru low-friction (tanpa verifikasi email).
- Risiko: bypass IP via VPN/proxy (diterima); user berbagi IP kantor antar-teman kena cap (mitigasi `GUEST_IP_BUDGET`); akurasi harga paket di `credits.ts` (TBD saat rilis).

## 11. Timeline & Dependensi
1. Migrasi Prisma (`add_users_credits`) → 2. `user-auth`+routes+test → 3. `quota`+integrasi endpoint+test → 4. kredit/payments (dev) → 5. UI (Session/Auth/Credits/badge) → 6. env/config → 7. verifikasi penuh + AGENTS.md.