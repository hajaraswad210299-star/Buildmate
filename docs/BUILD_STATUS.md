# Build Status — BuildMate
Terakhir diperbarui: 10 Oktober 2026
Push pertama ke GitHub: ✅ selesai
Repo: https://github.com/hajaraswad210299-star/Buildmate
URL produksi: -
Mode data: mock (USE_MOCK_DATA=true) — UI-first prototype lengkap
Migrasi terakhir: 20261010000000_init_schema.sql (siap deploy)

Keterangan: ⬜ belum · 🟡 sebagian · ✅ selesai

## Fondasi & backend
| Item | Status | Catatan |
|---|---|---|
| Setup Next.js + Tailwind v4 + Iconsax | ✅ | Next.js 16.4 App Router, Turbopack, React 19 kompatibel dengan centralized icon HOC |
| Design system B7 (lavender, Geist + Instrument Serif, Iconsax) | ✅ | Token lavender-50..900, `--color-primary: #7A5CE6`, Instrument Serif display (`font-serif` ≥28px), Geist Sans/Mono, Semantic Iconsax |
| Komponen inti B7.9 UI + micro-interaction | ✅ | Standardized `Button` (primary/secondary/destructive/ghost/link), SSR-safe `RelativeTime`, StatCard (accent dashes + tick bars), 12-month ActivityHeatmap, ActivityTicker, CountUp, OrderStepper, AuditTimeline, Lightbox, Uploader |
| Supabase: skema + RLS + seed | ✅ | `20261010000000_init_schema.sql` (11 tabel, enum, RLS, functions) + `seed.sql` (kategori, paket, tukang) |
| Auth: layar & validasi admin | ✅ | Split-screen desktop auth, 4-segmen strength meter, 60s countdown, denied page |
| transitionOrder state machine + audit | ✅ | State machine lengkap `lib/orders/transitions.ts` (8 status, guards, matrix) |
| Data Layer (Mock & Decoupled) | ✅ | Layer data lengkap untuk dashboard, orders, workers, services, transactions, payouts |
| Push GitHub + deploy Vercel | ✅ | Clean build & lint 100% lulus, repo: hajaraswad210299-star/Buildmate |

## Admin (Fase 1 — Spec v1.1 Selesai)
| ID | Halaman | Status | Catatan |
|---|---|---|---|
| A00a | Masuk admin (/admin/login) | ✅ | Split-screen brand panel, 3 poin nilai Bulk, auto-focus, CapsLock warning, shake effect |
| A00b | Lupa password admin (/admin/forgot-password) | ✅ | Hitung mundur 60s, transisi state sukses |
| A00c | Reset password admin (/admin/reset-password) | ✅ | Indikator kekuatan 4-segmen, checklist validasi realtime |
| A00d | Akses ditolak (/admin/denied) | ✅ | ShieldCross icon, serif typography, tombol navigasi |
| A01 | Dashboard (/admin) | ✅ | Shell penuh 100dvh×100dvw, sidebar fixed dengan profile popover, StatCard B7 tanpa spasi & persen koma, 5 antrean tindakan prioritas dengan ikon, ActivityHeatmap 12 bulan, ActivityTicker, grafik pesanan |
| A02 | Daftar pesanan (/admin/orders) | ✅ | Tab status lengkap termasuk "Mencari Tukang" dan "Komplain", toolbar pencarian, copy order ID, ekspor batch |
| A03 | Detail pesanan (/admin/orders/[id]) | ✅ | Panel Dispatch (B25 hybrid) dengan riwayat tawaran realtime, tugaskan manual, cari ulang, lepas tukang berizin; hitung mundur selesai otomatis; 7-step stepper; uploader & lightbox; audit timeline |
| A04 | Tukang + Pendaftaran (/admin/workers) | ✅ | Tab aktif/menunggu/nonaktif, drawer tambah/edit 480px, drawer review verifikasi pendaftaran + portfolio lightbox, toggle status aktif dengan undo toast |
| A05 | Layanan (/admin/services) | ✅ | Tab kategori & paket, drawer form, formatting harga IDR, inklusi/eksklusi scope |
| A06 | Transaksi (/admin/transactions) | ✅ | Ledger pembayaran Midtrans ORD- & SUB-, filter status/tipe, dialog JSON webhook viewer |
| A07 | Pencairan dana (/admin/payouts) | ✅ | Escrow ledger tukang, tab pending/paid, multi-select batch payout, konfirmasi transfer |
| A08 | Pelanggan & Member (/admin/customers) | ✅ | Profil pelanggan, badge Plus aktif, hitungan transaksi & belanja, drawer detail pelanggan |
| A09 | Pengaturan (/admin/settings) | ✅ | Parameter platform, biaya layanan, SLA limits, Midtrans sandbox, WhatsApp CS (read-only) |

## Verifikasi Tangkapan Layar (Screenshots)
- `docs/screenshots/admin-1440.png`: Dashboard resolusi 1440×700 (shell penuh, sidebar fixed dengan kartu profil, ikon aktif, metrik tanpa spasi).
- `docs/screenshots/admin-1024.png`: Dashboard resolusi 1024×700 (responsif, menu scroll mandiri, kartu profil bawah menempel).
- `docs/screenshots/admin-orders-1440.png`: Daftar pesanan dengan tab "Mencari Tukang", badge status B7, dan tombol WA.
- `docs/screenshots/admin-order-detail-1440.png`: Detail pesanan dengan B25 Panel Dispatch, stepper status, dan ringkasan biaya.
- `docs/screenshots/admin-1440-full.png`: Dashboard penuh menampilkan tren pesanan dan 5 baris Antrean Tindakan prioritas.
