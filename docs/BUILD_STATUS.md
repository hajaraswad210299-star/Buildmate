# Build Status — BuildMate
Terakhir diperbarui: 11 Oktober 2026
Push ke GitHub: ✅ selesai (commit siap push)
Repo: https://github.com/hajaraswad210299-star/Buildmate
URL produksi: https://buildmate-ten.vercel.app
Mode data: mock (USE_MOCK_DATA=true) untuk data entitas bisnis, **Auth 100% Nyata Supabase**
Migrasi terakhir: `20261011000000_avatars_storage.sql` (Storage bucket avatars & RLS policies)

Keterangan: ⬜ belum · 🟡 sebagian · ✅ selesai

## Fondasi & backend
| Item | Status | Catatan |
|---|---|---|
| Setup Next.js + Tailwind v4 + Iconsax | ✅ | Next.js 16.4 App Router, Turbopack, React 19 kompatibel dengan centralized icon HOC |
| Design system B7 (lavender, Geist + Instrument Serif, Iconsax) | ✅ | Token lavender-50..900, `--color-primary: #7A5CE6`, Instrument Serif display (`font-serif` ≥28px), Geist Sans/Mono, Semantic Iconsax |
| Komponen inti B7.9 UI + micro-interaction | ✅ | Standardized `Button` (primary/secondary/destructive/ghost/link), SSR-safe `RelativeTime`, StatCard, 12-month ActivityHeatmap, ActivityTicker, CountUp, OrderStepper, AuditTimeline, Lightbox, Uploader |
| Supabase: skema + RLS + storage | ✅ | `init_schema.sql` (11 tabel, enum, RLS, functions) + `20261011000000_avatars_storage.sql` (bucket `avatars` publik & policy upload) |
| Auth Nyata Admin (B11 & B11.7) | ✅ | Supabase Auth sungguhan (bukan simulasi): `middleware.ts`, `lib/supabase/auth.ts` (`requireRole`), login, logout, lupa password, reset password, ubah password & email |
| Akun Admin Default & Skrip Setup | ✅ | Akun `hajaraswad210299@gmail.com` via `scripts/create-admin.ts` (idempoten, flag `--send-reset`, password aman tanpa log) |
| State Machine transitionOrder + audit | ✅ | State machine lengkap `lib/orders/transitions.ts` (8 status, guards keras, jejak audit) |
| Push GitHub + deploy Vercel | ✅ | Clean build 100% lulus (18/18 routes), repo: hajaraswad210299-star/Buildmate |

## Admin (Sisi Admin FINAL & Siap Pakai)
| ID | Halaman | Status | Catatan |
|---|---|---|---|
| A00a | Masuk admin (/admin/login) | ✅ | Supabase Auth nyata (`signInWithPassword` + cek `profiles.role='admin'`), Suspense wrapper, auto-focus, CapsLock warning, auth locking (replace history & auto-redirect ke dashboard jika sudah login) |
| A00b | Lupa password admin (/admin/forgot-password) | ✅ | Real `supabase.auth.resetPasswordForEmail`, hitung mundur 60s, kirim ulang otomatis |
| A00c | Reset password admin (/admin/reset-password) | ✅ | Real `supabase.auth.updateUser({ password })`, 5 checklist validasi realtime (termasuk karakter khusus), 5-segmen bar, `signOut({ scope: 'others' })` |
| A00d | Akses ditolak (/admin/denied) | ✅ | ShieldCross icon, serif typography, tombol navigasi kembali |
| A01 | Dashboard (/admin) | ✅ | Shell 100dvh×100dvw, sidebar fixed dengan tombol collapse di tengah saat ciut (rotasi 180°, ⌘B toggle, aria-expanded), popover admin dinamis, bfcache buster & auth state lock saat logout |
| A02 | Daftar pesanan (/admin/orders) | ✅ | Tab status lengkap termasuk "Mencari Tukang" dan "Komplain", toolbar pencarian, copy order ID, ekspor batch |
| A03 | Detail pesanan (/admin/orders/[id]) | ✅ | Sticky header full-width tanpa celah menempel topbar (transisi 72→56px saat scroll), tombol guard server (disabled + tooltip jika belum ada foto hasil), tindakan darurat berakun terpisah, Panel Dispatch (B25 hybrid) dengan pencatatan penugasan manual di riwayat tawaran, lepas tukang & cari ulang berizin |
| A04 | Tukang + Pendaftaran (/admin/workers) | ✅ | Tab aktif/menunggu/nonaktif, drawer tambah/edit 480px, drawer review verifikasi pendaftaran + portfolio lightbox, toggle status aktif |
| A05 | Layanan (/admin/services) | ✅ | Tab kategori & paket, drawer form, formatting harga IDR, inklusi/eksklusi scope |
| A06 | Transaksi (/admin/transactions) | ✅ | Drawer ramah manusia: header ID + copy, nama metode bayar manusiawi (BCA VA, GoPay, QRIS), copy VA, badge Fraud & Signature verified, timeline notifikasi callback, safe date-fns formatting ('WIB' escaped), accordion JSON audit tersensor (signature_key masked) |
| A07 | Pencairan dana (/admin/payouts) | ✅ | Escrow ledger tukang, tab pending/paid, multi-select batch payout, konfirmasi transfer |
| A08 | Pelanggan & Member (/admin/customers) | ✅ | Profil pelanggan, badge Plus aktif, hitungan transaksi & belanja, drawer detail pelanggan |
| A09 | Pengaturan (/admin/settings) | ✅ | Dua tab ("Profil Saya" default & "Konfigurasi Sistem"): avatar bundar 80px (upload ≤2MB crop WebP ke bucket `avatars`, hapus foto), ubah nama, dialog ubah email dengan timer 60s, dialog ubah password dengan verifikasi password saat ini & link lupa password |

## Customer (Sisi Pelanggan — Airbnb × Flamingo Estate Hybrid)
| ID | Halaman / Fitur | Status | Catatan |
|---|---|---|---|
| A3 | Customer Shell & Navigasi | ✅ | Announcement bar 36px dismissable, desktop navbar 72px (wordmark Instrument Serif), mobile bottom nav 64px, floating WhatsApp help button (kanan bawah, 44px pill), lavender-900 footer 4-kolom |
| C01 | Homepage (/) | ✅ | Hero editorial still-life photo card + typewriter search box, 6 kategori grid micro-interaction, carousel paket terpopuler dengan progress bar 2px, 3 langkah "Cara Kerja" bernomor gaya majalah, kartu tukang terverifikasi, diagram alur Rekber, banner BuildMate Plus, pita Mitra |
| C02a | Masuk (/login) | ✅ | Split-screen desktop (panel gradien lavender + 3 trust bullets: Rekber, Terverifikasi, Bukti Foto), Google OAuth, form email & password dengan CapsLock warning, toggle intip, link ke pendaftaran mitra |
| C02b | Daftar (/register) | ✅ | Deteksi typo domain email otomatis (gmail.co.id dsb), password strength bar 4-segmen + 5 checklist realtime, konfirmasi password, terms agreement checkbox |
| C02c | Verifikasi Email (/verify-email) | ✅ | Suspense-safe, tombol cepat "Buka Gmail" & "Buka Webmail", hitung mundur kirim ulang 60s |
| C02d | Lupa Password (/forgot-password) | ✅ | Pesan aman anti-enumerasi pengguna, timer kirim ulang 60 detik |
| C02e | Reset Password (/reset-password) | ✅ | Suspense-safe token flow, form password baru dengan live strength checklist & CapsLock warning |
| C02f | Onboarding Pelanggan (/welcome) | ✅ | Input nomor WhatsApp wajib dengan normalisasi `+62` chip, simpan nama lengkap, redirect ke riwayat atau homepage |
| C03 | Pencarian & Filter (/search) | ✅ | Typewriter search box, scrollable category chips, segmented tab Tukang \| Paket, desktop filter sidebar 280px, mobile filter bottom sheet, sinkronisasi URL query string, state kosong ramah |
| C04 | Profil & Layanan Tukang (/workers/[slug]) | ✅ | Header profil tukang (foto 1:1, badge Terverifikasi, spesialisasi, total pekerjaan selesai), bio truncate "Baca selengkapnya", galeri portofolio lightbox interaktif, pengecek jangkauan area kecamatan (B2), kartu radio paket dengan accordion inklusi/eksklusi, sticky bottom CTA bar pada mobile & desktop |
| C05 | Pemesanan 3 Langkah (/order/[packageId]) | ✅ | Stepper 3 tahap (Detail → Ringkasan → Bayar): pemilih tanggal horizontal 14 hari, slot waktu pagi/siang/sore, uploader foto masalah, alih tukang otomatis (allow_reassign default aktif), tombol bayar primary B7 lavender, kotak panduan simulator sandbox (B20), integrasi Midtrans Snap Sandbox sungguhan |
| C06 | Status Pembayaran (/payment/[orderId]) | ✅ | 4 status pembayaran C06 (Memproses, Berhasil, Menunggu, Gagal/Kedaluwarsa): status realtime Supabase + fallback polling 2.5s maks 60s, tombol Lanjutkan Pembayaran (buka Snap lagi), kotak panduan simulator sandbox, tanpa UI tiruan (B12 & B20) |
| C07 | Riwayat Pesanan (/orders) | ✅ | Tab aktif vs riwayat selesai, kartu pesanan dengan badge status B7, foto hasil ringkas, CTA kontekstual per status, tombol hubungi CS/tukang |
| C08 | Detail & Pelacakan Pesanan (/orders/[id]) | ✅ | Hero status dengan copy ramah B15, timeline 7 tahap (Pesanan Dibuat hingga Selesai), slider Before/After interaktif saat status `awaiting_confirmation`, modal persetujuan hasil kerja (trigger rilis escrow ke tukang), bottom sheet / modal ajukan komplain garansi (termasuk klaim garansi 14 hari member Plus), info tukang yang bertugas |
| C09 | BuildMate Plus (/plus) | ✅ | Landing page keanggotaan premium: kartu perbandingan benefit, slider kalkulator estimasi hemat, checkout langganan Midtrans Snap Rp29.000/30 hari, kartu status keanggotaan aktif |
| C10 | Akun & Profil (/account) | ✅ | Edit profil inline (nama, nomor WhatsApp), modal ganti password aman, status langganan BuildMate Plus, bantuan WhatsApp satu klik, modal konfirmasi keluar dengan auth lock |
| API | Endpoint Pesanan, Langganan & Webhook | ✅ | `/api/orders` (buat transaksi Midtrans Snap sungguhan via Server Key), `/api/orders/[id]` (sync data), `/api/orders/[id]/confirm`, `/api/orders/[id]/complaint`, `/api/orders/[id]/cancel`, `/api/subscriptions/checkout` (Snap order SUB-...), `/api/webhooks/midtrans` (verifikasi signature SHA-512, cocokkan gross_amount, idempoten, transisi status paid & cancel) |

## Verifikasi Tangkapan Layar (Screenshots)
- `docs/screenshots/admin-1440.png`: Dashboard resolusi 1440×700 (shell penuh, sidebar fixed dengan kartu profil, ikon aktif, metrik tanpa spasi).
- `docs/screenshots/admin-1024.png`: Dashboard resolusi 1024×700 (responsif, menu scroll mandiri, kartu profil bawah menempel).
- `docs/screenshots/admin-orders-1440.png`: Daftar pesanan dengan tab "Mencari Tukang", badge status B7, dan tombol WA.
- `docs/screenshots/admin-order-detail-1440.png`: Detail pesanan dengan sticky header full-width, B25 Panel Dispatch, stepper status, dan ringkasan biaya.

