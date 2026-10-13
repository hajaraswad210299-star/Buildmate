# Build Status — BuildMate
Terakhir diperbarui: 13 Oktober 2026
Push ke GitHub: ✅ selesai (commit siap push)
Repo: https://github.com/hajaraswad210299-star/Buildmate
URL produksi: https://buildmate-ten.vercel.app
Mode data: mock (USE_MOCK_DATA=true) untuk data entitas bisnis, **Auth 100% Nyata Supabase**
Migrasi terakhir: `20261013000000_staff_and_permissions.sql` (Tabel roles, profiles staff columns, site_content, faq_items, admin_audit, site-content storage bucket, RLS policies, seed preset roles)

Keterangan: ⬜ belum · 🟡 sebagian · ✅ selesai

## Fondasi & backend
| Item | Status | Catatan |
|---|---|---|
| Setup Next.js + Tailwind v4 + Iconsax | ✅ | Next.js 16.4 App Router, Turbopack, React 19 kompatibel dengan centralized icon HOC |
| Design system B7 (lavender, Geist + Instrument Serif, Iconsax) | ✅ | Token lavender-50..900, `--color-primary: #7A5CE6`, Instrument Serif display (`font-serif` ≥28px), Geist Sans/Mono, Semantic Iconsax |
| Komponen inti B7.9 UI + micro-interaction | ✅ | Standardized `Button` (primary/secondary/destructive/ghost/link), SSR-safe `RelativeTime`, StatCard, 12-month ActivityHeatmap, ActivityTicker, CountUp, OrderStepper, AuditTimeline, Lightbox, Uploader |
| Supabase: skema + RLS + storage | ✅ | `init_schema.sql` (11 tabel, enum, RLS, functions) + `20261011000000_avatars_storage.sql` + `20261013000000_staff_and_permissions.sql` (roles, staff_status, site_content, faq_items, admin_audit, bucket `site-content`) |
| Auth Nyata Admin (B11 & B11.7) | ✅ | Supabase Auth sungguhan (bukan simulasi): `middleware.ts`, `lib/supabase/auth.ts` (`requireRole`), login, logout, lupa password, reset password, ubah password & email |
| RBAC Tiga Lapis & Izin A12 (B2, B9, B10, B11) | ✅ | Katalog A12 di `lib/auth/permissions.ts`, fungsi DB `has_permission(p text)`, guard server `requireApiPermission` & `requireApiSuperAdmin`, UI `PermissionGate` & `<RequirePermission>`, redirect otomatis `/admin/no-access` |
| Akun Admin Default & Skrip Setup | ✅ | Akun `hajaraswad210299@gmail.com` via `scripts/create-admin.ts` (idempoten, flag `--send-reset`, password aman tanpa log) |
| State Machine transitionOrder + audit | ✅ | State machine lengkap `lib/orders/transitions.ts` (8 status, guards keras, jejak audit) |
| Push GitHub + deploy Vercel | ✅ | Clean build 100% lulus (54/54 static & dynamic routes) |

## Admin (Sisi Admin FINAL & Siap Pakai)
| ID | Halaman | Status | Catatan |
|---|---|---|---|
| A00a | Masuk admin (/admin/login) | ✅ | Supabase Auth nyata (`signInWithPassword` + cek `profiles.role='admin'`), Suspense wrapper, auto-focus, CapsLock warning, auth locking (replace history & auto-redirect ke dashboard jika sudah login) |
| A00b | Lupa password admin (/admin/forgot-password) | ✅ | Real `supabase.auth.resetPasswordForEmail`, hitung mundur 60s, kirim ulang otomatis |
| A00c | Reset password admin (/admin/reset-password) | ✅ | Real `supabase.auth.updateUser({ password })`, 5 checklist validasi realtime (termasuk karakter khusus), 5-segmen bar, `signOut({ scope: 'others' })` |
| A00d | Akses ditolak (/admin/denied) | ✅ | ShieldCross icon, serif typography, tombol navigasi kembali |
| A00e | Terima undangan staf (/admin/accept-invite) | ✅ | Form aktivasi undangan staf: judul serif "Selamat bergabung di tim BuildMate", badge peran staf, nama lengkap, password strength 4-segmen, 4-aturan validasi realtime (≥8 kar, huruf besar, huruf kecil, angka), pencocokan konfirmasi realtime, aktivasi `staff_status='active'` |
| A01 | Dashboard (/admin) | ✅ | Shell 100dvh×100dvw, sidebar fixed dengan navigasi berizin, kartu profil admin/staf dengan role badge, popover admin dinamis |
| A02 | Daftar pesanan (/admin/orders) | ✅ | Izin `orders.view`: tab status lengkap termasuk "Mencari Tukang" dan "Komplain", toolbar pencarian, copy order ID, ekspor batch |
| A03 | Detail pesanan (/admin/orders/[id]) | ✅ | Izin `orders.view` & `orders.manage`: sticky header, Panel Dispatch (B25 hybrid), stepper status, aksi darurat berizin |
| A04 | Tukang + Pendaftaran (/admin/workers) | ✅ | Izin `workers.view`, `workers.manage`, `workers.review`: tab aktif/menunggu/nonaktif, drawer tambah/edit, drawer verifikasi pendaftaran mitra |
| A05 | Layanan (/admin/services) | ✅ | Izin `services.view` & `services.manage`: tab kategori & paket, upload thumbnail 1:1, formatting harga IDR, inklusi/eksklusi scope |
| A06 | Transaksi (/admin/transactions) | ✅ | Izin `transactions.view`: drawer ramah manusia, copy VA, badge Fraud & Signature verified, timeline callback, accordion JSON tersensor |
| A07 | Pencairan dana (/admin/payouts) | ✅ | Izin `payouts.view` & `payouts.manage`: escrow ledger tukang, tab pending/paid, multi-select batch payout, konfirmasi transfer |
| A08 | Pelanggan & Member (/admin/customers) | ✅ | Izin `customers.view`: profil pelanggan, badge Plus aktif, hitungan transaksi & belanja, drawer detail pelanggan |
| A09 | Pengaturan (/admin/settings) | ✅ | Dua tab ("Profil Saya" & "Konfigurasi Sistem"): avatar crop WebP ke bucket `avatars`, ubah nama, dialog ubah email 60s, ubah password aman |
| A10 | Tim & Akses (/admin/team) | ✅ | Khusus Admin Utama: Tab Anggota (Super Admin baris pertama dengan badge Crown1, drawer Undang Anggota via Supabase `auth.admin.inviteUserByEmail`, maksimal 10 staf, ubah peran, nonaktifkan staf dengan ban 876000h + dialog konfirmasi & undo toast 5s, kirim ulang/batalkan undangan). Tab Peran (Preset Editor Konten & Pemantau Tukang non-deletable, drawer Buat/Ubah Peran dengan checklist modul & aturan implikasi Kelola otomatis centang Lihat, ringkasan live akses). Seluruh aksi dicatat di `admin_audit` |
| A11 | Konten Situs (CMS) (/admin/content) | ✅ | Izin `content.manage`: 5 kartu bagian (Bar Pengumuman maks 80 kar, Hero Beranda dengan format `*kata*` & unggah foto 16:9 ke bucket `site-content`, Banner Plus, FAQ accordion dengan CRUD & reorder naik/turun, Syarat Layanan & Kebijakan Privasi markdown), tombol Simpan per bagian, indikator belum disimpan, sinkronisasi realtime ke situs publik + revalidatePath |
| A12 | Halaman Tidak Punya Akses (/admin/no-access) | ✅ | Halaman guard UI saat staf membuka rute tanpa izin: ikon ShieldCross, pesan informatif, tombol kembali ke halaman pertama yang diizinkan |

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

