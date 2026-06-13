<div align="center">
  <br />
  <h1>💊 Ambil Obat App</h1>
  <p>
    <strong>Platform Layanan Antar Obat Terintegrasi untuk RS & Apotek</strong>
  </p>
  <p>
    <img src="https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" alt="Next.js" />
    <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
    <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind" />
    <img src="https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase" />
  </p>
</div>

<hr />

## 📖 Tentang Projek
**Ambil Obat** adalah solusi aplikasi berbasis web inovatif yang mempermudah pasien untuk meminta pengantaran obat dari Rumah Sakit atau Apotek langsung ke rumah mereka. Dengan dukungan multi-role (Superadmin, Admin Apotek, Kurir, dan Customer), aplikasi ini memastikan pelacakan pesanan secara real-time dan manajemen data yang transparan.

---

## ✨ Fitur Unggulan

### 🛍️ Untuk Customer (Pasien)
- **Pelacakan Real-time:** Ketahui status pesanan Anda dari mulai diproses hingga diantar kurir.
- **Pilih Lokasi via Maps:** Memasukkan alamat lebih presisi dengan integrasi peta.
- **Integrasi WhatsApp:** Berkomunikasi langsung dengan apotek via WhatsApp melalui tombol instan (dengan pesan yang sudah ter-*format* secara otomatis).
- **Notifikasi Pintar:** Ikon lonceng/titik merah yang menandakan Anda memiliki pesanan aktif.
- **Riwayat Lengkap:** Mengelola alamat (dengan dukungan fitur *soft delete*) serta melihat riwayat pesanan (Aktif, Selesai, dan Dibatalkan).

### 🏪 Untuk Admin Apotek
- **Manajemen Pesanan Real-time:** Semua pesanan baru langsung masuk dengan bunyi notifikasi visual (titik merah) tanpa perlu *refresh* halaman.
- **Assign Kurir:** Memilih kurir khusus untuk mengantarkan obat kepada pasien.
- **Fitur Penolakan Pintar:** Menolak pesanan dengan cepat melalui template otomatis (misal: "Stok obat kosong", "Nomor resep tidak terdaftar").
- **Manajemen Toko:** Mengatur jam operasional, jangkauan maksimal, tarif dasar, tarif per-km, serta nomor WhatsApp Apotek.

### 🛵 Untuk Kurir
- **Update Status:** Mengubah status dari "Diambil", "Sedang Diantar", hingga "Selesai" dari genggaman.
- **Manajemen Pengantaran:** Mengelola pesanan mana yang harus diantar terlebih dahulu.

### 👑 Untuk Superadmin
- **Manajemen Apotek & User:** Memverifikasi pendaftaran apotek baru, menghapus/mengedit pengguna, serta mengelola semua entitas di dalam sistem.

---

## 🛠️ Tech Stack

- **Framework:** Next.js (App Router)
- **Styling:** Tailwind CSS + Radix UI (shadcn/ui)
- **Icons:** Lucide React
- **Maps:** TomTom Maps API (Geocoding & Map Display)
- **Backend & Database:** Supabase (PostgreSQL, Realtime, Row Level Security)
- **Auth:** Supabase Auth
- **Language:** TypeScript

---

## 🚀 Instalasi & Menjalankan Aplikasi

Berikut adalah panduan singkat untuk menjalankan proyek ini secara lokal:

1. **Clone repository ini**
   ```bash
   git clone https://github.com/warunk-digital/ambil-obat.git
   cd ambil-obat/frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Setup Environment Variables**
   Buat file `.env.local` pada folder `frontend` lalu isi dengan kunci akses yang diperlukan:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   NEXT_PUBLIC_TOMTOM_API_KEY=your-tomtom-api-key
   ```

4. **Jalankan Development Server**
   ```bash
   npm run dev
   ```
   Aplikasi akan berjalan di `http://localhost:3000`.

---

## 🗄️ Database Setup (Supabase)
Jalankan script SQL di bawah ini secara berurutan pada menu **SQL Editor** di Supabase untuk menyiapkan skema database dan keamanan:

1. `supabase-schema.sql` (Skema awal, trigger, dan view)
2. `supabase-migration-location.sql` (Migrasi untuk kolom map/koordinat)
3. `supabase-migration-rls.sql` (Kebijakan Keamanan / *Row Level Security*)
4. `supabase-softdelete-addresses.sql` (Dukungan *soft-delete* tabel Alamat)
5. `supabase-add-cancel-reason.sql` (Dukungan kolom alasan pembatalan)
6. `supabase-fix-user-visibility.sql` & `supabase-fix-recursion.sql` (Penyempurnaan performa RLS)

---

## 👨‍💻 Kontributor
Dibuat dengan ❤️ untuk merevolusi pelayanan kefarmasian berbasis digital. 
