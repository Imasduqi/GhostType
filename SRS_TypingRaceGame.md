# Software Requirements Specification (SRS)
## [Nama Project: GhostType] — Typing Race Game

**Versi:** 1.0
**Tanggal:** 20 Juni 2026
**Disusun untuk:** Vibe coding workflow (dokumen ini dibaca AI sebagai acuan pengembangan)

> Catatan: Ganti placeholder "GhostType" dengan nama final project di seluruh dokumen jika sudah diputuskan.

---

## 1. Pendahuluan

### 1.1 Latar Belakang
GhostType adalah aplikasi web game mengetik (typing game) yang dirancang untuk mengasah kecepatan dan akurasi mengetik pengguna melalui mekanik balapan (race) melawan "ghost" — replay dari hasil ketikan pengguna sendiri di sesi sebelumnya. Berbeda dari typing test konvensional yang hanya menampilkan angka WPM (Words Per Minute) di akhir sesi, GhostType memberikan visualisasi progres real-time berupa balapan, sehingga pengguna mendapat umpan balik langsung dan termotivasi untuk meningkatkan performa dibanding diri mereka sendiri di masa lalu.

### 1.2 Tujuan
Dokumen ini mendefinisikan kebutuhan fungsional dan non-fungsional untuk versi awal (MVP) GhostType, sebagai acuan pengembangan baik oleh pengembang manusia maupun AI coding assistant.

### 1.3 Ruang Lingkup
Versi awal (MVP) mencakup:
- Sistem autentikasi pengguna
- Mode permainan **Race vs Ghost** (mode pertama yang dikembangkan)
- Engine inti pengetikan (reusable untuk mode-mode mendatang)
- Generator/pool teks bahasa Indonesia dan Inggris
- Leaderboard (per-teks dan keseluruhan/overall)
- Penyimpanan riwayat percobaan (attempt) dan data ghost

Di luar ruang lingkup MVP (dikembangkan di iterasi berikutnya):
- Mode Survival (kata jatuh)
- Mode Time Attack
- Mode Level-based bertahap
- Multiplayer real-time
- Fitur sosial (follow, share hasil, komentar)
- Submission teks oleh pengguna (user-generated content)

### 1.4 Definisi & Istilah
| Istilah | Definisi |
|---|---|
| WPM | Words Per Minute, jumlah kata per menit |
| Ghost | Representasi visual dari hasil ketikan pengguna pada attempt sebelumnya, diputar ulang sebagai lawan |
| Attempt | Satu sesi percobaan mengetik yang telah diselesaikan |
| Keystroke log | Catatan timestamp setiap karakter yang diketik dalam satu attempt |
| RLS | Row Level Security (fitur keamanan Supabase) |

---

## 2. Deskripsi Umum

### 2.1 Perspektif Produk
GhostType adalah aplikasi web mandiri (standalone), dibangun dengan Next.js dan terhubung ke backend Supabase untuk autentikasi dan penyimpanan data. Aplikasi dapat diakses melalui browser desktop maupun mobile.

### 2.2 Karakteristik Pengguna
- Pengguna umum yang ingin melatih kecepatan dan akurasi mengetik
- Tidak memerlukan keahlian teknis khusus untuk menggunakan aplikasi
- Diasumsikan familiar dengan keyboard QWERTY standar

### 2.3 Batasan Umum
- Versi awal berbahasa Indonesia dan Inggris saja
- Optimal digunakan dengan keyboard fisik (bukan touchscreen virtual keyboard)
- Memerlukan koneksi internet untuk autentikasi dan sinkronisasi leaderboard

---

## 3. Kebutuhan Fungsional

### 3.1 Modul Autentikasi (Auth)
| ID | Kebutuhan |
|---|---|
| F-AUTH-01 | Sistem harus memungkinkan pengguna mendaftar akun baru menggunakan email & password (Supabase Auth) |
| F-AUTH-02 | Sistem harus memungkinkan pengguna login dengan akun yang sudah terdaftar |
| F-AUTH-03 | Sistem harus memungkinkan pengguna logout |
| F-AUTH-04 | Setelah registrasi, sistem harus membuat entri profil otomatis (username, avatar default) |
| F-AUTH-05 | Sistem harus memvalidasi username unik saat pengguna mengatur profil |

### 3.2 Modul Core Typing Engine
Modul ini bersifat reusable dan menjadi fondasi semua mode permainan.

| ID | Kebutuhan |
|---|---|
| F-ENGINE-01 | Sistem harus menampilkan teks target yang akan diketik pengguna |
| F-ENGINE-02 | Sistem harus menangkap input keystroke pengguna secara real-time |
| F-ENGINE-03 | Sistem harus membandingkan karakter yang diketik dengan teks target, dan menandai karakter benar/salah secara visual |
| F-ENGINE-04 | Sistem harus mencatat timestamp relatif setiap karakter yang diketik (untuk keperluan ghost replay) |
| F-ENGINE-05 | Jika pengguna mengetik karakter yang salah, sistem harus mencegah progres maju ke karakter berikutnya hingga kesalahan diperbaiki (mendukung tujuan melatih akurasi, bukan sekadar kecepatan) |
| F-ENGINE-06 | Sistem harus menghitung WPM secara real-time selama sesi berlangsung |
| F-ENGINE-07 | Sistem harus menghitung akurasi (persentase karakter benar dari total karakter yang diketik, termasuk kesalahan yang diperbaiki) |
| F-ENGINE-08 | Sistem harus mendeteksi kondisi selesai (seluruh teks target berhasil diketik dengan benar) dan menghentikan sesi |
| F-ENGINE-09 | Setelah sesi selesai, sistem harus menyimpan hasil attempt (WPM, akurasi, durasi, keystroke log) ke database |

### 3.3 Modul Race Mode (Mode Pertama)
| ID | Kebutuhan |
|---|---|
| F-RACE-01 | Sistem harus menampilkan visualisasi jalur balapan horizontal dengan dua penanda posisi: pengguna dan ghost |
| F-RACE-02 | Posisi penanda harus diperbarui berdasarkan persentase teks yang berhasil diketik dengan benar |
| F-RACE-03 | Ghost harus bergerak berdasarkan keystroke log dari attempt sebelumnya milik pengguna yang sama (replay ritme asli, bukan kecepatan rata-rata konstan) |
| F-RACE-04 | Jika pengguna belum memiliki attempt sebelumnya untuk teks tertentu, sistem harus menyediakan ghost default (misal: kecepatan referensi tetap, contoh 40 WPM) atau memberi opsi "race tanpa ghost" |
| F-RACE-05 | Sistem harus menampilkan indikator siapa yang unggul (pengguna atau ghost) secara real-time selama balapan berlangsung |
| F-RACE-06 | Setelah selesai, sistem harus menampilkan ringkasan hasil: WPM, akurasi, menang/kalah melawan ghost, dan selisih waktu |

### 3.4 Modul Manajemen Teks (Text Pool)
| ID | Kebutuhan |
|---|---|
| F-TEXT-01 | Sistem harus menyediakan kumpulan teks terkurasi manual (curated) sebanyak 20-30 teks per bahasa (Indonesia & Inggris) sebagai konten awal |
| F-TEXT-02 | Sistem harus menyediakan generator teks acak berbasis pool kosakata sehari-hari bahasa Indonesia, **tanpa mencampurkan istilah teknis/IT**, dengan pemilihan kata yang murni random (pure random) dari daftar kosakata umum |
| F-TEXT-03 | Pengguna harus dapat memilih bahasa teks (Indonesia atau Inggris) sebelum memulai sesi |
| F-TEXT-04 | Sistem harus mengklasifikasikan teks berdasarkan tingkat kesulitan (easy/medium/hard), ditentukan oleh panjang teks dan kompleksitas kata |
| F-TEXT-05 | Pengguna harus dapat memilih tingkat kesulitan sebelum memulai sesi |

### 3.5 Modul Leaderboard
| ID | Kebutuhan |
|---|---|
| F-LEAD-01 | Sistem harus menampilkan leaderboard per-teks (peringkat WPM tertinggi untuk teks spesifik) |
| F-LEAD-02 | Sistem harus menampilkan leaderboard overall (berdasarkan rata-rata atau WPM terbaik keseluruhan pengguna) |
| F-LEAD-03 | Leaderboard harus dapat dibaca oleh publik (tidak memerlukan login untuk melihat) |
| F-LEAD-04 | Hanya attempt valid (selesai sepenuhnya) yang dihitung dalam leaderboard |

### 3.6 Modul Profil & Statistik
| ID | Kebutuhan |
|---|---|
| F-PROF-01 | Sistem harus menampilkan riwayat attempt pengguna (tanggal, WPM, akurasi) |
| F-PROF-02 | Sistem harus menampilkan statistik agregat: WPM rata-rata, WPM terbaik, total attempt, akurasi rata-rata |
| F-PROF-03 | Sistem harus menampilkan grafik perkembangan WPM dari waktu ke waktu |

---

## 4. Kebutuhan Non-Fungsional

| ID | Kategori | Kebutuhan |
|---|---|---|
| NF-01 | Performa | Input keystroke harus direspons dengan latensi visual < 50ms agar terasa real-time |
| NF-02 | Performa | Perhitungan WPM dan posisi ghost harus diperbarui minimal setiap 100ms selama sesi berlangsung |
| NF-03 | Keamanan | Row Level Security (RLS) Supabase harus diterapkan: insert attempt hanya oleh pemilik (`auth.uid() = user_id`), select bersifat publik untuk keperluan leaderboard |
| NF-04 | Keamanan | Password dan data autentikasi dikelola sepenuhnya oleh Supabase Auth, tidak disimpan custom |
| NF-05 | Usability | Antarmuka harus responsif dan dapat digunakan dengan baik di desktop maupun mobile, meskipun pengalaman optimal di desktop (keyboard fisik) |
| NF-06 | Kompatibilitas | Aplikasi harus berjalan baik di browser modern (Chrome, Firefox, Edge, Safari versi terbaru) |
| NF-07 | Maintainability | Core typing engine harus diimplementasikan sebagai modul terpisah dan reusable, tidak terikat langsung ke logic Race Mode, agar mode permainan baru (survival, time attack, dll) dapat ditambahkan tanpa menulis ulang logic inti |
| NF-08 | Skalabilitas | Skema database harus mendukung penambahan mode permainan baru tanpa migrasi besar (misal kolom `mode` pada tabel `attempts` jika diperlukan di masa depan) |

---

## 5. Model Data (Skema Database — Supabase/PostgreSQL)

```sql
-- Tabel profil pengguna (terhubung ke auth.users bawaan Supabase)
profiles (
  id              uuid PRIMARY KEY REFERENCES auth.users(id),
  username        text UNIQUE NOT NULL,
  avatar_url      text,
  created_at      timestamptz DEFAULT now()
)

-- Tabel pool teks
texts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content         text NOT NULL,
  language        text NOT NULL CHECK (language IN ('id', 'en')),
  source          text NOT NULL CHECK (source IN ('curated', 'generated')),
  difficulty      text NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  char_count      int NOT NULL,
  created_at      timestamptz DEFAULT now()
)

-- Tabel hasil percobaan (attempt)
attempts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES profiles(id),
  text_id         uuid NOT NULL REFERENCES texts(id),
  mode            text NOT NULL DEFAULT 'race',  -- antisipasi mode lain di masa depan
  wpm             numeric NOT NULL,
  accuracy        numeric NOT NULL,              -- persentase, 0-100
  duration_ms     int NOT NULL,
  keystroke_log   jsonb NOT NULL,                 -- array {char, timestamp_ms, correct}
  created_at      timestamptz DEFAULT now()
)

-- View agregat untuk leaderboard overall & statistik profil
CREATE VIEW user_stats AS
SELECT
  user_id,
  AVG(wpm) AS avg_wpm,
  MAX(wpm) AS best_wpm,
  COUNT(*) AS total_attempts,
  AVG(accuracy) AS avg_accuracy
FROM attempts
GROUP BY user_id;
```

### 5.1 Row Level Security (RLS) Policy
- `texts`: SELECT publik untuk semua (`USING (true)`)
- `attempts`: 
  - INSERT hanya jika `auth.uid() = user_id`
  - SELECT publik untuk semua (`USING (true)`) — diperlukan untuk leaderboard dan ghost replay
- `profiles`:
  - SELECT publik untuk semua
  - UPDATE hanya jika `auth.uid() = id`

---

## 6. Arsitektur & Tech Stack

| Komponen | Pilihan |
|---|---|
| Frontend Framework | Next.js (App Router) |
| Bahasa | TypeScript |
| Styling | Tailwind CSS |
| Backend/Database | Supabase (PostgreSQL + Auth) |
| Hosting | Vercel |

### 6.1 Struktur Folder yang Direkomendasikan
```
ghosttype/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   └── register/
│   ├── race/                    ← halaman mode race
│   ├── leaderboard/
│   ├── profile/
│   └── layout.tsx
├── components/
│   ├── typing-engine/           ← core engine, reusable
│   │   ├── TypingDisplay.tsx
│   │   ├── useTypingEngine.ts   ← custom hook: state & logic inti
│   ├── race-mode/
│   │   ├── RaceTrack.tsx
│   │   ├── GhostRunner.tsx
│   ├── leaderboard/
│   └── shared/
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   └── queries.ts
│   ├── typing/
│   │   ├── calculateWpm.ts
│   │   ├── calculateAccuracy.ts
│   ├── text-generator/
│   │   ├── wordPoolID.ts        ← daftar kosakata sehari-hari ID
│   │   └── generateRandomText.ts
├── types/
│   └── index.ts                 ← Attempt, TextItem, GhostFrame, dll
└── supabase/
    └── schema.sql
```

### 6.2 Catatan Implementasi Engine Inti
- Gunakan custom hook (misal `useTypingEngine`) yang menerima teks target dan mengembalikan: status tiap karakter, WPM real-time, akurasi real-time, status selesai, dan keystroke log lengkap.
- Hook ini tidak boleh mengandung logic spesifik mode (race, survival, dll) — hanya menangani state pengetikan murni.
- Komponen mode (misal `RaceTrack`) mengonsumsi output dari `useTypingEngine` untuk menentukan render visualnya sendiri.

---

## 7. Alur Pengguna (User Flow) — Mode Race

1. Pengguna login/registrasi
2. Pengguna memilih bahasa teks dan tingkat kesulitan
3. Sistem memilih/menampilkan teks target, beserta ghost dari attempt terbaik pengguna sebelumnya untuk teks tersebut (jika ada)
4. Pengguna menekan tombol mulai, hitung mundur singkat
5. Pengguna mengetik teks; posisi pengguna dan ghost pada track diperbarui real-time
6. Sesi selesai ketika teks berhasil diketik seluruhnya dengan benar
7. Sistem menampilkan ringkasan hasil (WPM, akurasi, menang/kalah vs ghost)
8. Attempt disimpan ke database, leaderboard diperbarui
9. Pengguna dapat memilih: ulangi teks yang sama, pilih teks baru, atau lihat leaderboard/profil

---

## 8. Roadmap Pengembangan

### Fase 1 — MVP (cakupan dokumen ini)
- Auth, Core Typing Engine, Race Mode, Text Pool (curated + generator ID), Leaderboard, Profil dasar

### Fase 2 — Pengembangan Lanjutan
- Mode Survival (kata jatuh dari atas)
- Mode Time Attack
- Mode Level-based bertahap
- Heatmap kesalahan huruf pada keyboard
- Achievement/badge system
- Daily challenge

### Fase 3 — Potensial Jangka Panjang
- Multiplayer real-time (lawan pengguna lain secara langsung)
- User-generated text submission (dengan moderasi)
- Tema/kustomisasi visual (dark mode, tema warna)

---

## 9. Asumsi & Batasan
- Pengguna memiliki koneksi internet stabil selama bermain
- Versi awal tidak mendukung input dari virtual keyboard mobile secara optimal
- Generator teks acak bahasa Indonesia hanya menggunakan kosakata sehari-hari umum, tidak mencakup istilah teknis, nama diri, atau singkatan
- Ghost replay terbatas pada attempt milik pengguna sendiri (bukan attempt pengguna lain) di versi MVP
