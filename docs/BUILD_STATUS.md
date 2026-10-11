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

## Verifikasi Tangkapan Layar (Screenshots)
- `docs/screenshots/admin-1440.png`: Dashboard resolusi 1440×700 (shell penuh, sidebar fixed dengan kartu profil, ikon aktif, metrik tanpa spasi).
- `docs/screenshots/admin-1024.png`: Dashboard resolusi 1024×700 (responsif, menu scroll mandiri, kartu profil bawah menempel).
- `docs/screenshots/admin-orders-1440.png`: Daftar pesanan dengan tab "Mencari Tukang", badge status B7, dan tombol WA.
- `docs/screenshots/admin-order-detail-1440.png`: Detail pesanan dengan sticky header full-width, B25 Panel Dispatch, stepper status, dan ringkasan biaya.
