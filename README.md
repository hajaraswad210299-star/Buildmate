# BuildMate 🛠️

Platform layanan pertukangan dan perbaikan rumah terpercaya.
Dibangun dengan Next.js 16 (App Router), Tailwind CSS v4, Supabase, dan Midtrans Sandbox.

## Fitur Utama

- **Sisi Admin (Fase 1 - Selesai):**
  - **Gaya Desain:** Terinspirasi dari Mindrift™ UI (floating panel, Geist + Instrument Serif display font, aksen brand Lavender `#7A5CE6`, *fine tick bars visualizer*, heatmap 12 bulan).
  - **Dashboard Operasional (`/admin`):** Metrik performa, ticker aktivitas langsung, antrean intervensi pesanan darurat.
  - **Manajemen Pesanan (`/admin/orders` & `/admin/orders/[id]`):** State machine 8 status (B5), stepper 7 tahap, panel foto sebelum/sesudah, komplain garansi Plus, ganti tukang darurat, autosave catatan internal.
  - **Mitra Tukang (`/admin/workers`):** Verifikasi berkas pendaftaran mitra, review portfolio lightbox, toggle status aktif.
  - **Layanan & Paket (`/admin/services`):** Kategori & paket jasa, harga Rupiah, scope inklusi/eksklusi.
  - **Transaksi & Payouts (`/admin/transactions` & `/admin/payouts`):** Midtrans webhook viewer (ORD- & SUB-), escrow ledger pencairan tukang.
  - **Keamanan & Autentikasi (`/admin/login` dkk):** Split-screen auth desktop, checklist kekuatan password 4-segmen, akses ditolak.

## Teknologi

- **Frontend:** Next.js 16.4 (Turbopack, App Router), React 19, Tailwind CSS v4, Lucide & Iconsax React, Recharts, Framer Motion.
- **Database & Auth:** Supabase PostgreSQL dengan RLS (Row Level Security) aktif.
- **Payment Gateway:** Midtrans Snap (Sandbox).

## Memulai

Jalankan server pengembangan:

```bash
npm install
npm run dev
```

Buka [http://localhost:3000/admin](http://localhost:3000/admin) di browser.
