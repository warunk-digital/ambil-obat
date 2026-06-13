# Release Notes - Ambil Obat App

## Fitur Baru & Peningkatan (New Features & Enhancements)

### 1. Fitur Notifikasi Real-time 🔴
- **Untuk Customer**: Menambahkan titik notifikasi (badge) merah pada ikon "Pesanan" di Bottom Navigation Bar ketika pengguna memiliki pesanan aktif (status diproses/dikirim).
- **Untuk Admin Apotek**: Menambahkan titik notifikasi (badge) merah pada menu "Pesanan Masuk" di Sidebar Desktop dan Bottom Nav Mobile ketika ada pesanan baru yang berstatus `Pending`. Notifikasi bekerja secara *real-time*.

### 2. Fitur Tolak/Batalkan Pesanan dengan Alasan ❌
- Admin kini dapat memberikan **Alasan Penolakan** ketika membatalkan pesanan.
- Terdapat opsi **Pesan Cepat** untuk alasan penolakan yang sering digunakan (contoh: "Stok obat sedang kosong", "Mohon Maaf Nomor Obat Tidak Tercatat pada RS/Apotek ini", dsb).
- Alasan penolakan akan disimpan di dalam *database* (`cancel_reason` pada tabel `delivery_requests`) dan ditampilkan di halaman "Detail Pesanan" di sisi Customer.

### 3. Integrasi Chat WhatsApp Apotek 💬
- Menambahkan kolom pengaturan **"Nomor WhatsApp Apotek"** di menu "Pengaturan Apotek" untuk sisi Admin Apotek.
- Di halaman detail pesanan Customer, ditambahkan tombol **"Hubungi Apotek via WA"**.
- Tombol tersebut akan otomatis membuka WhatsApp dengan *template* pesan yang sudah terisi otomatis:
  > *"Halo [Nama Apotek], saya ingin menanyakan pesanan [Nomor Pesanan] atau Nomor Obat [Nomor Obat]"*

### 4. Tab & Filter "Dibatalkan" 📂
- **Untuk Customer**: Menambahkan Tab **"Dibatalkan"** secara terpisah di layar riwayat "Pesanan Saya".
- **Untuk Admin Apotek**: Menambahkan filter status **"Dibatalkan"** pada *dropdown* filter di layar "Pesanan Masuk".

### 5. Fitur Hapus Alamat (Soft Delete) 🗑️
- Menyempurnakan logika penghapusan alamat (*Soft Delete*) agar pengguna tetap bisa "menghapus" alamat dari daftar tanpa memutus relasi riwayat pesanan (Foreign Key Constraints) di sisi Admin Apotek dan riwayat pesanan lampau.

## Database Migrations
Terdapat file SQL baru yang harus dieksekusi di Supabase SQL Editor:
1. `supabase-add-cancel-reason.sql` - Menambahkan kolom `cancel_reason` pada tabel `delivery_requests`.
2. `supabase-softdelete-addresses.sql` - Menambahkan kolom `is_deleted` pada tabel `addresses`.
