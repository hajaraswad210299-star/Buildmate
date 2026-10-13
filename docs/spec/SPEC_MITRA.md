# BuildMate — SPEC MITRA (Tukang)

> **File 3 dari 3:** `SPEC_ADMIN.md` · `SPEC_CUSTOMER.md` · `SPEC_MITRA.md`
> Versi 1.1 (Bagian A belum disesuaikan dengan dispatch otomatis B25; Bagian B sudah) · Bahasa UI: Indonesia · Mata uang: Rupiah (IDR) · Nama kode: English/snake_case
> **Bagian A** = khusus sisi mitra (tukang). **Bagian B** = fondasi bersama, **identik di ketiga file**.

---

## 0. Cara memakai file ini (untuk AI agent / developer)

1. **Urutan build global: Admin → Pelanggan → Mitra (file ini).** Fondasi dan banyak komponen (auth, uploader, timeline, status badge) seharusnya sudah ada. **Verifikasi dengan B23 dan pakai ulang**, jangan buat ulang.
2. Jalankan **protokol cek B23** di awal setiap sesi dan sebelum setiap tugas.
3. Aturan keras: status & transisi (B5), aturan bisnis (B6), autentikasi (B11), keamanan (B13). Semua divalidasi di server; aktor `worker` hanya boleh mengubah pekerjaannya sendiri.
4. Sistem tetap harus berjalan untuk **tukang dikelola admin** (tanpa akun). Portal mitra adalah lapisan tambahan, bukan pengganti.
5. Jika waktu mepet, ikuti versi pangkas di A7.
6. Setelah push pertama berhasil, tutup setiap tugas dengan alur **B22** tanpa perlu diminta.
7. **Bagian B identik di 3 file.** Jika fondasi bersama berubah, perbarui ketiga file dan catat di `docs/DECISIONS.md`.
8. Perbarui `docs/BUILD_STATUS.md` setiap tugas selesai.

9. **Terapkan praktik terbaik secara proaktif.** Pengguna bukan orang teknis. Saat mengerjakan sebuah fitur, terapkan langsung perbaikan kecil yang jelas lebih baik **pada fitur yang sedang dikerjakan** (keamanan, aksesibilitas, validasi, pesan error yang jelas, state kosong/memuat, konsistensi dengan design system), tanpa menunggu diminta. Hal di luar fitur yang sedang dikerjakan **tidak** diubah; tulis sebagai saran. Di laporan akhir setiap tugas, sertakan bagian **"Perbaikan tambahan yang diterapkan"** (apa & kenapa, bahasa awam) dan **"Saran berikutnya"**.

---

# BAGIAN A — SISI MITRA (TUKANG)

## A1. Peran mitra & prinsip pengalaman

Mitra adalah tukang individu yang mendaftar sendiri, diverifikasi admin, lalu menerima pekerjaan dari pelanggan BuildMate. Mereka memakai HP, sering di lapangan, kadang dengan sinyal lemah dan tangan sibuk.

Prinsip:
- **Satu layar, satu tindakan utama.** Tombol besar (56px) di bagian bawah layar untuk langkah berikutnya.
- **Bahasa sederhana**, tanpa istilah teknis; angka uang selalu jelas ("Kamu dapat Rp150.000").
- **Mencegah salah tekan:** aksi status memakai **geser untuk konfirmasi** (slide-to-confirm).
- **Privasi pelanggan:** alamat & kontak baru terlihat setelah pekerjaan diterima.
- **Tahan sinyal lemah:** upload dengan progress & coba ulang; aksi tidak terkirim dua kali.

Visual mengikuti gaya sisi pelanggan (mobile-first), dengan token brand B7.

---

## A2. Layout & navigasi

- **Lebar:** dirancang untuk 360–430px. Di desktop, konten di tengah dengan lebar maksimum 480px di atas latar `neutral-50`.
- **Top bar** 56px: sapaan / judul halaman + badge status verifikasi (`Verify`) atau tombol kembali.
- **Bottom nav** 64px + safe-area: `Home2` Beranda · `Briefcase` Pekerjaan (badge jumlah tawaran baru) · `Wallet3` Pendapatan · `ProfileCircle` Profil. Item aktif: ikon **Bold** `lavender-600`, label 12/600, pill `lavender-50`.
- Halaman detail pekerjaan menyembunyikan bottom nav dan menampilkan **bar aksi** sticky 88px + safe-area.
- Padding 16px; kartu radius 14px; tombol utama tinggi 56px.

**Micro-interaction navigasi:** pill aktif meluncur; ikon Linear → Bold dengan scale; badge Pekerjaan "bump" + getar 30ms saat tawaran baru masuk via realtime; transisi halaman geser kiri/kanan.

---

## A3. Autentikasi mitra

Metode: **email + password** dan **Google**. Area mitra terpisah dari pelanggan (B11).

**Tata letak semua halaman auth mitra:** sama dengan `AuthLayout` pelanggan, dengan konten panel visual: judul Instrument Serif "Dapat pekerjaan, *dibayar aman*." dan 3 poin dengan ikon Bulk: `Briefcase` Pekerjaan dari pelanggan sekitar, `WalletMoney` Dana dijamin setelah pekerjaan selesai, `Verify` Profil terverifikasi tampil ke pelanggan. Tautan kecil di bawah: "Bukan tukang? Masuk sebagai pelanggan →".

### W00a — Masuk mitra `/mitra/login`
- Judul serif "Masuk sebagai Mitra". Tombol **Lanjutkan dengan Google** (`/auth/callback?next=/mitra&as=worker`), pemisah, field **Email** & **Password**, tautan "Lupa password?" → W00d, tombol **Masuk**, footer "Belum jadi mitra? **Daftar**".
- Setelah masuk (B11.8): worker `approved` → `/mitra`; worker `draft`/`rejected` → `/mitra/daftar`; worker `pending` → `/mitra/status`; akun customer → pesan "Email ini terdaftar sebagai akun pelanggan. Gunakan email lain untuk mendaftar sebagai mitra." + tautan ke beranda pelanggan; admin → `/admin`.
- **Micro-interaction:** sama dengan halaman masuk pelanggan (fokus, getar saat gagal, spinner, Caps Lock).

### W00b — Daftar akun mitra `/mitra/register`
- Judul serif "Gabung jadi Mitra BuildMate"; subjudul "Gratis, tanpa biaya pendaftaran."
- Tombol Google (`as=worker`) + pemisah.
- Field: **Nama lengkap**, **Email**, **Nomor WhatsApp** (+62, dinormalisasi), **Password** + kekuatan + checklist, **Konfirmasi password**, checkbox persetujuan syarat mitra.
- `signUp` dengan metadata `{ full_name, phone, signup_as: 'worker' }`, `emailRedirectTo` → `/auth/callback?next=/mitra/daftar` → W00c.
- **Micro-interaction:** sama dengan daftar pelanggan.

### W00c — Verifikasi email `/mitra/verify-email?email=`
Sama dengan C02c (ikon `SmsTracking`, Kirim ulang 60 detik, Buka Gmail, Ubah email). Setelah verifikasi → W01.

### W00d — Lupa password `/mitra/forgot-password`
Sama dengan C02d, `redirectTo` → `/auth/callback?next=/mitra/reset-password`.

### W00e — Reset password `/mitra/reset-password`
Sama dengan C02e; sukses → `/mitra`.

---

## A4. Inventaris screen mitra

Setiap screen wajib: skeleton, empty state dengan langkah berikutnya, error dengan coba lagi, nyaman di 360px, target sentuh ≥ 48px.

### W01 — Formulir pendaftaran mitra `/mitra/daftar`
Hanya untuk worker dengan status `draft` atau `rejected` (atau belum punya baris `workers`).
- Stepper 4 langkah di atas + indikator **"Draf tersimpan"** (autosave ke `PUT /api/mitra/application`, debounce 1 detik).
- **Langkah 1 — Data diri:** nama (prefill), nomor WA (prefill), area layanan (pilih dari daftar area), pengalaman (stepper tahun − / +), deskripsi singkat pengalaman (maks 300 karakter).
- **Langkah 2 — Layanan:** kartu kategori (multi-pilih, ikon Bulk) → daftar paket per kategori terpilih (checkbox, harga ditampilkan sebagai "Kamu dapat Rp…"). Minimal 1 paket.
- **Langkah 3 — Foto:** foto profil wajib (panduan: wajah jelas, latar terang; crop bulat dengan slider zoom), portofolio opsional maks 3.
- **Langkah 4 — Tinjau & kirim:** ringkasan per bagian dengan tautan "Ubah"; checkbox wajib "Saya setuju profil saya ditampilkan ke pelanggan setelah disetujui" dan "Data saya dipakai untuk koordinasi pekerjaan".
- **Kirim** → `POST /api/mitra/application/submit` → status `pending` → W02.
- Pendaftar yang ditolak masuk ke sini dengan isian sebelumnya + banner alasan penolakan.
- **Jangan** meminta foto KTP atau nomor identitas (simulasi).

**Micro-interaction:** garis stepper terisi; konten langkah bergeser; indikator autosave "Menyimpan…" → "Draf tersimpan" dengan `TickCircle`; kartu kategori terpilih → border lavender + centang pop; crop dengan zoom halus; kirim → ikon `Send2` "terbang" lalu transisi ke W02.

### W02 — Status pendaftaran `/mitra/status`
State:
- **Menunggu verifikasi:** timeline 3 langkah (Terkirim ✓ → Ditinjau tim, aktif & berdenyut → Disetujui), teks "Biasanya ditinjau dalam 1×24 jam.", ringkasan data, tombol "Hubungi BuildMate" (WA).
- **Ditolak:** ikon `InfoCircle` warning, alasan penolakan, tombol **Perbaiki & ajukan ulang** → status kembali `draft` → W01.
- **Disetujui:** judul serif "Selamat, kamu resmi jadi *Mitra BuildMate*!", badge `Verify` jika terverifikasi, tombol **Mulai terima pekerjaan** → W03.

Pembaruan status lewat Realtime baris `workers` (fallback polling 30 detik).
**Micro-interaction:** langkah aktif berdenyut; saat disetujui (realtime) → konfeti kecil + badge pop + getar 30ms.

### W03 — Beranda mitra `/mitra`
- Sapaan serif "Halo, *{nama depan}*" + badge verifikasi.
- **Ringkasan** (3 kartu, count-up): Pekerjaan bulan ini · Pendapatan bulan ini · Menunggu pencairan.
- **Tawaran baru** (`JobOfferCard`): ikon kategori, nama paket, area (tanpa alamat), tanggal + slot, **nominal hak tukang** besar ("Kamu dapat Rp150.000"), "Ditawarkan {n} mnt lalu", tombol **Tolak** (sekunder) dan **Terima** (utama).
  - Terima → dialog ringkas "Terima pekerjaan ini?" → sukses: kartu berubah menjadi pekerjaan aktif dan alamat terbuka.
  - Tolak → bottom sheet alasan (Jadwal bentrok · Lokasi terlalu jauh · Di luar keahlian · Lainnya + teks) → konfirmasi.
- **Hari ini:** pekerjaan aktif dengan tombol langkah berikutnya.
- **Mendatang:** daftar ringkas.
- Empty: ikon `Briefcase` Bulk, "Belum ada tawaran. Pastikan profilmu lengkap agar mudah ditemukan." + tombol **Lihat profil**.

**Micro-interaction:** tawaran baru masuk via realtime → kartu meluncur dari atas dengan glow lavender + getar 30ms; angka ringkasan count-up; terima → kartu membesar dan bagian alamat terbuka dari blur (6px → 0); tolak → kartu tergeser keluar ke kiri.

### W04 — Daftar pekerjaan `/mitra/jobs`
Tab **Tawaran · Aktif · Selesai** (dengan jumlah). `JobCard`: badge status, paket, area/alamat (sesuai status), jadwal, nominal. Tab Selesai: filter bulan.
**Micro-interaction:** pill tab meluncur; daftar muncul berurutan; tarik untuk memuat ulang.

### W05 — Detail pekerjaan `/mitra/jobs/[id]`
**Struktur:**
1. Header: kode pesanan + badge status.
2. **Nominal hak tukang** besar (count-up): "Kamu dapat **Rp150.000**". Keterangan: "Dibayar setelah pelanggan mengonfirmasi pekerjaan selesai."
3. Paket & cakupan (Termasuk / Tidak termasuk), jadwal (`Calendar1`, `Clock`), deskripsi masalah, foto masalah (lightbox).
4. **Pelanggan:**
   - Sebelum menerima: area saja + ikon `Lock` "Alamat dan kontak tampil setelah kamu menerima pekerjaan."
   - Setelah menerima: nama, alamat, tombol **Buka di Maps** (`Map1` → `https://www.google.com/maps/search/?api=1&query={alamat}`), tombol **Chat pelanggan** (`Whatsapp`, template B15).
5. **Foto hasil:** daftar foto hasil yang sudah diunggah.
6. Timeline pekerjaan.
7. "Butuh bantuan? Hubungi admin BuildMate" (WA).

**Bar aksi sticky (satu aksi utama per status):**
| Status | Aksi |
|---|---|
| `paid` + respons `pending` | **Tolak** (sekunder) · **Terima** (utama) |
| `worker_confirmed` | Geser: **"Geser — saya berangkat"** → `on_the_way` |
| `on_the_way` | Geser: **"Geser — mulai kerja"** → `in_progress` |
| `in_progress` | **Unggah foto hasil** (kamera/galeri, maks 3) → setelah ≥ 1 foto: geser **"Geser — tandai selesai"** → `awaiting_confirmation` |
| `awaiting_confirmation` | Info: "Menunggu konfirmasi pelanggan. Biasanya dalam 24 jam." |
| `completed` | Info: "Selesai · Rp150.000 menunggu pencairan" / "sudah dicairkan {tanggal}" |
| `cancelled` | Info: alasan pembatalan |

**Slide-to-confirm (`SlideToConfirm`):** track 56px, thumb dengan `ArrowRight3`, teks petunjuk memudar saat digeser; melewati 85% → terkunci, getar 30ms, thumb berubah spinner lalu `TickCircle`; dilepas sebelum 85% → kembali dengan efek pegas. Aksesibilitas: thumb bisa difokus; Enter/Space membuka dialog konfirmasi sebagai alternatif.

**Micro-interaction lain:** bar aksi berganti ke aksi berikutnya dengan slide-up; upload foto dengan progress & coba ulang otomatis saat gagal; alamat terbuka dari blur setelah menerima; perubahan status oleh admin/pelanggan masuk via realtime dengan toast.

**Acceptance:** tukang hanya bisa membuka pekerjaan miliknya (API 403 untuk lainnya); alamat & nomor pelanggan tidak dikirim ke browser sebelum menerima; "tandai selesai" ditolak server tanpa foto hasil; aksi ganda (dobel geser/klik) tidak menghasilkan dua transisi.

### W06 — Pendapatan `/mitra/earnings`
- Hero: total sudah dicairkan (Geist 36/600, count-up) + filter periode (Bulan ini · 3 bulan · Semua).
- Kartu: **Menunggu pencairan** · **Bulan ini**.
- Grafik batang kecil 6 bulan terakhir (`lavender-500`).
- Daftar per pesanan: kode, paket, tanggal selesai, nominal, status (Menunggu / Dicairkan {tanggal}).
- Info: "Pencairan dicatat oleh tim BuildMate (simulasi, tanpa transfer sungguhan)."

**Micro-interaction:** count-up; batang tumbuh dari bawah; baris yang berubah ke "Dicairkan" via realtime berkedip hijau lembut + toast "Dana Rp150.000 sudah dicairkan".

### W07 — Profil mitra `/mitra/profile`
- Kartu pratinjau profil seperti yang dilihat pelanggan + tautan "Lihat sebagai pelanggan" (`/workers/{slug}`).
- Bisa diubah sendiri (autosave): foto profil, bio, portofolio.
- Hanya-baca: kategori, paket, area — tombol **Ajukan perubahan** (WA admin dengan template).
- Akun: email, metode masuk, **Ubah password**, **Keluar**.

**Micro-interaction:** autosave indikator; pratinjau kartu ikut berubah saat bio/foto diedit.

---

## A5. Komponen khusus mitra

| Komponen | Isi & perilaku |
|---|---|
| `MitraShell` | Top bar + bottom nav + lebar maks 480px |
| `ApplicationStepper` | Stepper 4 langkah + autosave |
| `CategoryPickCard` | Kartu kategori multi-pilih |
| `AvatarCropper` | Crop bulat + zoom |
| `ApplicationStatusTimeline` | Timeline status pendaftaran |
| `JobOfferCard`, `JobCard` | Kartu tawaran & pekerjaan |
| `DeclineSheet` | Bottom sheet alasan menolak |
| `SlideToConfirm` | Geser untuk konfirmasi + alternatif keyboard |
| `StickyActionBar` | Bar aksi per status |
| `EarningsChart` | Grafik batang pendapatan |

Pakai ulang dari sisi lain: `AuthLayout`, `PasswordField`, `PasswordStrength`, `GoogleButton`, `ResendButton`, `PhoneField`, `PhotoUploader`, `PhotoLightbox`, `StatusBadge`, `OrderStepper`, `StatCard`.

---

## A6. API khusus mitra (ringkas, detail di B10)

- `GET/PUT /api/mitra/application` — ambil & simpan draf pendaftaran.
- `POST /api/mitra/application/submit` — kirim pendaftaran (`draft` → `pending`).
- `GET /api/mitra/jobs?tab=` — pekerjaan milik mitra (alamat & kontak disaring sebelum diterima).
- `POST /api/mitra/jobs/[id]/accept` · `/decline` · `/status` — memanggil `transition_order` dengan aktor `worker`.
- `POST /api/orders/[id]/photos` (type `result`) — unggah foto hasil.
- `GET /api/mitra/earnings?range=` — ringkasan & daftar payout.
- `PATCH /api/mitra/profile` — bio, foto, portofolio.

---

## A7. Urutan pengerjaan sisi mitra

1. Verifikasi fondasi & komponen yang bisa dipakai ulang (B23).
2. **Auth mitra:** W00a–W00e + klaim role worker untuk Google (B11.6) + middleware area mitra.
3. **Pendaftaran:** W01 (autosave) → W02 → tab Pendaftaran di admin A04 (jika belum ada).
4. **Bekerja:** W03 → W05 (tawaran, slide-to-confirm, unggah foto hasil) → W04.
5. **Uang & profil:** W06 → W07.

**Versi pangkas (jika waktu mepet):** W00a–W00e, W01, W02, W05 (dibuka dari tautan WA admin) — W03 cukup daftar tawaran sederhana; W04, W06, W07 dilewati. Tukang lain tetap "dikelola admin".

Tutup setiap tugas dengan alur B22.

---

## A8. Acceptance sisi mitra

- [ ] Daftar akun (email+password & Google) → verifikasi → formulir → pending → disetujui admin → profil tampil di pencarian pelanggan.
- [ ] Akun pelanggan tidak bisa masuk ke `/mitra/*`; mitra pending tidak bisa membuka pekerjaan.
- [ ] Tawaran: terima & tolak berfungsi; alamat hanya terlihat setelah menerima.
- [ ] Alur berangkat → mulai → foto hasil → tandai selesai berjalan, terlihat realtime di sisi pelanggan & admin.
- [ ] Pendapatan bertambah setelah pelanggan konfirmasi dan berubah status saat admin mencairkan.
- [ ] Mitra A tidak bisa melihat/mengubah pekerjaan mitra B (uji API).
- [ ] Slide-to-confirm bisa dipakai dengan sentuhan dan keyboard; reduced-motion dihormati.

---

# BAGIAN B — FONDASI BERSAMA

> Identik di `SPEC_ADMIN.md`, `SPEC_CUSTOMER.md`, dan `SPEC_MITRA.md`. Jika ada perubahan, perbarui ketiga file sekaligus dan catat di `docs/DECISIONS.md`.

- B1. Ringkasan produk & konteks challenge
- B2. Role, pemisahan akun & akses
- B3. Model bisnis (simulasi)
- B4. Alur end-to-end
- B5. Status pesanan & transisi (ATURAN KERAS)
- B6. Aturan bisnis & pengecualian
- B7. Design system
- B8. Micro-interaction & gerak (global)
- B9. Data model (Supabase PostgreSQL)
- B10. API / server actions
- B11. Autentikasi (semua role)
- B12. Pembayaran Midtrans Snap & webhook (logika)
- B13. Keamanan & RLS
- B14. Tech stack, environment & arsitektur kode
- B15. Copy UI & template WhatsApp
- B16. Timeline, urutan global, Definition of Done & demo
- B17. Seed data
- B18. Risiko, di luar scope & keputusan terbuka
- B19. Panduan setup database online (Supabase)
- B20. Panduan menghubungkan Midtrans Sandbox
- B21. Panduan push GitHub & deploy Vercel (pertama kali)
- B22. Alur kerja setelah push pertama: auto-push & sinkron database
- B23. Protokol cek sebelum membangun (jangan bangun ulang)
- B24. Checklist sebelum demo
- B25. Dispatch otomatis (model hybrid) & penjadwal

---

## B1. Ringkasan produk & konteks challenge

**BuildMate** adalah marketplace jasa tukang versi lite ("Gojek untuk tukang") untuk perbaikan rumah ringan, dengan tiga sisi:

| Sisi | Siapa | Inti kebutuhan |
|---|---|---|
| **Pelanggan** | Pemilik/penghuni rumah | Menemukan tukang yang tepat, harga pasti, bayar aman, bukti pekerjaan selesai |
| **Tukang (Mitra)** | Tukang individu | Mendapat pekerjaan, update progres dengan mudah, melihat pendapatan |
| **Admin** | Operator BuildMate | Satu pintu: verifikasi mitra, kelola katalog, pantau & intervensi pesanan, cairkan dana |

- **Core promise:** Cari tukang sesuai kebutuhan, bayar aman, dana baru diteruskan ke tukang setelah pekerjaan dikonfirmasi selesai.
- **Sifat proyek:** simulasi. Pembayaran memakai **Midtrans Sandbox** (tidak ada uang sungguhan). Pencairan dana dicatat di ledger.
- **Dua mode tukang:** (a) **Mitra berakun** — mendaftar sendiri, diverifikasi admin, mengupdate progres di portal; (b) **Tukang dikelola admin** — data dummy tanpa akun, progres diupdate admin berdasarkan kabar WhatsApp. Keduanya didukung sistem yang sama.

### Alur inti (happy path)
Cari layanan → pilih tukang & paket harga tetap → isi detail + foto masalah → bayar (Snap sandbox) → webhook set **Dibayar** (dana ditahan) → tukang menerima tawaran → berangkat → mengerjakan → unggah foto hasil → pelanggan melihat foto sebelum/sesudah dan konfirmasi → ledger pencairan dibuat → admin tandai dicairkan → tukang melihat pendapatannya.

**Dispatch otomatis:** setelah dibayar, sistem menawarkan pesanan ke tukang secara berurutan (tukang favorit pelanggan lebih dulu) dan melempar ke tukang berikutnya jika ditolak atau tidak direspons (B25).

### Konteks challenge & target

Proyek untuk **Internal Solo SaaS Challenge: "From Zero to Live SaaS"** (solo, 3 minggu kerja, checkpoint tiap Jumat).

| Badge | Syarat | Cara BuildMate memenuhinya |
|---|---|---|
| Bronze | Auth user | Supabase Auth (email + password / Google), 3 role dicek di server |
| Bronze | Core feature berfungsi | Cari → pesan → progres → konfirmasi selesai |
| Bronze | Live URL + HTTPS | Deploy Vercel sejak hari pertama |
| Silver | Payment gateway sandbox | Midtrans Snap Sandbox (pesanan + membership Plus) |
| Silver | Tiered plan / paywall | Gratis vs **BuildMate Plus**, dikunci di server |
| Silver | Webhook | Notifikasi Midtrans: verifikasi signature, idempotent, update DB |
| Gold | Multi-tenancy + RBAC | **Tidak dikejar** |

**Target: Silver.** Penjurian: Product Value 35%, UX & Design 35%, Robustness 15%, Pitching 15%.

---

## B2. Role, pemisahan akun & akses

Satu sistem login (Supabase Auth) dengan **empat role** di `profiles.role`. Satu akun = satu role.

| Role | Cara mendapat akun | Area aplikasi | Metode masuk |
|---|---|---|---|
| `customer` | Daftar di `/register` (email+password) atau Google dari halaman pelanggan | `/`, `/search`, `/workers/*`, `/order/*`, `/payment/*`, `/orders/*`, `/plus`, `/account`, `/welcome` | Email+password, Google |
| `worker` | Daftar akun di `/mitra/register` (email+password) atau Google dari halaman mitra → isi formulir `/mitra/daftar` → `pending` → disetujui admin | `/mitra/*` | Email+password, Google |
| `admin` (**Admin Utama**) | **Tidak bisa daftar sendiri.** Satu orang saja; dibuat lewat skrip (B11.7), dipindahkan lewat "Pindahkan akses admin" | `/admin/*` (semua) | Email+password saja |
| `staff` (Staf admin) | **Diundang Admin Utama** (A10), peran & hak akses diatur di A10–A12 | `/admin/*` sesuai izin | Email+password saja |

Aturan:
- Role **tidak pernah** diambil dari input browser; selalu dari `profiles` di server.
- Tukang yang ingin juga memesan sebagai pelanggan memakai email lain.
- Tukang yang belum `approved` hanya bisa membuka `/mitra/daftar` dan `/mitra/status`.
- Tukang **dikelola admin** (tanpa akun) tetap didukung: `workers.user_id = null`, semua aksinya dilakukan admin.

### Matriks akses
| Aksi | Pelanggan | Tukang (approved) | Admin |
|---|---|---|---|
| Cari & lihat tukang / paket | Ya | Ya | Ya |
| Buat & bayar pesanan, berlangganan Plus | Ya (milik sendiri) | Tidak | Tidak |
| Lihat pesanan | Milik sendiri | Yang ditugaskan ke dirinya | Semua |
| Terima / tolak tawaran pekerjaan (dispatch otomatis, B25) | — | Ya | Tugaskan manual / cari ulang |
| Update progres (berangkat, mulai, selesai) | — | Ya (pekerjaannya) | Ya (semua) |
| Unggah foto hasil | Opsional (foto tambahan saat konfirmasi) | Ya | Ya |
| Konfirmasi selesai / lapor masalah | Ya | — | Selesaikan setelah batas waktu |
| Lihat alamat & nomor pelanggan | Milik sendiri | Hanya setelah menerima pekerjaan | Ya |
| Kelola katalog, verifikasi mitra | — | — | Ya |
| Lihat pendapatan / pencairan | — | Milik sendiri | Semua, dan mencatat pencairan |

---

## B3. Model bisnis (simulasi)

### Paket harga tetap
| Kategori | Paket | Harga |
|---|---|---|
| Plumbing | Ganti keran | Rp150.000 |
| Plumbing | Bersihkan saluran mampet | Rp200.000 |
| Plumbing | Perbaiki kebocoran pipa kecil | Rp175.000 |
| Pengecatan | Cat ulang dinding s.d. 10 m² | Rp350.000 |
| Pengecatan | Touch-up cat area kecil | Rp150.000 |
| Perbaikan Umum | Perbaiki engsel / pintu | Rp100.000 |
| Perbaikan Umum | Pasang rak dinding | Rp120.000 |

Pekerjaan di luar cakupan tidak ditagih lewat aplikasi (dicatat sebagai catatan).

### Biaya & pembagian
- **Biaya layanan:** Rp5.000 per pesanan (Gratis), Rp0 (Plus).
- **Hak tukang** = harga paket. **Pendapatan platform** = biaya layanan + pembayaran Plus.
- Harga paket & biaya layanan disimpan sebagai **snapshot** di pesanan.

### Membership BuildMate Plus (Rp29.000 / 30 hari)
| Fitur | Gratis | Plus |
|---|---|---|
| Pesan layanan | Ya | Ya |
| Biaya layanan | Rp5.000 | Rp0 |
| Lapor masalah | Ya | Ya |
| Garansi pengerjaan ulang 7 hari | Tidak | Ya |
| Badge Plus | Tidak | Ya |

Dibayar sekali per 30 hari (bukan recurring). Aktif jika `subscriptions.current_period_end > now()`.

### Rekber (escrow) simulasi
Webhook sukses → **Dibayar** (dana ditahan) → **Selesai** → baris `payouts` `pending` → admin "Tandai sudah dicairkan" → `paid` → muncul di Pendapatan tukang.

---

## B4. Alur end-to-end

### 6.1 Pelanggan
Beranda → Cari → pilih **paket** (opsional: tukang favorit dari profil tukang) → Form pesanan (centang "boleh dialihkan") → Bayar (Snap popup) → Status pembayaran → Detail pesanan: **"Mencari tukang…"** → "Tukang ditemukan" → timeline realtime → lihat foto sebelum/sesudah → **Pesanan selesai** / **Ada masalah**.

### 6.2 Tukang (mitra berakun)
1. **Pendaftaran:** daftar akun di `/mitra/register` (email + password atau Google) → verifikasi email → isi formulir `/mitra/daftar` (autosave draf) → kirim → status **Menunggu verifikasi**.
2. **Verifikasi:** admin meninjau → **Disetujui** (profil tampil publik) atau **Ditolak** (dengan alasan).
3. **Bekerja:** dispatch otomatis (B25) mengirim **Tawaran baru** yang langsung muncul di aplikasi (realtime, dengan hitung mundur) → Terima / Tolak (atau kedaluwarsa → dilempar ke tukang lain) → Berangkat → Mulai kerja → Unggah foto hasil & tandai selesai → menunggu konfirmasi pelanggan (atau selesai otomatis).
4. **Pendapatan:** setelah pesanan selesai, hak muncul sebagai **Menunggu pencairan**, lalu **Sudah dicairkan** setelah admin mencatat.

Tidak ada push notification saat aplikasi tertutup (di luar scope MVP). Tawaran tampil realtime selama aplikasi mitra terbuka.

### 6.3 Tukang dikelola admin (tanpa akun)
Tidak ikut dispatch otomatis. Admin menugaskan manual saat dispatch habis, lalu mengupdate progres atas nama tukang berdasarkan kabar WhatsApp.

### 6.4 Admin
Admin adalah **pengawas & penyelesai masalah**; dalam alur normal pesanan berjalan sendiri. Tugas admin: verifikasi mitra → kelola katalog → tangani pengecualian dispatch (tugaskan manual / cari ulang / lepas tukang) → tangani komplain → batal + refund bila perlu → catat pencairan → pantau dashboard & transaksi.

### 6.5 Membership Plus
Halaman Plus → Berlangganan → Snap (`SUB-`) → webhook → `current_period_end` diperpanjang → biaya layanan Rp0 & garansi terbuka.

---

## B5. Status pesanan & transisi (ATURAN KERAS)

| Status (enum) | Label UI | Makna |
|---|---|---|
| `pending_payment` | Menunggu pembayaran | Pesanan dibuat, belum dibayar |
| `paid` | Dibayar · Mencari tukang | Webhook sukses; dana ditahan; dispatch otomatis berjalan (B25) |
| `worker_confirmed` | Tukang dikonfirmasi | Tukang menerima, jadwal disepakati |
| `on_the_way` | Dalam perjalanan | Tukang menuju lokasi |
| `in_progress` | Sedang dikerjakan | Pekerjaan berlangsung |
| `awaiting_confirmation` | Menunggu konfirmasi | Foto hasil ada, menunggu pelanggan |
| `completed` | Selesai | Pekerjaan diterima; payout dibuat |
| `cancelled` | Dibatalkan | Batal; refund dicatat bila sudah bayar |

Satu-satunya jalan mengubah status: fungsi server **`transitionOrder(orderId, toStatus, actor, payload)`**.

```ts
// lib/orders/transitions.ts
export type OrderStatus =
  | 'pending_payment' | 'paid' | 'worker_confirmed' | 'on_the_way'
  | 'in_progress' | 'awaiting_confirmation' | 'completed' | 'cancelled';

export type Actor = 'system' | 'webhook' | 'admin' | 'customer' | 'worker';

export const TRANSITIONS: Record<OrderStatus, Partial<Record<OrderStatus, Actor[]>>> = {
  pending_payment:       { paid: ['webhook'], cancelled: ['webhook', 'system', 'customer'] },
  paid:                  { worker_confirmed: ['worker', 'admin'], cancelled: ['admin'] },  // worker: accept_offer; admin: tugaskan manual
  worker_confirmed:      { on_the_way: ['worker', 'admin'], cancelled: ['admin'], paid: ['admin'] },  // paid = lepas tukang & cari ulang
  on_the_way:            { in_progress: ['worker', 'admin'] },
  in_progress:           { awaiting_confirmation: ['worker', 'admin'] },  // wajib foto hasil
  awaiting_confirmation: { completed: ['customer', 'system', 'admin'],   // system: auto_complete_tick; admin: override setelah batas waktu
                           in_progress: ['admin'] },                     // garansi Plus
  completed:             {},
  cancelled:             {},
};
```

Guard di dalam `transitionOrder` (dalam satu transaksi database / Postgres RPC):
- Aktor `worker` hanya boleh mengubah pesanan dengan `orders.worker_id` = worker miliknya.
- `in_progress → awaiting_confirmation`: tolak jika belum ada `order_photos` bertipe `result`.
- `awaiting_confirmation → completed` oleh admin: hanya jika `now() - awaiting_confirmation_at >= AUTO_COMPLETE_MINUTES`, tidak ada komplain `open`, catatan wajib. Set `completed_by='admin'`.
- `awaiting_confirmation → completed` oleh customer: hanya pemilik, tidak ada komplain `open`. Set `completed_by='customer'`.
- Tawaran, penolakan, kedaluwarsa, dan pengalihan tukang diatur oleh **dispatch otomatis (B25)**; status pesanan tetap `paid` selama pencarian.
- `awaiting_confirmation → completed` oleh system: dijalankan `auto_complete_tick()` (B25.4). Set `completed_by='system'`.
- `worker_confirmed → paid` (admin): kosongkan `worker_id`, catat `worker_released`, mulai dispatch lagi.
- Masuk `completed`: buat `payouts` (amount = `package_price`).
- Masuk `cancelled` setelah `paid`: `payments.status='refunded'` (simulasi), `cancel_reason` wajib.
- Set timestamp: `paid_at`, `worker_confirmed_at`, `on_the_way_at`, `in_progress_at`, `awaiting_confirmation_at`, `completed_at`, `cancelled_at`.
- Setiap transisi menulis `order_events` (from, to, actor_type, actor_id, note).

---

## B6. Aturan bisnis & pengecualian

1. Status `paid` **hanya** diset webhook dengan signature valid.
2. Hanya tukang `approved` + `is_active` dan paket aktif yang tampil publik. Tukang nonaktif tetap ada di riwayat.
3. Harga = snapshot.
4. Foto hasil wajib sebelum `awaiting_confirmation`.
5. Komplain `open` → dana tetap ditahan, pesanan tidak bisa diselesaikan.
6. Pembatalan hanya sampai `worker_confirmed`.
7. Pengalihan tukang otomatis hanya jika `allow_reassign=true`; jika tidak, pengalihan oleh admin wajib dicatat sebagai sudah disetujui pelanggan (event `worker_released` / `worker_assigned_manual`).
8. Status final tidak bisa diubah dari UI.
9. Paywall Plus dihitung di server.
10. Tukang baru melihat alamat & nomor pelanggan setelah menerima pekerjaan.
11. Tukang tidak bisa mengubah kategori/paket/area sendiri setelah disetujui; perubahan lewat admin.
12. Label "Terverifikasi" hanya jika admin benar-benar meninjau dan mencatatnya. Jangan tampilkan rating/jumlah pekerjaan fiktif; jumlah pekerjaan selesai dihitung dari DB.

| Kasus | Respons |
|---|---|
| Pembayaran expire / gagal | Webhook `expire`/`cancel`/`deny` → `cancelled`; bisa pesan ulang |
| Webhook berulang | Diabaikan (`payments.provider_order_id UNIQUE` + cek status) |
| Tukang tidak merespons tawaran | Tawaran kedaluwarsa otomatis → dilempar ke tukang berikutnya (B25) |
| Tukang menolak | Dilempar otomatis ke tukang berikutnya (B25); jika `allow_reassign=false` → antrean admin |
| Tidak ada tukang yang menerima | `dispatch_status='exhausted'` → antrean admin: tugaskan manual / cari ulang / batal + refund |
| Tukang berhalangan setelah menerima | Admin: Lepas tukang & cari ulang (B25.3 langkah 6) |
| Pelanggan tidak merespons | Setelah `AUTO_COMPLETE_MINUTES` tanpa komplain, sistem menyelesaikan otomatis (B25.4) |
| Komplain (Gratis) | Admin tindak lanjut via WA → selesai atau batal + refund |
| Komplain (Plus) | Garansi: kembali ke `in_progress` |
| Upload gagal | Validasi JPEG/PNG/WebP, maks 5 MB, retry; tidak duplikat |
| Klik bayar dua kali | Satu pesanan satu Snap token aktif; tombol dikunci |
| Pendaftaran mitra ganda | Satu `user_id` hanya satu baris `workers` |

---

## B7. Design system

Semua sisi (admin, pelanggan, mitra) memakai design system yang sama. **Token di bagian ini selalu menang** atas referensi visual mana pun.

### B7.1 Warna brand — Lavender
| Token | Hex | Pemakaian |
|---|---|---|
| `lavender-50` | `#F7F5FF` | Latar lembut, item nav aktif (pelanggan/mitra), tint status |
| `lavender-100` | `#EFEBFF` | Latar chip terpilih, hover lembut |
| `lavender-200` | `#E0D8FF` | Border terpilih lembut, seri grafik sekunder |
| `lavender-300` | `#C9BBFF` | Ring fokus, ilustrasi |
| `lavender-400` | `#AC97FB` | Ikon Bulk (lapisan terang) |
| `lavender-500` | `#9277F2` | Seri grafik utama, aksen dekoratif, ikon aktif besar |
| `lavender-600` | `#7A5CE6` | **Primary**: tombol utama, tautan, ikon aktif, badge |
| `lavender-700` | `#6447C7` | Hover tombol, teks lavender di latar terang |
| `lavender-800` | `#4F38A0` | Tombol ditekan, teks di atas `lavender-100` |
| `lavender-900` | `#3D2C7A` | Teks judul di atas gradasi lavender |

**Aturan kontras:** teks putih hanya di atas `lavender-600` atau lebih gelap. Teks lavender di atas putih minimal `lavender-600`. `lavender-500` ke bawah hanya untuk dekorasi, ikon besar, dan grafik.

**Gradasi brand:** `linear-gradient(135deg, #F7F5FF 0%, #E0D8FF 100%)` (panel auth, banner Plus); versi kuat `linear-gradient(135deg, #7A5CE6 0%, #9277F2 100%)` (tombol berlangganan, header Plus).

### B7.2 Netral (bersemu lavender)
| Token | Hex | Pemakaian |
|---|---|---|
| `neutral-0` | `#FFFFFF` | Kartu, permukaan |
| `neutral-25` | `#FCFCFE` | Sidebar admin |
| `neutral-50` | `#F7F7FB` | Latar aplikasi |
| `neutral-100` | `#F0EFF5` | Hover, skeleton |
| `neutral-200` | `#E6E4EE` | Border |
| `neutral-300` | `#D3D0DE` | Border input hover, seri "dibatalkan" |
| `neutral-400` | `#A6A2B5` | Placeholder, ikon nonaktif |
| `neutral-500` | `#7B778C` | Teks sekunder / muted |
| `neutral-600` | `#5D596D` | Teks label |
| `neutral-700` | `#433F52` | Teks item nav |
| `neutral-800` | `#2A2736` | Judul sekunder |
| `neutral-900` | `#16141F` | Teks utama |

### B7.2b Netral hangat (sisi pelanggan & mitra)
| Token | Hex | Pemakaian |
|---|---|---|
| `cream-50` | `#FBF9F4` | Latar halaman pelanggan & mitra |
| `cream-100` | `#F3F0E8` | Tile gambar paket/tukang, latar section editorial |
| `cream-200` | `#E7E2D6` | Border di atas latar krem |

Admin tetap memakai `neutral-50`. Krem hanya sebagai latar; warna brand tetap lavender.

### B7.3 Warna semantik
| Peran | 50 (latar) | 500 (titik/ikon) | 600 (solid) | 700 (teks) |
|---|---|---|---|---|
| success | `#ECFDF3` | `#17B26A` | `#079455` | `#067647` |
| warning | `#FFFAEB` | `#F79009` | `#DC6803` | `#B54708` |
| danger | `#FEF3F2` | `#F04438` | `#D92D20` | `#B42318` |
| info | `#EFF8FF` | `#2E90FA` | `#1570EF` | `#175CD3` |
| teal | `#F0FDF9` | `#15B79E` | `#0E9384` | `#107569` |
| orange | `#FEF6EE` | `#EF6820` | `#E04F16` | `#B93815` |

### B7.4 Badge status pesanan
Format badge: pill 24px, latar `*-50`, teks `*-700` 12/600, titik 6px `*-500`, ikon 14px opsional.

| Status | Label | Warna | Ikon |
|---|---|---|---|
| `pending_payment` | Menunggu pembayaran | neutral | `Clock` |
| `paid` | Dibayar · Mencari tukang | info | `CardTick` |
| `worker_confirmed` | Tukang dikonfirmasi | lavender | `UserTick` |
| `on_the_way` | Dalam perjalanan | teal | `Routing2` |
| `in_progress` | Sedang dikerjakan | warning | `Setting4` |
| `awaiting_confirmation` | Menunggu konfirmasi | orange | `GalleryTick` |
| `completed` | Selesai | success | `TickCircle` |
| `cancelled` | Dibatalkan | danger | `CloseCircle` |

### B7.5 Tipografi — Geist + Instrument Serif
- **Geist Sans** — seluruh UI (teks, label, tombol, tabel, angka).
- **Geist Mono** — kode pesanan, order id, payload JSON.
- **Instrument Serif** (hanya bobot 400, normal & italic) — judul display yang memberi karakter.

Setup (Next.js):
```ts
// app/layout.tsx
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import { Instrument_Serif } from 'next/font/google';

const instrumentSerif = Instrument_Serif({
  subsets: ['latin'], weight: '400', style: ['normal', 'italic'],
  variable: '--font-instrument-serif', display: 'swap',
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={`${GeistSans.variable} ${GeistMono.variable} ${instrumentSerif.variable}`}>
      <body className="font-sans bg-neutral-50 text-neutral-900 antialiased">{children}</body>
    </html>
  );
}
```

Skala:
| Token | Font | Ukuran / line-height | Bobot | Pemakaian |
|---|---|---|---|---|
| `display-xl` | Instrument Serif | 56 / 60 | 400 | Hero beranda desktop |
| `display-lg` | Instrument Serif | 44 / 48 | 400 | Panel auth desktop, hero mobile besar |
| `display-md` | Instrument Serif | 32 / 38 | 400 | Judul auth, sapaan dashboard, nama tukang, judul status |
| `display-sm` | Instrument Serif | 28 / 34 | 400 | Judul section pelanggan/mitra |
| `display-xs` | Instrument Serif | 22 / 28 | 400 | Nama paket & nama tukang di kartu (sisi pelanggan) |
| `h1` | Geist | 24 / 32 | 600 | Judul halaman admin |
| `h2` | Geist | 20 / 28 | 600 | Judul kartu besar |
| `h3` | Geist | 16 / 24 | 600 | Judul kartu, judul top bar |
| `body-lg` | Geist | 16 / 24 | 400 | Teks utama mobile, input mobile |
| `body` | Geist | 14 / 20 | 400 | Teks utama desktop |
| `small` | Geist | 13 / 18 | 400–500 | Label, metadata |
| `caption` | Geist | 12 / 16 | 500 | Badge, helper text |
| `overline` | Geist | 11 / 16 | 600, uppercase, tracking 0.06em | Label grup sidebar |
| `metric` | Geist | 32 / 36 | 600, tracking −0.02em, `tabular-nums` | Angka kartu metrik |

Aturan pasangan:
- Instrument Serif hanya untuk judul ≥ 28px, kecuali `display-xs` (22px) untuk nama di kartu sisi pelanggan; **tidak pernah** di tombol, form, tabel, badge, atau angka.
- Maksimal satu judul serif per area pandang. Italic serif untuk satu kata penekanan ("Tukang yang *tepat*…").
- Admin: serif hanya di halaman auth dan sapaan dashboard. Pelanggan & mitra: serif untuk hero, judul auth, judul section, judul status.
- Semua angka uang/jumlah memakai `tabular-nums`. Format Rupiah: `Rp1.250.000` — **tanpa spasi** setelah "Rp", tanpa desimal, titik pemisah ribuan. Buat helper `formatRupiah()` sendiri (jangan langsung memakai `style: 'currency'` karena menyisipkan spasi).
- Persen & desimal memakai koma: `+12,5%`, `98,5%`. Durasi: `1j 15m`.
- **Tidak ada metrik tanpa definisi.** Setiap angka di UI harus punya definisi di spesifikasi dan sumber data nyata/mock yang konsisten (mis. jangan menampilkan "Kepuasan" karena tidak ada sistem rating).
- Tanggal: `date-fns` locale `id` ("Sen, 12 Okt 2026"; relatif "5 mnt lalu").

### B7.6 Ikon — Iconsax
- Paket: `iconsax-react` (`npm i iconsax-react`). Jika peer dependency bentrok dengan versi React proyek, pasang dengan `--legacy-peer-deps` atau gunakan SVG dari iconsax.io sebagai komponen lokal. Jangan mencampur set ikon lain.
- Pengecualian: logo Google resmi di tombol Google; logo brand lain bila Iconsax tidak menyediakannya.
- Pemakaian: `<Home2 size={20} color="currentColor" variant="Linear" />`.
- Aturan varian:
  - **Linear** (default, 20px; 16px di tabel padat; 24px di bottom nav).
  - **Bold** untuk item navigasi aktif dan ikon di tombol utama yang perlu tegas.
  - **Bulk** (dua tone, warna `lavender-600`) untuk tile kategori, empty state, ilustrasi auth.
- Semua ikon lewat satu berkas pemetaan semantik `lib/icons.ts` agar mudah diganti:

| Makna | Ikon Iconsax |
|---|---|
| Beranda | `Home2` |
| Cari | `SearchNormal1` |
| Filter / urutkan | `Filter`, `Sort` |
| Pesanan | `ReceiptText` |
| Akun / profil | `ProfileCircle`, `User` |
| Dashboard | `Element3` |
| Tukang | `UserOctagon` |
| Pelanggan | `Profile2User` |
| Layanan / kategori | `Category2` |
| Transaksi | `Card` |
| Pencairan | `WalletMoney` |
| Pendapatan mitra | `Wallet3` |
| Pekerjaan | `Briefcase` |
| Pengaturan | `Setting2` |
| Keluar | `LogoutCurve` |
| Notifikasi | `Notification` |
| Kalender / jam | `Calendar1`, `Clock` |
| Lokasi / peta | `Location`, `Map1` |
| Kamera / galeri | `Camera`, `Gallery`, `GalleryAdd` |
| Terverifikasi | `Verify` |
| Aman / rekber | `ShieldTick` |
| Plus | `Crown1` |
| Email | `Sms`, `SmsTracking` |
| Password | `Lock`, `Eye`, `EyeSlash` |
| WhatsApp | `Whatsapp` |
| Sukses / gagal | `TickCircle`, `CloseCircle` |
| Info / peringatan | `InfoCircle`, `Warning2` |
| Tambah / edit / hapus | `AddCircle`, `Edit2`, `Trash` |
| Salin | `Copy` |
| Navigasi | `ArrowLeft2`, `ArrowRight`, `ArrowDown2`, `ArrowRight3` |
| Kategori | Plumbing `Drop`, Pengecatan `Brush2`, Perbaikan Umum `Ruler`, Servis AC `Wind` |

> Nama ikon adalah acuan. Verifikasi di iconsax.io; jika nama berbeda di versi paket yang terpasang, pilih ikon terdekat dan perbarui `lib/icons.ts`.

### B7.7 Spasi, radius, bayangan, breakpoint
- Grid 4px. Skala spasi: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64.
- Radius: `sm` 8 (chip kecil) · `md` 10 (input, tombol) · `lg` 14 (kartu) · `xl` 20 (modal, bottom sheet) · `full` (badge, avatar).
- Bayangan:
  - `xs`: `0 1px 2px rgba(22,20,31,.05)`
  - `sm`: `0 1px 3px rgba(22,20,31,.08), 0 1px 2px rgba(22,20,31,.04)`
  - `md`: `0 8px 24px -6px rgba(22,20,31,.12)`
  - `focus`: `0 0 0 4px rgba(146,119,242,.22)` (ring lavender)
- Breakpoint: `sm` 640 · `md` 768 · `lg` 1024 · `xl` 1280 · `2xl` 1440.

### B7.8 Token di kode (Tailwind v4)
```css
/* app/globals.css */
@import "tailwindcss";

@theme {
  --color-lavender-50: #F7F5FF;  --color-lavender-100: #EFEBFF; --color-lavender-200: #E0D8FF;
  --color-lavender-300: #C9BBFF; --color-lavender-400: #AC97FB; --color-lavender-500: #9277F2;
  --color-lavender-600: #7A5CE6; --color-lavender-700: #6447C7; --color-lavender-800: #4F38A0;
  --color-lavender-900: #3D2C7A;

  --color-neutral-0: #FFFFFF;  --color-neutral-25: #FCFCFE; --color-neutral-50: #F7F7FB;
  --color-neutral-100: #F0EFF5; --color-neutral-200: #E6E4EE; --color-neutral-300: #D3D0DE;
  --color-neutral-400: #A6A2B5; --color-neutral-500: #7B778C; --color-neutral-600: #5D596D;
  --color-neutral-700: #433F52; --color-neutral-800: #2A2736; --color-neutral-900: #16141F;

  --color-cream-50: #FBF9F4; --color-cream-100: #F3F0E8; --color-cream-200: #E7E2D6;

  --font-sans: var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif;
  --font-mono: var(--font-geist-mono), ui-monospace, monospace;
  --font-serif: var(--font-instrument-serif), Georgia, serif;

  --radius-sm: 8px; --radius-md: 10px; --radius-lg: 14px; --radius-xl: 20px;

  --shadow-xs: 0 1px 2px rgba(22,20,31,.05);
  --shadow-sm: 0 1px 3px rgba(22,20,31,.08), 0 1px 2px rgba(22,20,31,.04);
  --shadow-md: 0 8px 24px -6px rgba(22,20,31,.12);
  --shadow-focus: 0 0 0 4px rgba(146,119,242,.22);

  --ease-standard: cubic-bezier(.2,.8,.2,1);
  --ease-emphasized: cubic-bezier(.3,1.25,.5,1);
}
```
Hubungkan variabel shadcn/ui (`--primary`, `--ring`, `--border`, `--background`, dll.) ke token di atas: `--primary` = lavender-600, `--ring` = lavender-300, `--border` = neutral-200, `--background` = neutral-50, `--foreground` = neutral-900. Tema terang saja (mode gelap di luar scope). Tambahkan juga skala semantik B7.3 dengan pola yang sama (`--color-success-50`, dst.).

### B7.9 Komponen dasar (shadcn/ui, di-theme)
| Komponen | Spesifikasi |
|---|---|
| Button | Varian: `primary` (lavender-600, hover 700, tekan 800), `secondary` (putih + border neutral-200), `ghost`, `destructive` (danger-600), `link`. Varian tambahan sisi pelanggan: `pill-outline` & `pill-solid` (radius full, teks 12/600 UPPERCASE tracking 0.08em, boleh berisi label kiri + harga kanan) untuk tombol di kartu & section editorial. Ukuran: `sm` 32, `md` 40, `lg` 48 (utama di mobile), `xl` 56 (bar aksi mitra). Radius md, teks 14/600 (lg/xl: 16/600). Ikon kiri opsional. State memuat: spinner + label proses, lebar tidak berubah |
| Input / Textarea / Select | Tinggi 44 (mobile 48), radius md, border neutral-200 → hover neutral-300 → fokus lavender-600 + shadow-focus. Label di atas 13/500 neutral-700; helper 12 neutral-500; error 12 danger-700 dengan ikon `Warning2` |
| Checkbox / Radio / Switch | Warna terpilih lavender-600; switch 36×20 |
| Card | Putih, border neutral-200, radius lg, shadow-xs, padding 16 (mobile) / 20 (desktop) |
| Badge | Pill, lihat B7.4 |
| Tabs | Pill (pelanggan/mitra) atau garis bawah (admin), indikator meluncur |
| Dialog | Radius xl, lebar 440, overlay `rgba(22,20,31,.4)` + blur 2px |
| Drawer (admin) | Kanan, lebar 480 |
| Bottom sheet (mobile) | Radius atas xl, handle 36×4, dapat diseret (vaul) |
| Toast | `sonner`: atas-tengah di mobile, kanan-bawah di desktop; ikon status; aksi "Urungkan" bila relevan |
| Skeleton | neutral-100 dengan shimmer |
| Avatar | Bulat; fallback inisial di latar lavender-100 teks lavender-800 |
| Empty state | Ikon Bulk 56px dalam lingkaran lavender-50, judul 16/600, teks 14 muted, tombol |

### B7.10 Aksesibilitas
- Kontras teks minimal WCAG AA (4.5:1; teks besar 3:1).
- Fokus keyboard selalu terlihat (ring lavender); urutan tab logis; dialog/drawer/bottom sheet menjebak fokus dan tertutup dengan Esc.
- Target sentuh minimal 44×44px (mitra 48px).
- Semua input punya label nyata; error dihubungkan dengan `aria-describedby`.
- Perubahan status realtime & toast diumumkan lewat `aria-live="polite"`.
- Ikon tanpa teks wajib punya `aria-label`.
- `lang="id"` di root.

---

## B8. Micro-interaction & gerak (global)

Prinsip: halus, cepat, memberi umpan balik, tidak mengganggu. **Hormati `prefers-reduced-motion`**: matikan gerak (geser, skala, konfeti, marquee, count-up), pertahankan perubahan warna/opacity singkat, tampilkan nilai akhir langsung. Detail per screen ada di Bagian A masing-masing file; tabel di bawah adalah pola global.

### Token gerak
| Token | Nilai | Pemakaian |
|---|---|---|
| `duration-fast` | 120ms | Hover, tekan, warna |
| `duration-base` | 200ms | Fade, slide kecil, tab |
| `duration-slow` | 320ms | Drawer, bottom sheet, perubahan layout |
| `duration-count` | 900ms | Count-up angka |
| `ease-standard` | `cubic-bezier(.2,.8,.2,1)` | Default |
| `ease-emphasized` | `cubic-bezier(.3,1.25,.5,1)` | Pop, bump, pilih |
| Pegas (motion) | `stiffness 400, damping 30` | Bottom sheet, slide-to-confirm |

Library: `motion` (Framer Motion) untuk transisi & layout; CSS untuk hover/fokus; `canvas-confetti` untuk perayaan; hook buatan sendiri untuk count-up, hitung mundur, dan typewriter.

### Pola global

| Elemen | Interaksi | Detail teknis |
|---|---|---|
| **Kartu metrik (wajib)** | **Angka berjalan (count-up)** dari 0 ke nilai saat kartu masuk viewport; saat filter periode berubah, angka bergerak dari nilai lama ke nilai baru | Hook `useCountUp(value, {duration: 900, easing: easeOutCubic})` berbasis `requestAnimationFrame`; format ribuan/Rupiah di setiap frame (`Rp1.250.000`); `tabular-nums` agar lebar angka stabil |
| Chip delta | Muncul setelah count-up selesai: fade + geser 4px ke atas | delay 150 ms |
| Ticker aktivitas (opsional) | Teks berjalan horizontal di Dashboard, berhenti saat di-hover | CSS `@keyframes marquee` 30 s linear infinite; isi dari 10 event terbaru |
| Grafik batang | Bar tumbuh dari bawah, berurutan | stagger 20–30 ms per bar; tooltip mengikuti kursor |
| Kartu (hover) | Naik 2px + bayangan lebih tebal | `transition 150ms` |
| Skeleton | Shimmer saat memuat | gradient bergerak 1.2 s |
| Tombol aksi | Spinner + teks "Memproses…" + disabled; berhasil → ikon centang sesaat | cegah klik ganda |
| Toast | Notifikasi sukses/gagal tiap aksi | `sonner`, posisi atas-tengah (mobile) / kanan-bawah (desktop) |
| Badge status berubah | Crossfade warna + pulse kecil sekali | 250 ms |
| Timeline progres | Langkah baru meluncur masuk; titik terisi; langkah aktif berdenyut (ring) | ring pulse 2 s infinite |
| Tabs | Garis bawah/pill bergeser ke tab aktif | `layoutId` motion |
| Drawer / modal | Drawer meluncur dari kanan 250 ms; modal skala 0.98 → 1 + fade | backdrop fade |
| Baris tabel | Hover highlight; baris yang baru berubah (realtime) berkedip kuning lembut 1 s | |
| Badge sidebar | Angka "bump" (skala 1 → 1.15 → 1) saat jumlah berubah | |
| Upload foto | Area drop menyala saat drag-over; progress bar; thumbnail fade-in; tombol hapus muncul saat hover | |
| Slider sebelum/sesudah | Geser handle untuk membandingkan | drag + keyboard (panah) |
| Halaman pembayaran | Spinner → centang tergambar (SVG stroke animation) / silang | 600 ms |
| Konfirmasi selesai | Konfeti kecil sekali tembak (opsional) + kartu terima kasih | `canvas-confetti`, matikan bila reduced-motion |
| Tombol utama tukang | Tekan → skala 0.97; setelah sukses, tombol berganti ke aksi berikutnya dengan slide | |
| Kirim ulang email (verifikasi / reset) | Hitung mundur 60 detik di tombol | |
| Salin teks (kode pesanan) | Ikon berubah "Tersalin" 1.5 s | |
| Pencarian | Spinner kecil di input saat debounce; hasil fade-in | |

Komponen yang wajib membawa micro-interaction bawaan: `StatCard` (count-up + delta), `StatusBadge`, `OrderTimeline`, `ActionButton`, `PhotoUploader`, `BeforeAfterSlider`.

```ts
// hooks/useCountUp.ts (sketsa)
export function useCountUp(target: number, { duration = 900 } = {}) {
  const [value, setValue] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setValue(target); return; }
    const start = performance.now(); const initial = from.current; let raf = 0;
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(initial + (target - initial) * eased));
      if (p < 1) raf = requestAnimationFrame(tick); else from.current = target;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}
```

---

## B9. Data model (Supabase PostgreSQL)

```sql
profiles(id uuid pk references auth.users on delete cascade,
         full_name text, phone text, default_address text, avatar_url text,
         onboarding_completed bool not null default false,
         role text not null default 'customer' check (role in ('customer','worker','admin','staff')),
         created_at timestamptz default now())

categories(id uuid pk, name text, slug text unique, icon text, is_active bool default true, created_at)

workers(id uuid pk,
        user_id uuid unique null references profiles,        -- null = dikelola admin
        full_name text, slug text unique, phone text, email text, bio text,
        service_area text, experience_years int, photo_path text, portfolio_paths text[],
        application_status text not null default 'approved'
          check (application_status in ('draft','pending','approved','rejected')),   -- dibuat admin: 'approved'; daftar mandiri: mulai 'draft'
        rejection_reason text, reviewed_by uuid, reviewed_at timestamptz,
        is_verified bool default false, is_active bool default true,
        last_offered_at timestamptz, created_at)

job_offers(id uuid pk, order_id uuid fk orders, worker_id uuid fk workers, attempt_no int,
           status text not null default 'pending'
             check (status in ('pending','accepted','declined','expired','cancelled')),
           offered_at timestamptz default now(), expires_at timestamptz, responded_at timestamptz,
           decline_reason text,
           unique (order_id, worker_id))
-- maksimal satu tawaran 'pending' per pesanan: unique index (order_id) where status = 'pending'

app_settings(key text pk, value text, updated_at timestamptz)   -- offer_timeout_seconds, dispatch_max_attempts, auto_complete_minutes

service_packages(id uuid pk, category_id uuid fk, name text, description text,
                 price int, est_duration_minutes int, is_active bool default true, created_at)

worker_packages(worker_id uuid fk, package_id uuid fk, primary key(worker_id, package_id))

orders(id uuid pk, order_code text unique,                    -- BM-241012-0007
       customer_id uuid fk profiles, worker_id uuid null fk workers,   -- terisi saat tukang menerima
       package_id uuid fk,
       package_price int, service_fee int, total int,          -- snapshot
       address text, scheduled_date date, time_slot text, description text,
       status text not null default 'pending_payment',
       preferred_worker_id uuid null references workers,     -- tukang favorit pilihan pelanggan
       allow_reassign bool not null default true,
       dispatch_status text not null default 'idle'
         check (dispatch_status in ('idle','searching','assigned','exhausted')),
       dispatch_attempts int not null default 0,
       admin_notes text, cancel_reason text,
       paid_at, worker_confirmed_at, on_the_way_at, in_progress_at,
       awaiting_confirmation_at, completed_at, cancelled_at timestamptz,
       completed_by text check (completed_by in ('customer','admin','system')),
       created_at timestamptz default now(), updated_at timestamptz)

order_photos(id uuid pk, order_id uuid fk, type text check (type in ('problem','result')),
             uploaded_by text check (uploaded_by in ('customer','worker','admin')),
             source_note text, storage_path text, created_at)

order_events(id uuid pk, order_id uuid fk, event_type text, from_status text, to_status text,
             actor_type text, actor_id uuid null, note text, created_at)

complaints(id uuid pk, order_id uuid fk, description text,
           status text check (status in ('open','closed')) default 'open',
           is_warranty bool, resolution text, created_at, closed_at)

payments(id uuid pk, provider_order_id text unique,           -- ORD-xxx / SUB-xxx
         kind text check (kind in ('order','subscription')), ref_id uuid,
         customer_id uuid fk, amount int,
         status text check (status in ('pending','success','failed','refunded')) default 'pending',
         snap_token text, raw_payload jsonb, processed_at timestamptz, created_at)

subscriptions(user_id uuid pk fk profiles, plan text default 'free',
              current_period_end timestamptz null, updated_at)

payouts(id uuid pk, order_id uuid unique fk, worker_id uuid fk, amount int,
        status text check (status in ('pending','paid')) default 'pending',
        paid_at timestamptz, paid_by uuid, note text, created_at)
```
Index: `orders(status, created_at desc)`, `orders(customer_id)`, `orders(worker_id, status)`, `order_events(order_id, created_at)`, `workers(application_status, is_active)`, `service_packages(category_id, is_active)`, `payouts(worker_id, status)`.

Storage: `order-photos` (privat, `orders/{orderId}/{type}/{uuid}.jpg`), `worker-photos` (publik, hanya untuk mitra approved / dikelola admin). Foto pesanan diakses lewat signed URL.

admin_audit(id uuid pk, event_type text, actor_id uuid null, details jsonb, created_at timestamptz default now())   -- mis. admin_transferred
-- hanya satu admin: create unique index one_admin on profiles ((role)) where role = 'admin';

-- Admin Utama & staf
roles(id uuid pk, name text unique, description text, permissions text[] not null default '{}',
      is_preset bool default false, created_by uuid, created_at, updated_at)
-- profiles: tambah staff_role_id uuid null references roles,
--           staff_status text check (staff_status in ('invited','active','disabled'))

site_content(key text pk, value jsonb, updated_by uuid, updated_at timestamptz)   -- announcement, hero, plus_banner, terms, privacy
faq_items(id uuid pk, question text, answer text, sort_order int, is_active bool default true, updated_at)

-- has_permission(p text): true jika my_role()='admin'; atau my_role()='staff' AND staff_status='active' AND p = any(permissions peran)

Index tambahan: `job_offers(worker_id, status)`, `job_offers(order_id, status)`, `orders(dispatch_status)`.

---

## B10. API / server actions

| Method | Endpoint | Akses |
|---|---|---|
| GET | `/api/categories`, `/api/packages`, `/api/workers`, `/api/workers/[slug]` | Publik (kolom terbatas, hanya approved & aktif) |
| POST | `/api/orders` | Customer: validasi, snapshot, hitung biaya (Plus), payment + Snap token |
| POST | `/api/orders/[id]/photos` | Customer (problem) / Worker / Admin (result) |
| POST | `/api/orders/[id]/confirm` | Customer pemilik |
| POST | `/api/orders/[id]/cancel` | Customer pemilik (hanya `pending_payment`) |
| POST | `/api/orders/[id]/complaints` | Customer pemilik |
| POST | `/api/subscriptions/checkout` | Customer |
| POST | `/api/webhooks/midtrans` | Publik + verifikasi signature |
| GET / PUT | `/api/mitra/application` | Worker: ambil & simpan draf pendaftaran (status `draft`/`rejected`) |
| POST | `/api/mitra/application/submit` | Worker: kirim pendaftaran (`draft` → `pending`) |
| PATCH | `/api/mitra/profile` | Worker approved: bio, foto, portofolio |
| PATCH | `/api/account` | Customer: nama, nomor WA, alamat utama, `onboarding_completed` |
| GET | `/api/mitra/jobs` | Worker approved: pekerjaan miliknya (alamat disembunyikan sebelum accept) |
| GET | `/api/mitra/offers` | Worker approved: tawaran `pending` miliknya (cek kedaluwarsa secara lazy) |
| POST | `/api/mitra/offers/[id]/accept` · `/decline` | Worker approved: memanggil RPC `accept_offer` / `decline_offer` |
| POST | `/api/mitra/jobs/[id]/status` | Worker approved pemilik pekerjaan: berangkat, mulai, tandai selesai |
| POST | `/api/admin/orders/[id]/assign` | Admin: tugaskan manual (tukang berakun atau dikelola admin) |
| POST | `/api/admin/orders/[id]/redispatch` | Admin: cari ulang / lepas tukang & cari ulang |
| GET | `/api/admin/orders/[id]/offers` | Admin: riwayat tawaran dispatch |
| GET | `/api/mitra/earnings` | Worker approved |
| CRUD | `/api/admin/workers`, `/api/admin/categories`, `/api/admin/packages` | Admin |
| POST | `/api/admin/workers/[id]/review` | Admin: approve / reject |
| GET / PATCH | `/api/admin/orders`, `/api/admin/orders/[id]` | Admin |
| GET | `/api/admin/dashboard?range=` | Admin |
| GET | `/api/admin/transactions` | Admin |
| PATCH | `/api/admin/payouts/[id]` | Admin |

Helper wajib di setiap handler: `requireRole('admin' | 'worker' | 'customer')` yang membaca `profiles.role` di server; untuk worker juga cek `application_status='approved'`.

Autentikasi (daftar, masuk, Google, verifikasi, reset) memakai Supabase Auth SDK langsung + `/auth/callback` (B11), bukan endpoint buatan sendiri.

| Method | Endpoint | Akses |
|---|---|---|
| GET / POST | `/api/admin/team` | Admin Utama: daftar & undang staf |
| PATCH | `/api/admin/team/[id]` | Admin Utama: ubah peran, nonaktifkan/aktifkan, kirim ulang/batalkan undangan |
| GET / POST / PATCH / DELETE | `/api/admin/roles` | Admin Utama: kelola peran & hak akses |
| GET / PUT | `/api/admin/content`, `/api/admin/faq` | Izin `content.manage` |
| GET | `/api/me/permissions` | Admin/staf: daftar izin untuk UI |

Semua endpoint `/api/admin/*` memakai `requirePermission(...)` sesuai A12 (Admin Utama selalu lolos).

---

## B11. Autentikasi (semua role)

### B11.1 Metode per role
| Role | Email + password | Google | Daftar mandiri | Verifikasi email | Lupa/reset password |
|---|---|---|---|---|---|
| Pelanggan | Ya | Ya | Ya (`/register`) | Wajib | Ya |
| Mitra | Ya | Ya | Ya (`/mitra/register`) | Wajib | Ya |
| Admin | Ya | Tidak | Tidak | Akun dibuat terkonfirmasi | Ya |

Tidak ada login magic link. Email hanya dipakai untuk link verifikasi dan link reset password.

### B11.2 Peta route autentikasi
| Halaman | Pelanggan | Mitra | Admin |
|---|---|---|---|
| Masuk | `/login` (C02a) | `/mitra/login` (W00a) | `/admin/login` (A00a) |
| Daftar | `/register` (C02b) | `/mitra/register` (W00b) | — |
| Verifikasi email | `/verify-email` (C02c) | `/mitra/verify-email` (W00c) | — |
| Lupa password | `/forgot-password` (C02d) | `/mitra/forgot-password` (W00d) | `/admin/forgot-password` (A00b) |
| Reset password | `/reset-password` (C02e) | `/mitra/reset-password` (W00e) | `/admin/reset-password` (A00c) |
| Setelah daftar | `/welcome` (C02f) | `/mitra/daftar` (W01) | — |
| Ditolak | — | — | `/admin/denied` (A00d) |
| Terima undangan staf | — | — | `/admin/accept-invite` (A00e) |
| Callback (bersama) | `/auth/callback` | `/auth/callback` | `/auth/callback` |

### B11.3 Pengaturan Supabase Auth (dashboard)
1. **Authentication → Sign In / Providers → Email:** aktif; **Confirm email: ON**; **Secure password change: ON**.
2. **Password:** minimal 8 karakter; wajib huruf kecil, huruf besar, dan angka (validasi yang sama di client & Zod).
3. **Google:**
   - Google Cloud Console → buat project → **OAuth consent screen** (nama aplikasi BuildMate, scope `email`, `profile`, `openid`; selama status *Testing*, tambahkan akun uji sebagai *test users* atau publikasikan aplikasinya).
   - **Credentials → Create OAuth client ID → Web application.** Authorized redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback`. Authorized JavaScript origins: `http://localhost:3000` dan domain produksi.
   - Salin Client ID & Secret ke Supabase → Providers → Google → aktifkan.
4. **URL Configuration:** Site URL & Redirect URLs (lihat B19 dan B21).
5. **Email Templates** (bahasa Indonesia, tetap memakai `{{ .ConfirmationURL }}`):
   - *Confirm signup* — subjek "Verifikasi email BuildMate kamu".
   - *Reset password* — subjek "Atur ulang password BuildMate".
6. **SMTP — wajib: Gmail dengan App Password** (cepat, gratis, bisa mengirim ke alamat mana pun). Email bawaan Supabase hanya mengirim ke anggota tim proyek, sehingga email ke pelanggan, mitra, atau admin baru tidak akan sampai tanpa SMTP sendiri.
   - Gmail pengirim (mis. `hajaraswad210299@gmail.com`): Akun Google → **Keamanan** → aktifkan **Verifikasi 2 Langkah** → **Sandi aplikasi** → buat "BuildMate Supabase" → salin 16 karakter.
   - Supabase → **Authentication → Emails → SMTP Settings** → aktifkan: Host `smtp.gmail.com`, Port `465`, Username = alamat Gmail, Password = sandi aplikasi, Sender email = alamat Gmail, Sender name `BuildMate`.
   - **Authentication → Rate Limits**: naikkan batas email per jam (mis. 30) agar uji coba tidak tertahan.
   - Sandi aplikasi tidak pernah di-commit; hanya disimpan di dashboard Supabase.
   - Untuk produk sungguhan (di luar MVP), ganti ke layanan email transaksional dengan domain sendiri.
7. **Secure email change: ON** (dipakai untuk "Pindahkan akses admin", A09). Template **Change Email Address** dalam bahasa Indonesia, memakai `{{ .Email }}` dan `{{ .NewEmail }}`.

### B11.4 Implementasi (klien Supabase dari `@supabase/ssr`)
```ts
const SITE = process.env.NEXT_PUBLIC_SITE_URL;

// Daftar pelanggan
await supabase.auth.signUp({
  email, password,
  options: {
    emailRedirectTo: `${SITE}/auth/callback?next=${encodeURIComponent(next ?? '/')}`,
    data: { full_name, phone, signup_as: 'customer' },
  },
});

// Daftar mitra
await supabase.auth.signUp({
  email, password,
  options: {
    emailRedirectTo: `${SITE}/auth/callback?next=/mitra/daftar`,
    data: { full_name, phone, signup_as: 'worker' },
  },
});

// Masuk (semua role)
await supabase.auth.signInWithPassword({ email, password });

// Google (pelanggan: as=customer, mitra: as=worker)
await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: { redirectTo: `${SITE}/auth/callback?next=${encodeURIComponent(next)}&as=${as}` },
});

// Kirim ulang verifikasi
await supabase.auth.resend({ type: 'signup', email, options: { emailRedirectTo: `${SITE}/auth/callback?next=…` } });

// Lupa password (next sesuai area: /reset-password, /mitra/reset-password, /admin/reset-password)
await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${SITE}/auth/callback?next=/reset-password` });

// Reset password (di halaman reset, sesi recovery sudah aktif)
await supabase.auth.updateUser({ password: newPassword });
await supabase.auth.signOut({ scope: 'others' });

// Keluar
await supabase.auth.signOut();
```

### B11.5 Route callback `/auth/callback`
```ts
// app/auth/callback/route.ts (sketsa)
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const next = safePath(url.searchParams.get('next') ?? '/');   // hanya path internal, cegah open redirect
  const as = url.searchParams.get('as');                         // 'worker' | 'customer' | null
  if (!code) return redirect('/login?error=link');

  const supabase = await createServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return redirect(`${loginPathFor(next)}?error=link_expired`);

  const { data: { user } } = await supabase.auth.getUser();
  let profile = await getProfile(user!.id);

  // Google untuk mitra: klaim role worker hanya untuk akun yang benar-benar baru
  if (as === 'worker' && profile.role === 'customer') {
    const claimed = await adminClient.rpc('claim_worker_role', { target: user!.id });
    if (claimed.error) return redirect('/mitra/login?error=email_is_customer');
    profile = await getProfile(user!.id);
  }

  return redirect(resolveRedirect(profile, next));   // B11.8
}
```
Untuk link reset password, `next` sudah berisi halaman reset sehingga callback langsung meneruskan ke sana dengan sesi recovery aktif.

### B11.6 Trigger profil, fungsi bantu, dan klaim role mitra
```sql
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, phone, avatar_url, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'avatar_url',
    case new.raw_user_meta_data->>'signup_as'
      when 'worker' then 'worker'
      when 'staff'  then 'staff'   -- hanya lewat inviteUserByEmail dari server (Admin Utama)
      else 'customer' end
  );
  insert into public.subscriptions (user_id) values (new.id);
  return new;
end; $$;

create trigger on_auth_user_created
after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.my_role() returns text
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.my_worker_id() returns uuid
language sql stable security definer set search_path = public as $$
  select id from public.workers where user_id = auth.uid()
$$;

-- Klaim role worker untuk akun Google baru (dipanggil hanya dari server dengan service role)
create or replace function public.claim_worker_role(target uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (
    select 1 from public.profiles p
    where p.id = target and p.role = 'customer'
      and p.created_at > now() - interval '15 minutes'
      and not exists (select 1 from public.orders o where o.customer_id = target)
      and not exists (select 1 from public.workers w where w.user_id = target)
  ) then
    raise exception 'not_claimable';
  end if;
  update public.profiles set role = 'worker' where id = target;
end; $$;

revoke execute on function public.claim_worker_role(uuid) from public, anon, authenticated;
```
- Role **tidak pernah** bisa menjadi `admin` lewat pendaftaran. Role `staff` hanya dari undangan server; jika metadata `staff` muncul dari pendaftaran publik (`signUp`), server menolak: halaman daftar publik tidak pernah mengirim `signup_as: 'staff'`, dan `/auth/callback` menurunkan profil `staff` tanpa `staff_role_id` menjadi `customer`.
- Akun pelanggan lama yang mencoba masuk lewat Google di area mitra ditolak dengan pesan "Email ini terdaftar sebagai akun pelanggan. Gunakan email lain untuk mendaftar sebagai mitra."

### B11.7 Akun admin default
Email admin default: **`hajaraswad210299@gmail.com`** (disimpan di env `ADMIN_EMAIL`, bukan di-hardcode di komponen).

Buat lewat skrip idempoten `scripts/create-admin.ts` (dijalankan dengan `npx tsx scripts/create-admin.ts`, memakai service role key dari `.env.local`):
1. Cari user dengan `ADMIN_EMAIL`. Jika belum ada → `supabase.auth.admin.createUser({ email: ADMIN_EMAIL, email_confirm: true, password: <acak 24 karakter, tidak dicetak dan tidak disimpan> })`.
2. Pastikan `profiles.role = 'admin'` untuk user tersebut (update jika perlu).
3. Kirim email atur password: `supabase.auth.resetPasswordForEmail(ADMIN_EMAIL, { redirectTo: SITE_URL + '/auth/callback?next=/admin/reset-password' })`. Pemilik email membuka link → mengatur password di A00c → masuk di A00a.
4. Skrip aman dijalankan ulang (tidak membuat user ganda, tidak mengubah password yang sudah diatur kecuali diminta flag `--send-reset`).

Catatan:
- Tidak ada password admin di repo, seed, atau log.
- **Pengiriman email:** SMTP bawaan Supabase hanya mengirim ke alamat anggota tim/organisasi proyek Supabase dan dibatasi jumlahnya. Jika `ADMIN_EMAIL` bukan email akun pemilik proyek Supabase, atau email tidak masuk, pasang SMTP sendiri (mis. Resend) di **Authentication → Emails → SMTP Settings**.
- Redirect URLs Supabase wajib memuat `http://localhost:3000/**` dan domain Vercel produksi (mis. `https://buildmate-ten.vercel.app/**`), agar link reset berfungsi di keduanya.
- Cara manual (cadangan): Supabase → Authentication → Users → Add user (Auto Confirm) → SQL `update public.profiles set role='admin' where id=(select id from auth.users where email='hajaraswad210299@gmail.com');`.

### B11.8 Matriks redirect setelah masuk / callback
| Role | Kondisi | Tujuan |
|---|---|---|
| customer | profil belum lengkap (`onboarding_completed = false` atau `phone` kosong) | `/welcome?next=…` |
| customer | lengkap | `next` (jika di area pelanggan) atau `/` |
| worker | belum punya baris `workers` atau status `draft`/`rejected` | `/mitra/daftar` |
| worker | `pending` | `/mitra/status` |
| worker | `approved` | `next` (jika di `/mitra`) atau `/mitra` |
| admin | — | `next` (jika di `/admin`) atau `/admin` |
| staff | `staff_status='invited'` | `/admin/accept-invite` |
| staff | `active` | `next` jika diizinkan, jika tidak halaman pertama yang diizinkan |
| staff | `disabled` | keluar → `/admin/denied` |
| role tidak cocok dengan halaman masuk yang dipakai | — | area role-nya + toast penjelasan |

### B11.9 Middleware pemisah area
```ts
// middleware.ts (sketsa)
const AREAS = [
  { prefix: '/admin', role: ['admin', 'staff'], login: '/admin/login',
    open: ['/admin/login', '/admin/forgot-password', '/admin/reset-password', '/admin/denied', '/admin/accept-invite'] },
  { prefix: '/mitra', role: 'worker', login: '/mitra/login',
    open: ['/mitra/login', '/mitra/register', '/mitra/verify-email', '/mitra/forgot-password', '/mitra/reset-password'] },
  { prefix: '/order',   role: 'customer', login: '/login' },
  { prefix: '/payment', role: 'customer', login: '/login' },
  { prefix: '/orders',  role: 'customer', login: '/login' },
  { prefix: '/plus',    role: 'customer', login: '/login' },
  { prefix: '/account', role: 'customer', login: '/login' },
  { prefix: '/welcome', role: 'customer', login: '/login' },
];
// 1) Refresh sesi dengan @supabase/ssr (wajib, agar cookie tetap valid).
// 2) Path di daftar `open` → lanjut (halaman reset butuh sesi recovery; validasi di halaman).
// 3) Belum login → redirect ke area.login?next=<path>.
// 4) Role tidak cocok → redirect ke beranda role-nya (admin→/admin, worker→/mitra, customer→/).
// 5) Worker belum approved → hanya /mitra/daftar & /mitra/status.
// 5b) Staff: harus active; izin per halaman dicek di layout/halaman (requirePermission) → tanpa izin tampil "Tidak punya akses".
// 6) Customer belum onboarding → /welcome sebelum /order dan /payment.
export const config = {
  matcher: ['/admin/:path*', '/mitra/:path*', '/order/:path*', '/payment/:path*',
            '/orders/:path*', '/plus', '/account', '/welcome'],
};
```
Middleware hanya lapisan pertama. Setiap route handler tetap memanggil `requireRole()` dan RLS tetap aktif. Di server, keputusan akses memakai `supabase.auth.getUser()` (memverifikasi token), bukan `getSession()`.

### B11.10 Pemetaan pesan error
| Pesan Supabase (kurang lebih) | Tampilan |
|---|---|
| Invalid login credentials | Email atau password salah. |
| Email not confirmed | Email belum diverifikasi. [Kirim ulang email verifikasi] |
| User already registered | Email sudah terdaftar. [Masuk] atau [reset password]. |
| Password should be at least … / weak password | Password minimal 8 karakter dan mengandung huruf besar, huruf kecil, dan angka. |
| New password should be different from the old password | Password baru harus berbeda dari password lama. |
| For security purposes, you can only request this after N seconds / rate limit | Terlalu banyak percobaan. Coba lagi dalam {N} detik. |
| Email link is invalid or has expired | Link tidak valid atau sudah kedaluwarsa. [Minta link baru] |
| Lainnya | Terjadi kesalahan. Coba lagi sebentar lagi. |

### B11.11 Aturan keamanan auth
- Pesan lupa password selalu sama, apa pun hasilnya (tidak membocorkan email terdaftar).
- `next` hanya menerima path internal (diawali `/`, bukan `//`), untuk mencegah open redirect.
- Cookie sesi dikelola `@supabase/ssr` (httpOnly); token tidak pernah disimpan di localStorage buatan sendiri dan tidak pernah dicatat di log.
- Setelah reset password, keluarkan sesi di perangkat lain (`signOut({ scope: 'others' })`).
- Tombol kirim/masuk dikunci saat proses; hitung mundur 60 detik untuk kirim ulang.
- Validasi password sama di client (Zod) dan pengaturan Supabase.

### B11.12 Uji autentikasi
Buat minimal: 1 admin, 2 pelanggan (email+password & Google), 2 mitra (approved & pending). Pastikan:
- Daftar → email verifikasi → callback → redirect benar untuk pelanggan dan mitra.
- Lupa → email reset → halaman reset → password baru berlaku, password lama ditolak.
- Pelanggan membuka `/admin` atau `/mitra/jobs` → dialihkan; mitra pending membuka `/mitra/jobs` → `/mitra/status`.
- Akun pelanggan lama + Google di area mitra → ditolak dengan pesan yang benar.
- Link verifikasi/reset yang sudah dipakai → pesan "link kedaluwarsa".

---

## B12. Pembayaran Midtrans Snap & webhook (logika)

> **ATURAN KERAS — pembayaran wajib lewat Midtrans Snap Sandbox sungguhan.** Dilarang membuat halaman pembayaran tiruan: QR code buatan sendiri, daftar e-wallet dengan "saldo" palsu, tombol "simulasikan scan", atau memakai logo/merek QRIS, GPN, bank, dan e-wallet di UI sendiri. Pemilihan metode bayar, QR, dan nomor VA **hanya** ditampilkan oleh popup Snap milik Midtrans. Status pembayaran **hanya** berubah lewat webhook Midtrans. Uji bayar dilakukan di simulator resmi Midtrans (B20 langkah 7).

1. Server membuat transaksi Snap: `order_id` = `ORD-{order_code}` atau `SUB-{uuid}`, `gross_amount` = total, `customer_details`, `item_details`. Kembalikan `snap_token`.
2. Browser memanggil `window.snap.pay(token, { onSuccess, onPending, onError, onClose })`; semua callback hanya mengarahkan ke `/payment/[orderId]` yang membaca status dari DB.
3. Handler `POST /api/webhooks/midtrans`:
   - Verifikasi `signature_key === sha512(order_id + status_code + gross_amount + MIDTRANS_SERVER_KEY)`.
   - Cocokkan `gross_amount` dengan `payments.amount`.
   - Idempotent: status sudah final → balas 200, berhenti.
   - `settlement`, atau `capture` + `fraud_status=accept` → `success`:
     - `ORD-` → `transitionOrder(..., 'paid', 'webhook')`.
     - `SUB-` → `current_period_end = max(now(), current_period_end) + PLUS_DURATION_DAYS`.
   - `expire` / `cancel` / `deny` → `failed`; `ORD-` → `cancelled`.
   - `pending` → simpan payload saja.
   - Simpan `raw_payload`, `processed_at`; balas 200.
4. Refund = simulasi (update DB saja).

```ts
// sketsa verifikasi
import crypto from 'crypto';
const expected = crypto.createHash('sha512')
  .update(body.order_id + body.status_code + body.gross_amount + process.env.MIDTRANS_SERVER_KEY)
  .digest('hex');
if (expected !== body.signature_key) return new Response('invalid signature', { status: 403 });
```

---

## B13. Keamanan & RLS

- RLS aktif di **semua** tabel, deny-by-default.
- Fungsi bantu: `public.my_role()` dan `public.my_worker_id()` (security definer, stable).
- Customer: baca/ubah terbatas data miliknya (`orders.customer_id = auth.uid()`).
- Worker: baca `orders` dengan `worker_id = my_worker_id()` dan status ≠ `pending_payment`; detail pelanggan disajikan lewat API yang menyaring sebelum `accept`.
- Admin: akses penuh via policy `my_role() = 'admin'`.
- Publik: view `public_workers` & `public_packages` hanya kolom aman (tanpa phone/email).
- Operasi tulis sensitif (transisi status, payouts, webhook) dijalankan di server dengan service role **setelah** `requireRole`.
- `SUPABASE_SERVICE_ROLE_KEY` & `MIDTRANS_SERVER_KEY` tidak pernah ke browser.
- Validasi input Zod; rate limit sederhana per IP di `POST /api/orders`, `/api/mitra/application/submit`, webhook.
- Upload: JPEG/PNG/WebP, maks 5 MB, maks 3 foto masalah / 3 portofolio.
- Jangan tampilkan alamat & nomor pelanggan di screenshot demo.

---

## B14. Tech stack, environment & arsitektur kode

### B14.1 Tech stack
| Lapisan | Pilihan |
|---|---|
| Framework | Next.js (App Router) + TypeScript |
| Styling | Tailwind CSS v4 + shadcn/ui (di-theme dengan token B7) |
| Font | `geist` (Geist Sans & Mono) + Instrument Serif (`next/font/google`) |
| Ikon | `iconsax-react` |
| Animasi | `motion`, `canvas-confetti` |
| Grafik | `recharts` |
| Form & validasi | `react-hook-form`, `zod`, `@hookform/resolvers` |
| Toast / bottom sheet | `sonner`, `vaul` |
| Tanggal | `date-fns` (locale `id`) |
| Gambar | `browser-image-compression`, `react-easy-crop` |
| Backend | Route Handlers / Server Actions Next.js |
| Database, Auth, Storage, Realtime | Supabase (`@supabase/supabase-js`, `@supabase/ssr`) |
| Pembayaran | Midtrans Snap **Sandbox** |
| Deploy | Vercel |

### B14.2 Environment variables
`.env.local` (lokal) dan Vercel (Production & Preview). Nama variabel juga ditulis di `.env.example` (tanpa nilai, di-commit).
```
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=        # atau "publishable key"
SUPABASE_SERVICE_ROLE_KEY=            # atau "secret key" — server only
MIDTRANS_SERVER_KEY=                  # sandbox, server only
NEXT_PUBLIC_MIDTRANS_CLIENT_KEY=      # sandbox
MIDTRANS_IS_PRODUCTION=false
SERVICE_FEE=5000
PLUS_PRICE=29000
PLUS_DURATION_DAYS=30
AUTO_COMPLETE_MINUTES=1440            # demo: 2
OFFER_TIMEOUT_SECONDS=900             # demo: 60 — batas waktu tiap tawaran
DISPATCH_MAX_ATTEMPTS=5
ADMIN_WA_NUMBER=628xxxxxxxxxx
ADMIN_EMAIL=hajaraswad210299@gmail.com   # akun admin default (B11.7)
USE_MOCK_DATA=true                    # fase UI-first; false setelah backend tersambung
```

### B14.3 Struktur folder
```
app/
  layout.tsx                         # font, Toaster, provider
  globals.css                        # token B7
  (marketing)/page.tsx               # C01 Beranda
  (public)/search/                   # C03
  (public)/workers/[slug]/           # C04
  (auth)/login, register, verify-email, forgot-password, reset-password/   # C02a–C02e
  (customer)/welcome/                # C02f
  (customer)/order/[packageId]/      # C05
  (customer)/payment/[orderId]/      # C06
  (customer)/orders/, orders/[id]/   # C07, C08
  (customer)/plus/, account/         # C09, C10
  admin/(auth)/login, forgot-password, reset-password, denied/   # A00a–A00d
  admin/(panel)/layout.tsx           # AdminShell
  admin/(panel)/page.tsx             # A01
  admin/(panel)/orders/, orders/[id]/, workers/, services/, transactions/, payouts/, customers/, settings/
  mitra/(auth)/login, register, verify-email, forgot-password, reset-password/   # W00a–W00e
  mitra/daftar/, mitra/status/       # W01, W02
  mitra/(app)/layout.tsx             # MitraShell
  mitra/(app)/page.tsx               # W03
  mitra/(app)/jobs/, jobs/[id]/, earnings/, profile/
  auth/callback/route.ts
  api/...
components/
  ui/          # shadcn di-theme
  shared/      # StatCard, StatusBadge, OrderStepper, PhotoUploader, PhotoLightbox, BeforeAfterSlider,
               # WaButton, EmptyState, ConfirmDialog, ActivityTicker
  auth/        # AuthLayout, GoogleButton, PasswordField, PasswordStrength, PhoneField, ResendButton
  admin/  customer/  mitra/
hooks/         # useCountUp, useCountdown, useTypewriter, useAutosave, useReducedMotion, useOrderRealtime
lib/
  data/        # LAPISAN DATA: orders, workers, packages, dashboard, payments, payouts, mitra, profile
  mock/        # data mock untuk fase UI-first
  auth/        # requireRole, getProfile, resolveRedirect, safePath
  orders/transitions.ts
  supabase/    # server.ts, client.ts, admin.ts, types.ts
  icons.ts     # pemetaan ikon semantik (B7.6)
  midtrans.ts  wa-templates.ts  format.ts  constants/areas.ts
middleware.ts
supabase/
  migrations/  seed.sql  seed_demo.sql
docs/
  design/admin/  design/customer/  DECISIONS.md  BUILD_STATUS.md
.env.example
```

### B14.4 Lapisan data
Komponen UI **tidak boleh** mengimpor mock atau Supabase secara langsung; semua lewat `lib/data/*`:
```ts
export async function getOrders(filter: OrderFilter) {
  if (process.env.USE_MOCK_DATA === 'true') return mockGetOrders(filter);
  return supabaseGetOrders(filter);
}
```
Mock wajib mencakup semua status pesanan, tawaran ditolak, komplain terbuka, pesanan lewat batas konfirmasi, payout pending & paid, pembayaran gagal, member Plus aktif, dan pendaftaran mitra pending.

---

## B15. Copy UI & template WhatsApp

### Pelanggan
| Momen | Teks |
|---|---|
| Hero | Butuh bantuan perbaikan rumah? Cari tukang, bayar aman, dana diteruskan setelah beres. |
| Dibayar · Mencari tukang | Pembayaran diterima. Kami sedang mencarikan tukang untukmu. |
| Dialihkan | {nama} berhalangan, kami alihkan ke tukang lain. |
| Dispatch habis | Kami masih mencarikan tukang. Tim BuildMate akan menghubungimu. |
| Tukang dikonfirmasi | Tukang dan jadwal sudah dikonfirmasi. |
| Dalam perjalanan | Tukang sedang menuju lokasimu. |
| Sedang dikerjakan | Pekerjaan sedang berlangsung. |
| Menunggu konfirmasi | Pekerjaan selesai menurut tukang. Cek foto hasil lalu konfirmasi, atau laporkan jika ada masalah. |
| Selesai | Terima kasih! Pesanan selesai dan dana diteruskan ke tukang. |
| Dibatalkan | Pesanan dibatalkan. Dana dikembalikan (simulasi). |
| Harga | Harga paket sudah termasuk jasa sesuai cakupan. Pekerjaan di luar cakupan dibicarakan terpisah. |

### Tukang
| Momen | Teks |
|---|---|
| Pendaftaran terkirim | Pendaftaranmu sudah kami terima. Tim BuildMate akan meninjau dalam 1×24 jam. |
| Ditolak | Pendaftaran belum bisa disetujui: {alasan}. Kamu bisa memperbaiki data lalu mengajukan ulang. |
| Disetujui | Selamat, kamu resmi jadi Mitra BuildMate! Profilmu kini tampil untuk pelanggan. |
| Tawaran baru | Ada pekerjaan baru di {area}, {tanggal} {slot}. Terima sebelum diberikan ke tukang lain. |
| Foto hasil belum ada | Unggah minimal 1 foto hasil sebelum menandai selesai. |
| Menunggu konfirmasi | Pelanggan sedang memeriksa hasil kerjamu. |
| Dana menunggu | Rp{nominal} akan dicairkan oleh tim BuildMate. |

### Template WA (click-to-chat `https://wa.me/<nomor>?text=<encoded>`, dikirim manual)
- **Admin → tukang (tawaran):** "Halo Pak/Bu {nama_tukang}, ada pesanan BuildMate {kode}: {paket} di {area} untuk {tanggal}, {slot}. Silakan buka portal mitra untuk menerima: {url}. (Jika belum punya akun, balas pesan ini untuk konfirmasi.)"
- **Admin → pelanggan:** "Halo {nama_pelanggan}, pesanan BuildMate {kode} sudah kami terima. Tukang {nama_tukang} akan datang {tanggal}, {slot}."
- **Tukang → pelanggan:** "Halo {nama_pelanggan}, saya {nama_tukang} dari BuildMate untuk pesanan {kode}. Saya akan datang {tanggal}, {slot}."
- **Pelanggan → admin:** "Halo BuildMate, saya butuh bantuan untuk pesanan {kode}."

---

## B16. Timeline, urutan global, Definition of Done & demo

| Tanggal | Agenda |
|---|---|
| Jum 9 Okt 2026 | Checkpoint #0 — ide & tech stack |
| 12–16 Okt | Minggu 1 → Checkpoint Bronze (Jum 16 Okt) |
| 19–23 Okt | Minggu 2 → Checkpoint Silver (Jum 23 Okt) |
| 26–30 Okt | Minggu 3 → Demo Day (Jum 30 Okt) |

### Definition of Done
- Live HTTPS; daftar/masuk (email + password & Google), verifikasi email, dan reset password berfungsi untuk tiap role; tiap role ditolak dari area role lain (diuji).
- Alur penuh 3× berturut-turut: cari → pesan → bayar sandbox → webhook → tukang terima → progres → foto hasil → konfirmasi → pencairan → tampil di pendapatan tukang.
- Pendaftaran mitra → review admin → tampil publik berfungsi.
- Pembayaran gagal/expire tertangani; webhook ganda aman.
- Paywall Plus di server; transisi ilegal ditolak; semua tercatat di audit.
- Tidak ada kebocoran data antar pelanggan / antar tukang (uji 2 akun masing-masing).
- Count-up di semua kartu metrik; reduced-motion dihormati.
- Semua screen punya loading/empty/error dan nyaman di 360px (pelanggan & tukang).

### Skrip demo 5 menit
| Waktu | Isi |
|---|---|
| 0:00–0:40 | Problem: cari tukang tidak pasti, harga tidak jelas, takut bayar di muka |
| 0:40–1:40 | Pelanggan: cari → detail tukang → paket → form + foto → bayar Snap sandbox |
| 1:40–2:30 | Tukang (HP): tawaran baru → Terima → Berangkat → Mulai; timeline pelanggan berubah realtime |
| 2:30–3:15 | Tukang unggah foto hasil → pelanggan lihat sebelum/sesudah → Pesanan selesai → pendapatan tukang bertambah |
| 3:15–4:00 | Upgrade Plus → webhook → biaya layanan Rp0, garansi terbuka |
| 4:00–5:00 | Admin: Dashboard (angka berjalan), verifikasi mitra, transaksi webhook, robustness, model bisnis |

### Urutan pengerjaan global

### Fase 1 — Fondasi & UI admin dengan mock (M1 Sen–Sel, maks 2 hari)
- Setup Next.js + Tailwind + shadcn; **jalankan B23 (cek), 25 (Supabase) & 28 (push GitHub + deploy) sejak hari pertama** agar ada URL HTTPS; setelah itu setiap tugas ditutup dengan alur B22.
- Layout admin, komponen inti **beserta micro-interaction** (B8): `StatCard` dengan count-up, `StatusBadge`, `OrdersTable`, `AuditTimeline`, `WaButton`, drawer, skeleton/empty/error.
- Halaman mock: A03 → A02 → A04 → A05 → A06 → A07 → A01.
- Tulis `lib/orders/transitions.ts`.

### Fase 2 — Backend berlapis
1. **M1 Rab:** migrasi + RLS + seed; auth + trigger profiles + middleware 3 role (B11).
2. **M1 Kam:** A04/A05 tersambung; C01, C03, C04, C05 (tanpa bayar).
3. **M1 Jum:** `transitionOrder` (RPC) + audit; A02/A03 tersambung. **Checkpoint Bronze.**
4. **M2 Sen:** Snap `ORD-`, C05 bayar, C06 (B20).
5. **M2 Sel:** webhook + A06.
6. **M2 Rab:** Plus: C09, `SUB-`, paywall.
7. **M2 Kam:** C07, C10, WA template. **M2 Jum: Checkpoint Silver.**
8. **M3 Sen:** storage foto, guard foto hasil, C08 (timeline realtime, sebelum/sesudah, konfirmasi).
9. **M3 Sel:** **portal tukang**: W00–W02 (daftar + status) + review di A04; W03–W05 (tawaran, aksi status, unggah foto) memakai `transitionOrder` yang sama.
10. **M3 Rab pagi:** komplain/garansi, selesaikan setelah batas waktu, refund, payouts, W06, A07, A01 data nyata.

### Fase 3 — Polish & freeze (M3 Rab sore–Kam)
Poles C08, C05, W05, A01; cek semua micro-interaction & reduced-motion; seed demo; uji end-to-end 3×. **Kamis = feature freeze.**

**Jika terlambat:** portal tukang dipangkas menjadi W00–W02 + W05 saja (tukang lain tetap "dikelola admin"); W06/W07 dan ticker dilewati.

---

## B17. Seed data

- **Kategori:** Plumbing, Pengecatan, Perbaikan Umum, (opsional) Servis AC Ringan.
- **Tukang:** 8–12 (nama Indonesia, area kecamatan dalam satu kota, bio singkat), campuran: 2 mitra berakun approved, 1 pendaftar pending, 1 ditolak, sisanya dikelola admin, 1 nonaktif.
- **Paket:** tabel B3.
- **Akun:** 1 admin, 2 pelanggan (Gratis & Plus aktif), 2 tukang berakun.
- **Pesanan:** minimal 1 per status + 1 ditolak tukang + 1 komplain + 1 lewat batas konfirmasi + payout pending & paid + 1 pembayaran gagal.
- Kata sandi akun demo disimpan di password manager, **tidak** di-commit dan tidak ditulis di seed.

---

## B18. Risiko, di luar scope & keputusan terbuka

### Risiko

| Risiko | Mitigasi |
|---|---|
| Webhook sulit dites lokal | Deploy sejak M1; ngrok untuk lokal |
| Banyak status → bug | Satu fungsi transisi + tabel izin; uji tiap jalur |
| RLS menyembunyikan data | Policy per tabel, uji dengan akun tiap role |
| Scope 3 sisi terlalu besar | Portal tukang di M3 dengan versi pangkas siap; mode "dikelola admin" sebagai cadangan |
| Interpretasi syarat Silver | Konfirmasi ke panitia; Plus tetap dibangun |
| Dua tukang menerima pesanan yang sama | RPC `accept_offer` dengan kunci baris + unique index tawaran pending |
| Penjadwal tidak jalan | Pengecekan kedaluwarsa lazy di API + override manual admin |

### Di luar scope (JANGAN dibangun)

WhatsApp API otomatis, push notification, chat in-app, peta/GPS live & tracking lokasi tukang, ketersediaan/kalender real-time, auto-matching/AI, review/rating publik, pembayaran recurring, API refund/disbursement sungguhan, tagihan tambahan, multi-tenancy, promo/voucher, verifikasi KTP/dokumen identitas, aplikasi native, login magic link/OTP, login sosial selain Google, mode gelap, autentikasi dua faktor. Multi-tenancy/workspace tetap di luar scope (peran staf A10 bukan multi-tenancy).

### Keputusan terbuka

- Daftar final kategori, paket, harga dummy.
- Nama & jumlah tukang dummy.
- Batas konfirmasi saat demo (usulan 2 menit) vs normal (24 jam).
- Batas waktu respons tawaran tukang sebelum masuk antrean admin (usulan 2 jam; demo 1 menit).
- Apakah pelanggan boleh menambah foto hasil sendiri (usulan: boleh, opsional).

---

## B19. Panduan setup database online (Supabase)

1. **Buat proyek**
   - Masuk ke https://supabase.com → **New project**.
   - Nama: `buildmate`; region: **Southeast Asia (Singapore)**; buat database password kuat dan simpan.
2. **Ambil kunci API**
   - **Project Settings → API** (atau **API Keys**): salin **Project URL**, **anon/publishable key**, dan **service_role/secret key** ke `.env.local`.
   - Service role/secret key **hanya** dipakai di server.
3. **Pasang Supabase CLI & hubungkan repo**
   ```bash
   npm i -D supabase
   npx supabase login
   npx supabase init
   npx supabase link --project-ref <project-ref>   # ref ada di URL dashboard
   ```
4. **Buat & jalankan migrasi**
   ```bash
   npx supabase migration new init_schema
   # isi file supabase/migrations/<timestamp>_init_schema.sql dengan tabel (B9),
   # fungsi my_role/my_worker_id, trigger profil (B11), RPC transition_order, dan RLS (B13)
   npx supabase db push
   ```
   Alternatif cepat: tempel SQL di **SQL Editor** dashboard lalu **Run**.
5. **Seed data**: jalankan `supabase/seed.sql` lewat SQL Editor (atau `psql` dengan connection string dari **Project Settings → Database**).
6. **Generate type TypeScript**
   ```bash
   npx supabase gen types typescript --linked > lib/supabase/types.ts
   ```
7. **Storage**: **Storage → New bucket** → `order-photos` (**Private**), `worker-photos` (**Public**), `site-content` (**Public**, gambar CMS), dan `avatars` (**Public**, path `{user_id}/avatar.webp`; policy: pengguna hanya boleh menulis ke folder `{user_id}` miliknya). Upload dilakukan dari server setelah cek role.
8. **Auth**: ikuti **B11.3** (Email + Confirm email, aturan password, Google, Email Templates bahasa Indonesia, SMTP). **Authentication → URL Configuration**: Site URL = `http://localhost:3000` (diganti domain produksi setelah deploy); Redirect URLs: `http://localhost:3000/**`. Buat akun admin (**B11.7**).
9. **pg_cron:** Database → Extensions → aktifkan `pg_cron`, lalu jadwalkan `buildmate-tick` lewat migrasi (B25.4). Isi tabel `app_settings` dengan nilai awal.
10. **Realtime** (untuk C08 & antrean admin): **Database → Replication/Publications** → aktifkan untuk tabel `orders`, `order_events`, `payments`, `payouts`, `workers`, dan `job_offers`.

---

## B20. Panduan menghubungkan Midtrans Sandbox

1. **Daftar** akun di https://midtrans.com, lalu masuk ke **dashboard sandbox**: https://dashboard.sandbox.midtrans.com (pastikan mode **Sandbox**, bukan Production).
2. **Ambil kunci**: **Settings → Access Keys** → salin **Server Key** (`MIDTRANS_SERVER_KEY`) dan **Client Key** (`NEXT_PUBLIC_MIDTRANS_CLIENT_KEY`).
3. **Muat Snap.js** di halaman form pesanan & Plus:
   ```tsx
   <Script src="https://app.sandbox.midtrans.com/snap/snap.js"
           data-client-key={process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY} strategy="afterInteractive" />
   ```
4. **Buat transaksi di server**:
   ```ts
   const res = await fetch('https://app.sandbox.midtrans.com/snap/v1/transactions', {
     method: 'POST',
     headers: {
       'Content-Type': 'application/json', Accept: 'application/json',
       Authorization: 'Basic ' + Buffer.from(process.env.MIDTRANS_SERVER_KEY + ':').toString('base64'),
     },
     body: JSON.stringify({
       transaction_details: { order_id: `ORD-${order.order_code}`, gross_amount: order.total },
       item_details: [
         { id: order.package_id, price: order.package_price, quantity: 1, name: packageName },
         ...(order.service_fee ? [{ id: 'service_fee', price: order.service_fee, quantity: 1, name: 'Biaya layanan' }] : []),
       ],
       customer_details: { first_name: profile.full_name, email: user.email, phone: profile.phone },
     }),
   });
   const { token } = await res.json();   // simpan ke payments.snap_token
   ```
   Jumlah `item_details` harus sama dengan `gross_amount`.
5. **Set Notification URL** (setelah deploy, B21): **Settings → Configuration** → **Payment Notification URL** = `https://<domain-produksi>/api/webhooks/midtrans`. Isi juga Finish/Unfinish/Error Redirect URL ke `https://<domain>/payment` (halaman tetap membaca DB).
6. **Tes lokal** (opsional): `npx ngrok http 3000` → sementara pakai URL ngrok sebagai Notification URL. Kembalikan ke domain produksi setelah selesai.
7. **Simulasi pembayaran**:
   - **Kartu kredit test**: `4811 1111 1111 1114`, CVV `123`, expiry bulan/tahun di masa depan, OTP/3DS `112233`.
   - **Virtual Account / QRIS / e-wallet**: pilih metode di popup Snap, salin nomor VA/QR, lalu bayar lewat **simulator sandbox**: https://simulator.sandbox.midtrans.com
   - **Kedaluwarsa**: biarkan transaksi tidak dibayar sampai expiry, atau batalkan dari dashboard sandbox → pastikan webhook mengubah pesanan menjadi Dibatalkan.
8. **Verifikasi**: dashboard sandbox → **Transactions** menampilkan transaksi; di aplikasi, A06 Transaksi menampilkan payload webhook dan status pesanan berubah otomatis.
9. **Tes idempotensi**: dari detail transaksi di dashboard sandbox, kirim ulang notifikasi (jika tersedia) atau `curl` payload yang sama dua kali → data tidak boleh berubah dua kali.

> Jika ada perbedaan menu/URL dengan dokumentasi terbaru Midtrans, ikuti dokumentasi resmi di https://docs.midtrans.com.

**Panduan uji untuk demo (hanya saat `MIDTRANS_IS_PRODUCTION=false`):** di bawah tombol Bayar boleh tampil kotak kecil "Mode sandbox — tidak ada uang sungguhan" dengan tautan ke simulator Midtrans dan kartu uji. Kotak ini hanya petunjuk; tidak boleh mengubah status pembayaran.

---

## B21. Panduan push GitHub & deploy Vercel (pertama kali)

> Untuk AI agent: jalankan sendiri semua langkah yang bisa dijalankan tanpa bertanya. Berhenti **hanya** di langkah yang secara fisik butuh pengguna (login akun GitHub/Vercel di browser, kredensial yang belum ada), beri instruksi singkat, lalu lanjutkan otomatis.

### B21.1 Prasyarat
- Akun GitHub dan Vercel (daftar Vercel dengan akun GitHub agar terhubung).
- Git terpasang: `git --version`. Opsional: GitHub CLI `gh --version`, Vercel CLI `npx vercel --version`.
- Proyek lolos build lokal: `npm run build`.

### B21.2 Siapkan repo lokal
1. Pastikan `.gitignore` memuat minimal:
   ```
   node_modules/
   .next/
   .env
   .env*.local
   .vercel/
   supabase/.temp/
   ```
2. Buat `.env.example` berisi **nama** semua variabel B14 dengan nilai kosong (file ini di-commit).
3. Inisialisasi & commit pertama:
   ```bash
   git init
   git branch -M main
   git add .
   git commit -m "chore: initial commit"
   ```
4. Pastikan tidak ada rahasia yang ikut: `git ls-files | grep -i env` → hanya `.env.example`.

### B21.3 Buat repo GitHub & push pertama
**Opsi A — GitHub CLI (paling cepat):**
```bash
gh auth login                 # pengguna login via browser
gh repo create buildmate --private --source=. --remote=origin --push
```
**Opsi B — manual:**
1. Pengguna membuka https://github.com/new → nama `buildmate`, **Private**, **jangan** centang README/.gitignore/license.
2. Lalu:
   ```bash
   git remote add origin https://github.com/<username>/buildmate.git
   git push -u origin main
   ```
   GitHub tidak menerima password biasa lewat HTTPS; gunakan `gh auth login`, Git Credential Manager, atau Personal Access Token saat diminta.
3. Verifikasi: repo tampil di GitHub dengan commit pertama, tanpa file `.env.local`.

### B21.4 Deploy ke Vercel
1. https://vercel.com → **Add New → Project** → **Import** repo `buildmate` → framework terdeteksi Next.js.
2. **Environment Variables**: isi semua variabel B14 untuk **Production** dan **Preview**. `NEXT_PUBLIC_SITE_URL` = domain produksi. `USE_MOCK_DATA=true` boleh di hari pertama, ganti `false` setelah backend siap.
3. **Deploy** → URL `https://<nama>.vercel.app` (sudah HTTPS, memenuhi syarat Bronze).
4. Opsional Vercel CLI untuk sinkron env ke lokal:
   ```bash
   npx vercel login
   npx vercel link
   npx vercel env pull .env.local
   ```
5. Domain kustom (opsional): **Settings → Domains** → ikuti instruksi DNS; SSL otomatis.
6. Mulai sekarang, **setiap push ke `main` otomatis memicu deploy Production**; push ke branch lain membuat Preview.

### B21.5 Hubungkan layanan lain ke domain produksi
- **Supabase → Authentication → URL Configuration:** Site URL = domain produksi; Redirect URLs: `https://<domain>/**`, `http://localhost:3000/**`, `https://*-<akun>.vercel.app/**`.
- **Midtrans Sandbox:** Notification URL & redirect URL ke domain produksi (B20 langkah 5).
- **Google OAuth** (jika dipakai): tambah domain produksi ke Authorized JavaScript origins.

### B21.6 Tandai selesai
Perbarui `docs/BUILD_STATUS.md`: "Push pertama ke GitHub: ✅ <tanggal>", URL repo, URL produksi. Mulai titik ini, berlaku **B22**.

### B21.7 Cek pasca-deploy
Login 3 role, buat pesanan, bayar sandbox, pastikan webhook masuk (A06), foto bisa diunggah, tidak ada error di HP.

---

## B22. Alur kerja setelah push pertama: auto-push & sinkron database

> Aturan untuk AI agent: setelah push pertama berhasil (BUILD_STATUS menandai ✅), **setiap tugas yang selesai langsung di-commit, di-push ke GitHub, dan perubahan database disinkronkan**, tanpa menunggu diminta. Satu project Supabase dipakai bersama oleh lokal dan produksi (simulasi), jadi "sinkron database" berarti menerapkan migrasi ke database online tersebut.

### B22.1 Langkah wajib di akhir setiap tugas
1. **Verifikasi lokal** — semua harus lolos sebelum push:
   ```bash
   npm run lint
   npx tsc --noEmit
   npm run build
   ```
   Jika gagal: perbaiki dulu. **Jangan pernah push build yang gagal.**
2. **Sinkron database (jika skema/fungsi/policy berubah):**
   ```bash
   npx supabase migration new <nama_perubahan>     # tulis SQL di file migrasi baru
   npx supabase db push                            # terapkan ke database online
   npx supabase gen types typescript --linked > lib/supabase/types.ts
   npx supabase migration list                     # pastikan lokal & remote sama
   ```
   - **Semua perubahan skema lewat file migrasi**, tidak pernah diubah langsung di dashboard. Jika terlanjur diubah di dashboard, rekam dengan `npx supabase db pull` menjadi migrasi.
   - Jangan mengedit file migrasi yang sudah di-push; buat migrasi baru.
   - Migrasi **destruktif** (drop kolom/tabel, hapus data, ubah tipe) → boleh langsung, **tetapi** buat cadangan dulu (`npx supabase db dump -f supabase/backups/<tanggal>.sql`, file backup tidak di-commit) dan catat di `docs/DECISIONS.md`.
   - Urutan: `db push` **sebelum** `git push` jika kode baru bergantung pada skema baru, agar produksi tidak mengakses kolom yang belum ada. Utamakan migrasi aditif (tambah kolom nullable dulu).
3. **Env var baru?** Tambahkan namanya ke `.env.example`, tambahkan sendiri ke Vercel dengan `npx vercel env add <NAMA> production` (dan `preview`), lalu redeploy. Jika Vercel CLI belum login, beri tahu pengguna satu kali.
4. **Perbarui `docs/BUILD_STATUS.md`** (status item, migrasi terakhir, catatan).
5. **Commit** dengan format Conventional Commits:
   ```bash
   git add -A
   git commit -m "feat(admin): dashboard count-up stat cards"
   ```
   Prefiks: `feat`, `fix`, `refactor`, `style`, `db` (migrasi), `docs`, `chore`. Satu commit = satu tugas yang utuh.
6. **Push:**
   ```bash
   git pull --rebase origin main   # jaga agar tidak bentrok
   git push origin main
   ```
   Push ke `main` memicu deploy Production di Vercel.
7. **Cek deploy:** pantau di dashboard Vercel (atau `npx vercel ls`) sampai status **Ready**; buka URL produksi dan uji singkat fitur yang baru dibuat.
8. **Laporkan ke pengguna:** ringkasan perubahan, hash commit, migrasi yang diterapkan, status deploy, dan URL.

### B22.2 Aturan keamanan & data
- Jangan pernah commit `.env*` (kecuali `.env.example`), service role key, atau Midtrans server key. Jika bocor: segera rotasi kunci di Supabase/Midtrans dan perbarui di Vercel.
- `seed.sql` hanya dijalankan **sekali** saat setup. Data demo memakai file terpisah `supabase/seed_demo.sql` yang dijalankan **sengaja** oleh pengguna, bukan otomatis setiap push.
- Sebelum menghapus data produksi, buat cadangan (`db dump`) dan catat alasannya.

### B22.3 Jika ada masalah
- **Deploy gagal:** baca log build di Vercel, perbaiki, commit `fix`, push lagi. Untuk darurat: Vercel → Deployments → **Promote** deployment sebelumnya.
- **Migrasi salah:** buat migrasi baru yang membalik perubahan (jangan edit riwayat).
- **Lokal & remote migrasi berbeda:** jalankan `npx supabase migration list`, lalu `npx supabase db pull` atau `db push` sesuai sisi yang tertinggal; pilih sisi yang sesuai dengan file migrasi di repo.

> Catatan: di Antigravity, eksekusi perintah terminal bisa meminta persetujuan pengguna. Pengguna sudah memberi izin penuh; atur Antigravity agar perintah dijalankan otomatis (lihat bagian 0 tiap file).

---

## B23. Protokol cek sebelum membangun (jangan bangun ulang)

Jalankan **di awal setiap sesi** dan **sebelum setiap tugas**:

1. **Baca** `docs/BUILD_STATUS.md` (jika belum ada, buat dari template di bawah).
2. **Sinkron & cek git:**
   ```bash
   git status
   git pull --rebase origin main      # jika remote sudah ada
   git log --oneline -15
   ```
3. **Cek kode yang sudah ada** untuk tugas yang akan dikerjakan:
   - Route/halaman: `ls app/admin app/mitra app/(customer)` dll.
   - Komponen: cari dulu sebelum membuat (`grep -ri "StatCard" components`).
   - Lapisan data & API: `ls lib/data app/api`.
4. **Cek database:** `npx supabase migration list` dan bandingkan tabel/kolom dengan B9.
5. **Klasifikasikan setiap item tugas:**
   | Kondisi | Tindakan |
   |---|---|
   | Sudah ada & berfungsi sesuai spesifikasi | **Lewati.** Paling jauh rapikan bagian yang jelas melanggar spesifikasi |
   | Ada tapi belum lengkap / ada bug | **Lanjutkan dari yang ada**, jangan tulis ulang dari nol |
   | Belum ada | Bangun |
   | Ada tapi berbeda dari spesifikasi | Sesuaikan ke spesifikasi, catat perubahan di `docs/DECISIONS.md` |
6. **Catat rencana** di `docs/BUILD_STATUS.md` (item → status → tindakan), lalu **langsung kerjakan** tanpa menunggu persetujuan.
7. Jika perlu, jalankan `npm run dev` dan buka halamannya untuk memastikan benar-benar berfungsi, bukan hanya filenya ada.

Larangan:
- Membuat komponen/file duplikat (`StatCard2.tsx`, `DashboardNew.tsx`). Perbaiki yang ada.
- Menulis ulang kode yang berfungsi hanya karena preferensi gaya.
- Membuat ulang tabel/migrasi yang sudah ada di remote.

### Template `docs/BUILD_STATUS.md`
```md
# Build Status — BuildMate
Terakhir diperbarui: <tanggal>
Push pertama ke GitHub: ⬜ belum / ✅ <tanggal>
Repo: -
URL produksi: -
Mode data: mock / supabase
Migrasi terakhir: -

Keterangan: ⬜ belum · 🟡 sebagian · ✅ selesai

## Fondasi & backend
| Item | Status | Catatan |
|---|---|---|
| Setup Next.js + Tailwind + shadcn | ⬜ | |
| Design system B7 (lavender, Geist + Instrument Serif, Iconsax) | ⬜ | |
| Komponen inti + micro-interaction | ⬜ | |
| Supabase: skema + RLS + seed | ⬜ | |
| Auth: trigger profil, callback, middleware 3 role | ⬜ | |
| Auth: Google OAuth + klaim role mitra | ⬜ | |
| Auth: email template & SMTP | ⬜ | |
| transitionOrder (RPC) + audit | ⬜ | |
| Midtrans Snap (ORD-) | ⬜ | |
| Webhook Midtrans | ⬜ | |
| Plus + paywall (SUB-) | ⬜ | |
| Storage foto + guard foto hasil | ⬜ | |
| Realtime status | ⬜ | |
| Komplain / batas waktu / refund / payouts | ⬜ | |
| Push GitHub + deploy Vercel | ⬜ | |

## Admin
| ID | Halaman | Status | Catatan |
|---|---|---|---|
| A00a | Masuk admin | ⬜ | |
| A00b | Lupa password admin | ⬜ | |
| A00c | Reset password admin | ⬜ | |
| A00d | Akses ditolak | ⬜ | |
| A00e | Terima undangan staf | ⬜ | |
| A01 | Dashboard | ⬜ | |
| A02 | Daftar pesanan | ⬜ | |
| A03 | Detail pesanan | ⬜ | |
| A04 | Tukang + Pendaftaran | ⬜ | |
| A05 | Layanan | ⬜ | |
| A06 | Transaksi | ⬜ | |
| A07 | Pencairan dana | ⬜ | |
| A08 | Pelanggan & Member (opsional) | ⬜ | |
| A09 | Pengaturan | ⬜ | |
| A10 | Tim & Akses | ⬜ | |
| A11 | Konten Situs (CMS) | ⬜ | |
| A12 | Hak akses (requirePermission, has_permission, PermissionGate) | ⬜ | |

## Pelanggan
| ID | Halaman | Status | Catatan |
|---|---|---|---|
| C01 | Beranda | ⬜ | |
| C02a | Masuk | ⬜ | |
| C02b | Daftar | ⬜ | |
| C02c | Verifikasi email | ⬜ | |
| C02d | Lupa password | ⬜ | |
| C02e | Reset password | ⬜ | |
| C02f | Lengkapi profil | ⬜ | |
| C03 | Cari | ⬜ | |
| C04 | Detail tukang | ⬜ | |
| C05 | Form pesanan | ⬜ | |
| C06 | Status pembayaran | ⬜ | |
| C07 | Pesanan saya | ⬜ | |
| C08 | Detail pesanan | ⬜ | |
| C09 | BuildMate Plus | ⬜ | |
| C10 | Akun | ⬜ | |

## Tukang
| ID | Halaman | Status | Catatan |
|---|---|---|---|
| W00a | Masuk mitra | ⬜ | |
| W00b | Daftar akun mitra | ⬜ | |
| W00c | Verifikasi email | ⬜ | |
| W00d | Lupa password | ⬜ | |
| W00e | Reset password | ⬜ | |
| W01 | Formulir pendaftaran mitra | ⬜ | |
| W02 | Status pendaftaran | ⬜ | |
| W03 | Beranda mitra | ⬜ | |
| W04 | Daftar pekerjaan | ⬜ | |
| W05 | Detail pekerjaan | ⬜ | |
| W06 | Pendapatan | ⬜ | |
| W07 | Profil mitra | ⬜ | |

## Env var yang sudah diset di Vercel
-

## Log perubahan
| Tanggal | Commit | Ringkasan | Migrasi |
|---|---|---|---|
```

---

## B24. Checklist sebelum demo

- [ ] `USE_MOCK_DATA=false` di Production; seed demo bersih (tanpa data uji acak).
- [ ] `git status` bersih, commit terakhir sudah di-push, deploy Vercel **Ready**, `npx supabase migration list` lokal = remote.
- [ ] Akun siap: admin, pelanggan Gratis, pelanggan Plus, 2 tukang approved, 1 pendaftar pending.
- [ ] `AUTO_COMPLETE_MINUTES` & batas respons tawaran diset pendek untuk demo.
- [ ] Notification URL Midtrans mengarah ke domain produksi; 1 transaksi uji berhasil hari itu.
- [ ] Kartu test & simulator sandbox dibuka di tab terpisah.
- [ ] Pesanan contoh di setiap status tersedia sebagai cadangan jika demo live gagal.
- [ ] Count-up, timeline realtime, dan slider sebelum/sesudah dicek di laptop & HP.
- [ ] Tidak ada alamat/nomor asli di layar.

---

## B25. Dispatch otomatis (model hybrid) & penjadwal

Model **hybrid**: pelanggan memesan **paket** dan boleh memilih tukang favorit; sistem mengirim tawaran secara otomatis dan **berurutan**, lalu melempar ke tukang berikutnya jika ditolak atau tidak direspons — seperti aplikasi ojek online.

### B25.1 Konsep
- Di form pesanan pelanggan memilih salah satu: **tukang favorit** (dari halaman profil tukang → `preferred_worker_id`) atau **"Pilihkan tukang terbaik"** (`preferred_worker_id = null`).
- Checkbox **"Boleh dialihkan ke tukang lain jika tukang pilihanku berhalangan"** → `orders.allow_reassign` (default `true`). Jika `false`, tawaran hanya dikirim ke tukang pilihan; bila ditolak/kedaluwarsa → antrean admin.
- Dispatch dimulai otomatis setelah webhook mengubah pesanan menjadi `paid`.
- **Hanya tukang berakun dan `approved`** yang ikut dispatch otomatis. Tukang "dikelola admin" hanya bisa ditugaskan manual oleh admin.
- `orders.worker_id` baru terisi saat ada tukang yang menerima.

### B25.2 Kandidat & urutan
**Syarat kandidat:** `application_status='approved'`, `is_active`, punya paket pesanan (`worker_packages`), **tidak punya pesanan aktif di tanggal + slot yang sama**, dan belum pernah ditawari pesanan ini.

**Urutan prioritas:**
1. Tukang pilihan pelanggan (jika ada).
2. Area layanan sama dengan area alamat pelanggan.
3. Pekerjaan aktif paling sedikit.
4. Paling lama tidak mendapat tawaran (`workers.last_offered_at` terlama) — agar merata.

### B25.3 Alur dispatch
1. Webhook → `paid` → `orders.dispatch_status = 'searching'` → `dispatch_next_offer(order_id)` membuat baris `job_offers` (`pending`, `expires_at = now() + offer_timeout_seconds`) dan memperbarui `workers.last_offered_at`, `orders.dispatch_attempts`.
2. **Terima** (`accept_offer(offer_id)`, RPC security definer): dalam satu transaksi, kunci baris pesanan (`select … for update`), pastikan tawaran masih `pending`, belum kedaluwarsa, milik `my_worker_id()`, dan pesanan masih `paid` tanpa tukang → tawaran `accepted`, `orders.worker_id` diisi, `dispatch_status='assigned'`, transisi `paid → worker_confirmed` (aktor `worker`). Jika gagal → pesan "Tawaran ini sudah tidak berlaku."
3. **Tolak** (`decline_offer(offer_id, reason)`) atau **kedaluwarsa** (oleh penjadwal) → tawaran `declined`/`expired` → event `offer_declined`/`offer_expired` → `dispatch_next_offer`.
4. **Tidak ada kandidat lagi** atau `dispatch_attempts` mencapai `dispatch_max_attempts` → `dispatch_status='exhausted'` → masuk antrean admin. Pelanggan melihat: "Kami masih mencarikan tukang. Tim BuildMate akan menghubungimu."
5. **Tindakan admin** (A03): **Tugaskan manual** (tukang mana pun yang memiliki paket itu, termasuk dikelola admin → langsung `worker_confirmed`), **Cari ulang** (reset daftar kandidat dan mulai lagi), atau **Batalkan + refund**.
6. Tukang berhalangan **setelah** menerima (kabar via WA) → admin **Lepas tukang & cari ulang**: transisi `worker_confirmed → paid` (aktor admin), `worker_id` dikosongkan, dispatch dimulai lagi (tukang lama dikecualikan; jika `allow_reassign=false`, admin wajib mencentang "Pelanggan sudah menyetujui").
7. Setiap langkah menulis `order_events` (`offer_sent`, `offer_accepted`, `offer_declined`, `offer_expired`, `dispatch_exhausted`, `worker_assigned_manual`, `worker_released`).

### B25.4 Penjadwal (pg_cron) & selesai otomatis
Aktifkan extension **pg_cron** (Supabase → Database → Extensions). Jadwalkan satu "tick":
```sql
select cron.schedule('buildmate-tick', '* * * * *',
  $$ select public.dispatch_tick(); select public.auto_complete_tick(); $$);
```
- `dispatch_tick()`: tandai `job_offers` `pending` yang melewati `expires_at` menjadi `expired`, lalu panggil `dispatch_next_offer` untuk pesanannya.
- `auto_complete_tick()`: pesanan `awaiting_confirmation` yang melewati `auto_complete_minutes` **dan** tanpa komplain `open` → `completed` (aktor `system`, `completed_by='system'`) + buat payout.
- Resolusi pg_cron standar 1 menit. Jika versi pg_cron di proyek mendukung interval detik (mis. `'20 seconds'`), gunakan untuk mode demo.
- **Pengecekan malas (lazy):** setiap kali API membaca tawaran/pesanan, jalankan juga pengecekan kedaluwarsa untuk baris itu, sehingga UI tetap akurat di antara tick.
- Nilai konfigurasi yang dibaca fungsi SQL disimpan di tabel `app_settings` (B9): `offer_timeout_seconds`, `dispatch_max_attempts`, `auto_complete_minutes`. Nilai awal diisi dari env saat setup.

### B25.5 Realtime
- **Tukang:** subscribe `job_offers` dengan filter `worker_id=eq.{id}` → kartu tawaran langsung muncul dengan hitung mundur dan getar, tanpa refresh (selama aplikasi terbuka).
- **Pelanggan:** perubahan `orders.dispatch_status` & `worker_id` → "Mencari tukang…" → "Tukang ditemukan: {nama}". Jika dialihkan dari tukang pilihan: "{nama} berhalangan, kami alihkan ke tukang lain."
- **Admin:** antrean dan panel dispatch diperbarui langsung.
- Notifikasi push saat aplikasi tertutup (Web Push/PWA) **di luar scope MVP** (kandidat P2).

### B25.6 Keamanan
- RLS `job_offers`: worker hanya membaca tawarannya sendiri; admin membaca semua; pelanggan tidak punya akses (hanya melihat `dispatch_status` di pesanannya).
- Terima/tolak hanya lewat RPC yang mengecek `my_worker_id()`; dua tukang tidak mungkin menerima pesanan yang sama (kunci baris + cek status).
- Sebelum tawaran diterima, data yang dikirim ke tukang hanya: paket, area, tanggal, slot, nominal hak tukang, deskripsi & foto masalah. Alamat lengkap & kontak pelanggan baru dikirim setelah diterima.
