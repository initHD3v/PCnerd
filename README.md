# PCnerd ID — Platform Perakit PC Berbasis Kecerdasan Buatan

PCnerd ID adalah platform perakit PC yang dirancang khusus untuk pasar Indonesia. Setiap rekomendasi bukan sekadar estimasi: platform ini menggabungkan data benchmark nyata, logika distribusi anggaran yang teruji, dan analisis naratif dari model bahasa besar (LLM) untuk menghasilkan rakitan yang akurat, ekonomis, dan sesuai kebutuhan.

Tiga hal yang membedakan PCnerd ID:

1. **Akurasi berbasis data.** Skor komponen, prediksi FPS, dan analisis bottleneck didasarkan pada tolok ukur performa nyata, bukan opini.
2. **Keandalan harga.** Sinkronisasi harga langsung dari Tokopedia dan Enterkomputer memastikan setiap rekomendasi sesuai kondisi pasar Indonesia.
3. **Pengalaman yang mulus.** Dari percakapan AI hingga hasil rakitan tiga tingkat performa, seluruh alur dirancang agar mudah dipahami pengguna awam maupun pembuat PC berpengalaman.

## Fitur Utama

| Fitur                               | Deskripsi                                                                                                                                                                                |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Rekomendasi Komponen Cerdas         | Distribusi anggaran otomatis per tingkat harga dan kebutuhan, mulai dari Gaming, Editing, Streaming, hingga Office.                                                                      |
| Prediksi Performa Nyata             | Data FPS untuk 35 kartu grafis utama (RTX 5090 hingga GT 730) pada resolusi 1080p, 1440p, dan 4K, untuk kategori AAA Games dan E-Sports.                                                 |
| Analisis AI Naratif                 | Narasi dan analisis rakitan dari OpenAI (gpt-4o-mini), Anthropic (claude-3-haiku), atau model lokal via LM Studio, dialirkan karakter demi karakter secara real-time.                    |
| Chat AI dengan Deteksi Intent       | Percakapan interaktif seputar komponen, perbandingan hardware, dan rekomendasi. Sistem membedakan pertanyaan, permintaan rakitan, hingga percakapan di luar topik.                       |
| Konteks Percakapan                  | Riwayat percakapan dipertahankan sehingga pertanyaan lanjutan dipahami dalam konteks diskusi sebelumnya.                                                                                 |
| Fallback Offline                    | Saat penyedia LLM tidak tersedia, pertanyaan umum tetap dijawab melalui evaluasi berbasis aturan dengan data benchmark, termasuk pertanyaan lanjutan yang merujuk pembahasan sebelumnya. |
| Skoring Komponen Multi-Faktor       | Setiap komponen dinilai dari kompatibilitas, performa, nilai, dan reliabilitas, ditampilkan dalam bentuk bar dan rincian per aspek.                                                      |
| Kalkulator Dampak Upgrade           | Kandidat upgrade GPU, CPU, dan RAM ditampilkan dengan selisih FPS yang konkret dan visual yang mudah dibaca.                                                                             |
| Analisis Bottleneck                 | Gauge keseimbangan CPU-GPU dengan rasio numerik dan zona seimbang yang menyesuaikan resolusi.                                                                                            |
| Estimasi Daya dan Keamanan PSU      | Perhitungan TDP total dan verifikasi kecukupan wattase power supply.                                                                                                                     |
| Sinkronisasi Harga Real-time        | Pembaruan harga bersumber dari Tokopedia (GraphQL SearchProductV5Query dengan cadangan halaman produk) dan Enterkomputer, dapat dipilih per kategori komponen.                           |
| Spesifikasi Periferal Terverifikasi | Data spesifikasi monitor, keyboard, mouse, headset, dan speaker yang telah divalidasi, bukan placeholder.                                                                                |
| Dashboard Admin Terpadu             | Kelola komponen, pengaturan LLM, sinkronisasi harga, dan akun admin dalam satu antarmuka.                                                                                                |
| Responsif Penuh                     | Layout adaptif untuk seluruh ukuran layar; interaksi dioptimalkan untuk perangkat sentuh.                                                                                                |
| Keamanan Berlapis                   | Otentikasi JWT, pembatasan laju permintaan, deteksi prompt injection, dan sanitasi keluaran.                                                                                             |

## Teknologi Yang Digunakan

| Lapisan         | Teknologi                                                                                             |
| --------------- | ----------------------------------------------------------------------------------------------------- |
| Kerangka        | Next.js 16 (Turbopack) · React 19 · TypeScript 6 (strict)                                             |
| Tampilan        | Tailwind CSS v4 · Framer Motion · Lucide React                                                        |
| Basis Data      | SQLite via Prisma 7 dan libSQL                                                                        |
| Otentikasi      | JWT (httpOnly cookie) · bcryptjs · peran superadmin/admin                                             |
| AI dan LLM      | OpenAI (gpt-4o-mini) · Anthropic (claude-3-haiku) · LM Studio (Mistral 7B, Llama 3.2 3B, dan lainnya) |
| Pengambil Harga | GraphQL SearchProductV5Query ke Tokopedia + cadangan parsing halaman produk · Enterkomputer           |
| CI/CD           | GitHub Actions (typecheck → lint → format → test → build)                                             |

## Panduan Memulai

### Prasyarat

- Node.js versi 18 atau lebih baru
- npm

### Instalasi

```bash
git clone https://github.com/initHD3v/PCnerd.git
cd PCnerd
npm install
```

### Konfigurasi Environment

Salin template lalu sesuaikan:

```bash
cp .env.example .env
```

Konfigurasi minimum yang wajib ada:

```
DATABASE_URL="file:./dev.db"
JWT_SECRET="secret-acak-minimal-32-karakter"
```

Opsional, untuk fitur LLM berbasis cloud:

```
OPENAI_API_KEY="sk-..."
# atau
ANTHROPIC_API_KEY="sk-ant-..."
```

Alternatif tanpa API key: gunakan server LLM lokal melalui LM Studio.

1. Buka LM Studio, aktifkan Local Inference Server di `http://127.0.0.1:1234`.
2. Muat model non-reasoning (misalnya Mistral 7B atau Llama 3.2 3B).
3. Mulai server.
4. Pada halaman Admin, isi URL server di pengaturan LLM, uji koneksi, lalu pilih model.

### Setup Basis Data

```bash
npx prisma migrate dev   # terapkan migrasi
npm run seed             # isi database dengan ratusan komponen hardware
```

Akun admin bawaan: `admin` / `admin123`. Ganti segera setelah instalasi.

### Menjalankan

```bash
npm run dev
```

Akses aplikasi di `http://localhost:3000`.

## Cara Kerja AI

### 1. Deteksi Intent (`POST /api/ai/build-prompt`)

Satu endpoint menangani seluruh tipe percakapan:

- **Permintaan Rakitan.** Pengguna menyebutkan anggaran dan tujuan, sistem menghasilkan tiga tier rakitan (hemat, seimbang, performa) lalu mengarahkan ke halaman hasil.
- **Pertanyaan Umum.** Seputar komponen dan perbandingan hardware dijawab oleh LLM dan ditampilkan langsung dalam percakapan.
- **Di Luar Topik.** Filter berbasis aturan dan validasi LLM menolak pertanyaan yang tidak terkait PC dengan pesan yang ramah.
- **Pertahanan Prompt Injection.** Pola deteksi terpadu, dan setiap keluaran disanitasi untuk mencegah injeksi skrip.

Saat penyedia LLM tidak dapat dijangkau, pertanyaan tetap dijawab melalui logika berbasis aturan dengan data benchmark.

### 2. Distribusi Anggaran

Pembagian anggaran mengikuti keputusan berbasis aturan berdasarkan tingkat harga dan tujuan penggunaan:

| Tingkat Anggaran | GPU | CPU | MB  | RAM | Storage | PSU | Case |
| ---------------- | --- | --- | --- | --- | ------- | --- | ---- |
| Di bawah Rp 8 jt | 20% | 35% | 12% | 10% | 8%      | 8%  | 7%   |
| Rp 8-18 jt       | 40% | 25% | 10% | 8%  | 7%      | 6%  | 4%   |
| Rp 18-35 jt      | 48% | 22% | 9%  | 7%  | 6%      | 5%  | 3%   |
| Rp 35 jt ke atas | 55% | 18% | 8%  | 7%  | 6%      | 3%  | 3%   |

Anggaran disesuaikan dengan tujuan penggunaan, misalnya peningkatan alokasi CPU untuk keperluan editing dan rendering, serta menyediakan porsi untuk periferal bila diminta.

### 3. Skoring Komponen Multi-Faktor

| Faktor         | Bobot | Metrik                                                  |
| -------------- | ----- | ------------------------------------------------------- |
| Kompatibilitas | 30%   | Kecocokan soket, tipe RAM, faktor bentuk, TDP, dan PSU  |
| Performa       | 40%   | FPS terhadap tingkat harga, PassMark CPU, kecepatan RAM |
| Nilai          | 20%   | Rasio harga terhadap performa pada tingkat yang sama    |
| Reliabilitas   | 10%   | Reputasi merek dan jaminan produk                       |

### 4. Prediksi Performa

- **Pencarian Benchmark.** Kartu grafis yang dikenal dalam basis data benchmark menampilkan FPS nyata pada tiga resolusi untuk kategori AAA Games dan E-Sports.
- **Fallback Berbasis Harga.** Kartu grafis yang tidak dikenal diestimasi berdasarkan kisaran harga.

### 5. Narasi LLM secara Streaming

- Narasi rakitan digenerate setelah daftar komponen selesai disusun, dengan antrean berurutan agar stabil pada server lokal.
- Keluaran dialirkan ke antarmuka secara real-time.
- Jika LLM tidak tersedia, narasi templat digunakan sehingga hasil tetap utuh tanpa kesalahan.

### 6. Sinkronisasi Harga

Sistem pembaruan harga otomatis dari Tokopedia dan Enterkomputer:

- Pencarian via GraphQL SearchProductV5Query dengan pencadangan ke halaman produk apabila diperlukan.
- Kandidat dianalisis dengan skor kecocokan dan penalti untuk penawaran paket (bundle, rakitan, atau PC lengkap).
- Mendukung pemilihan per kategori komponen di dashboard admin, dengan pelacakan kemajuan dan jeda antar permintaan.

### 7. Chat AI

Chat menghadirkan pengalaman tanya-jawab yang natural: pertanyaan kamulan dijawab sesuai konteks, perbandingan spesifikasi dievaluasi berdasarkan data, dan pertanyaan yang tidak berkaitan dengan PC ditolak dengan sopan. Jawaban juga dapat dihasilkan tanpa koneksi LLM melalui fallback berbasis aturan.

## Referensi API

| Method       | Endpoint                          | Otentikasi | Deskripsi                                |
| ------------ | --------------------------------- | ---------- | ---------------------------------------- |
| GET          | `/api/components`                 | -          | Daftar komponen publik                   |
| POST         | `/api/recommendation`             | -          | Generate rekomendasi rakitan             |
| POST         | `/api/ai/build-prompt`            | -          | Deteksi intent, tanya jawab, dan rakitan |
| POST         | `/api/ai/narrative`               | -          | Analisis naratif LLM (streaming)         |
| GET          | `/api/admin/components`           | JWT        | Daftar komponen                          |
| POST         | `/api/admin/components`           | JWT        | Tambah komponen                          |
| PATCH        | `/api/admin/components/[id]`      | JWT        | Perbarui komponen                        |
| DELETE       | `/api/admin/components/[id]`      | JWT        | Hapus komponen                           |
| POST         | `/api/admin/sync`                 | JWT        | Sinkronisasi harga Tokopedia             |
| POST         | `/api/admin/sync/enterkomputer`   | JWT        | Sinkronisasi harga Enterkomputer         |
| GET/PATCH    | `/api/admin/settings`             | JWT        | Baca dan perbarui pengaturan LLM         |
| POST         | `/api/admin/settings/test-llm`    | JWT        | Uji koneksi LLM                          |
| POST         | `/api/admin/auth/login`           | -          | Masuk sebagai admin                      |
| POST         | `/api/admin/auth/logout`          | -          | Keluar                                   |
| GET          | `/api/admin/auth/me`              | -          | Periksa sesi                             |
| POST         | `/api/admin/auth/change-password` | JWT        | Ganti kata sandi                         |
| POST         | `/api/admin/auth/forgot-password` | -          | Lupa kata sandi                          |
| POST         | `/api/admin/auth/reset-password`  | -          | Atur ulang kata sandi                    |
| GET/POST     | `/api/admin/admins`               | JWT        | Kelola daftar admin                      |
| PATCH/DELETE | `/api/admin/admins/[id]`          | JWT        | Perbarui atau hapus admin                |

## Struktur Proyek

```
src/
├── app/
│   ├── api/
│   │   ├── admin/              # CRUD komponen, otentikasi admin, sinkronisasi harga, pengaturan LLM
│   │   ├── ai/build-prompt     # Deteksi intent, tanya jawab, dan rekomendasi rakitan
│   │   └── ai/narrative        # Analisis naratif LLM (streaming SSE)
│   ├── build/
│   │   ├── page.tsx            # Asisten rakitan bertahap
│   │   └── results/            # Hasil rakitan dan analisis AI
│   ├── admin/                  # Dashboard admin
│   ├── page.tsx                # Beranda dan Chat AI
│   ├── layout.tsx              # Layout dasar dan pencegahan flash tema
│   └── loading.tsx             # Transisi lintas halaman
├── components/
│   ├── build/BuildForm.tsx     # Formulir rakitan bertahap
│   ├── AiLoadingOverlay.tsx    # Indikator proses layar penuh
│   └── SyncPanel.tsx           # Panel kemajuan sinkronisasi
├── data/
│   ├── benchmarks.ts           # Data FPS benchmark kartu grafis
│   └── peripheral-specs.json   # Spesifikasi periferal terverifikasi
├── lib/
│   ├── llm.ts                  # Klien LLM (OpenAI, Anthropic, LM Studio)
│   ├── recommendation-engine.ts # Mesin rekomendasi inti
│   ├── build-service.ts        # Orkestrasi pembuatan rakitan
│   ├── auth.ts                 # JWT dan bcrypt untuk admin
│   ├── offline-qa.ts           # Tanya jawab offline berbasis benchmark
│   ├── rate-limit.ts           # Utilitas pembatas laju permintaan
│   ├── prisma.ts               # Klien Prisma
│   └── scraper/                # Pengambil harga Tokopedia dan Enterkomputer
└── proxy.ts                    # Middleware otentikasi admin
```

## Skrip yang Tersedia

| Perintah            | Deskripsi                                   |
| ------------------- | ------------------------------------------- |
| `npm run dev`       | Menjalankan server pengembangan (Turbopack) |
| `npm run build`     | Membuat build produksi                      |
| `npm run lint`      | Analisis kode dengan ESLint                 |
| `npm run typecheck` | Pemeriksaan tipe TypeScript                 |
| `npm run test`      | Menjalankan pengujian (Vitest)              |
| `npm run format`    | Merapikan format kode dengan Prettier       |
| `npm run seed`      | Mengisi basis data dengan komponen          |

## Keamanan

| Lapisan           | Implementasi                                                                                   |
| ----------------- | ---------------------------------------------------------------------------------------------- |
| Otentikasi Admin  | JWT httpOnly cookie, dua peran (superadmin dan admin)                                          |
| Pembatasan Laju   | 5 percobaan login per 15 menit per IP; 10 permintaan AI per menit per IP                       |
| Prompt Injection  | Pola deteksi terpadu dan validasi LLM; instruksi sistem diperkuat untuk menolak penyalahgunaan |
| Sanitasi Keluaran | Penyaringan skrip dan truncation keluaran                                                      |
| Filter Topik      | Penyaringan berbasis aturan dan validasi LLM untuk percakapan di luar topik                    |
| Pencegahan Flash  | Skrip inline sebelum proses hidrasi untuk menjaga konsistensi tema                             |

## Catatan Operasional

- **Basis data SQLite** (`dev.db`) ikut di-commit ke repositori. Jangan dihapus.
- **Kunci API LLM bersifat opsional.** Tanpa kunci API, chat dan analisis tetap berfungsi melalui LM Studio lokal atau fallback berbasis aturan dan templat.
- **LM Studio.** Gunakan model non-reasoning (Mistral 7B, Llama 3.2 3B). Model reasoning seperti Qwen3 terlalu lambat dan menghabiskan token untuk berpikir.
- **Mesin AI.** Tidak terdapat model machine learning terlatih; kecerdasan berasal dari mesin aturan, pemanggilan LLM, dan pencarian benchmark.
- **Administrasi** dilakukan di `/admin` dengan sesi berbasis JWT.

## Peta Jalan

Fitur berikut telah direncanakan dan akan dirilis pada iterasi berikutnya:

- Akun pengguna dengan pendaftaran dan masuk manual, dengan opsi Google.
- Kuota penggunaan gratis dan sistem kredit untuk kelanjutan penggunaan.
- Integrasi pembayaran untuk pembelian kredit.

## Lisensi

Proyek ini bersifat privat.
