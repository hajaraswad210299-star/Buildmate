# Catatan Pola Desain Sisi Pelanggan — Airbnb × Flamingo Estate

Dokumen ini mencatat adopsi pola hibrida Airbnb × Flamingo Estate untuk tiap layar pelanggan (C01–C10) di BuildMate, sesuai spesifikasi `SPEC_CUSTOMER.md` Bagian A2.

---

## 1. Prinsip Utama Hibrida
- **Airbnb Memberikan Struktur & Cara Kerja:** Grid katalog, filter multi-dimensi dengan bottom sheet mobile, kartu listing tukang & paket, CTA sticky bawah, ringkasan biaya transparan, alur stepper pesanan, status pembayaran real-time, tab pesanan aktif/riwayat.
- **Flamingo Estate Memberikan Rasa & Karakter Editorial:**
  - Bar pengumuman tipis 36px di atas ("BuildMate Plus — bebas biaya layanan & garansi →")
  - Wordmark serif anggun di tengah ("BuildMate", Instrument Serif)
  - Hero berupa kartu foto bersudut membulat (radius 24px) dengan kolom cari putih di dalamnya
  - Label section UPPERCASE berjarak huruf (`tracking-widest` 12/600)
  - Kartu paket dengan tile `cream-100`, nama serif 22px, dan tombol pill outline ("LIHAT TUKANG · Rp150.000")
  - Garis titik-titik penghubung di rincian cakupan & biaya
  - Cek area layanan berbasis jangkauan kecamatan ("Apakah alamatmu dalam jangkauan?")
  - Latar hangat `cream-50` (`#FBF9F4`) berpadu dengan token brand lavender (`#7A5CE6`)
  - Tombol melayang WhatsApp "Hubungi BuildMate" di pojok kanan bawah

---

## 2. Pemetaan Pola Per Screen (C01–C10)

| Screen | Pola Airbnb | Pola Flamingo Estate | Catatan Implementasi |
|---|---|---|---|
| **C01 — Beranda** | Grid kategori & filter cepat, kartu listing tukang & paket terverifikasi, alur pencarian intuitif | Hero kartu foto radius 24px dengan kolom cari putih di dalamnya, label section uppercase, carousel dengan indikator garis progres 2px, tile editorial cara kerja & rekber | Nada hangat editorial, tanpa testimonial palsu |
| **C02a–C02f — Autentikasi & Onboarding** | Form padat, validasi inline, Google OAuth satu klik, tombol aksi jelas | Desktop split-screen dengan panel editorial lavender gradasi, Instrument Serif 44px, poin kepercayaan rekber | Validasi realtime, saran typo email, normalisasi +62 |
| **C03 — Cari** | Kolom cari sticky, segmented switch Tukang/Paket, filter bottom sheet mobile & sidebar desktop, rentang harga slider ganda | Badge pill terverifikasi, kartu foto tile `cream-100`, tipografi serif pada nama tukang & paket | URL query sync, filter area kecamatan, "Muat lebih banyak" |
| **C04 — Detail Tukang** | Galeri portofolio lightbox, bar CTA sticky bawah dengan harga paket terpilih, accordion cakupan | Breadcrumb vertikal, nama Instrument Serif 32px, cek area layanan ("Apakah alamatmu dalam jangkauan?"), opsi paket baris radio dengan harga di kanan | Tab cakupan & bio, box info rekber |
| **C05 — Form Pesanan** | Stepper 3-langkah (Detail, Ringkasan, Bayar), breakdown biaya transparan, integrasi Midtrans Snap sandbox | Rincian garis titik-titik, micro-copy hangat, kartu slot waktu bernuansa alam (Pagi/Siang/Sore) | Upload kompresi browser 0–3 foto, autosave sessionStorage |
| **C06 — Status Pembayaran** | 4 state transaksi (memproses, berhasil, menunggu instruksi VA/QRIS, gagal) dengan countdown | Judul serif besar, animasi stroke centang SVG, toast konfeti perayaan | Polling 2.5s fallback realtime |
| **C07 — Pesanan Saya** | Tab Aktif vs Riwayat dengan counter badge, kartu pesanan dengan mini stepper progres 7-langkah | Tipografi nama paket & harga, badge status bernuansa lembut | CTA kontekstual per status, pull-to-refresh mobile |
| **C08 — Detail Pesanan** | Timeline vertikal 7 langkah, bukti foto sebelum & sesudah, tombol konfirmasi selesai vs lapor masalah | Kartu status utama dengan warna lembut, dialog konfirmasi ramah, sheet komplain terstruktur (Plus: garansi rework) | Realtime update, slider sebelum/sesudah interaktif |
| **C09 — BuildMate Plus** | Tabel perbandingan Gratis vs Plus, kalkulator slider interaktif hemat biaya layanan | Hero serif anggun, kartu status membership aktif dengan progress bar sisa hari, perpanjangan mudah | Snap `SUB-` payment |
| **C10 — Akun** | Pengaturan profil inline, ganti password, riwayat pesanan & membership | Avatar bersahabat, tipografi judul serif, tautan bantuan WA | Dialog konfirmasi logout aman |
