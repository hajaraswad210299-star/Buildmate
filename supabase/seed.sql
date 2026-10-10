-- ==========================================================
-- BUILDMATE SEED DATA (B17)
-- ==========================================================

-- 1. Insert Categories
insert into public.categories (id, name, slug, icon, is_active, order_index)
values
  ('a0000000-0000-0000-0000-000000000001', 'Plumbing', 'plumbing', 'Drop', true, 1),
  ('a0000000-0000-0000-0000-000000000002', 'Pengecatan', 'pengecatan', 'Brush2', true, 2),
  ('a0000000-0000-0000-0000-000000000003', 'Perbaikan Umum', 'perbaikan-umum', 'Ruler', true, 3),
  ('a0000000-0000-0000-0000-000000000004', 'Servis AC Ringan', 'servis-ac', 'Wind', true, 4)
on conflict (id) do nothing;

-- 2. Insert Service Packages (Table B3)
insert into public.service_packages (id, category_id, name, description, price, est_duration_minutes, inclusions, exclusions, is_active)
values
  (
    'b0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    'Ganti Keran Air',
    'Pelepasan keran lama dan pemasangan keran baru wastafel atau kamar mandi.',
    150000, 60,
    array['Pelepasan keran lama', 'Pemasangan keran baru presisi', 'Penyekatan seal tape', 'Uji kebocoran'],
    array['Unit keran baru disediakan pelanggan'],
    true
  ),
  (
    'b0000000-0000-0000-0000-000000000002',
    'a0000000-0000-0000-0000-000000000001',
    'Bersihkan Saluran Mampet',
    'Pembersihan pipa pembuangan atau floor drain kamar mandi mampet.',
    200000, 90,
    array['Pembersihan sumbatan mekanik', 'Flushing pipa pembuangan', 'Uji kelancaran debit air'],
    array['Penggantian pipa pecah bawah tanah'],
    true
  ),
  (
    'b0000000-0000-0000-0000-000000000003',
    'a0000000-0000-0000-0000-000000000001',
    'Perbaiki Kebocoran Pipa Kecil',
    'Penambalan atau penyambungan pipa PVC/fitting terbuka yang rembes.',
    175000, 75,
    array['Deteksi rembesan pipa', 'Penyambungan fitting PVC baru', 'Lem pipa tekanan tinggi'],
    array['Bobok tembok skala luas > 1 meter'],
    true
  ),
  (
    'b0000000-0000-0000-0000-000000000004',
    'a0000000-0000-0000-0000-000000000002',
    'Cat Ulang Dinding s.d. 10 m²',
    'Pengecatan interior atau eksterior dinding satu bidang ruangan.',
    350000, 180,
    array['Pembersihan amplas ringan', 'Pengecatan 2 lapis merata', 'Proteksi masking tape tepi'],
    array['Cat dinding disediakan pelanggan'],
    true
  ),
  (
    'b0000000-0000-0000-0000-000000000005',
    'a0000000-0000-0000-0000-000000000002',
    'Touch-up Cat Area Kecil',
    'Perbaikan cat terkelupas atau noda baret pada area dinding tertentu.',
    150000, 60,
    array['Dempul halus bagian baret', 'Pengecatan spot matching warna'],
    array['Cat warna khusus blending multi-warna'],
    true
  ),
  (
    'b0000000-0000-0000-0000-000000000006',
    'a0000000-0000-0000-0000-000000000003',
    'Perbaiki Engsel / Pintu Seret',
    'Penyetelan pintu kayu/aluminium yang seret atau anjlok.',
    100000, 45,
    array['Penyetelan baut engsel', 'Pengetaman tipis tepi seret', 'Pelumas anti karat'],
    array['Penggantian daun pintu baru'],
    true
  ),
  (
    'b0000000-0000-0000-0000-000000000007',
    'a0000000-0000-0000-0000-000000000003',
    'Pasang Rak Dinding / Ambalan',
    'Pengeboran dan pemasangan rak dinding atau gantungan pakaian.',
    120000, 60,
    array['Pengeboran presisi waterpass', 'Pemasangan fisher dan sekrup kokoh', 'Uji beban s.d 10kg'],
    array['Unit rak disediakan pelanggan'],
    true
  )
on conflict (id) do nothing;

-- 3. Insert Workers (Campuran Mitra Berakun & Dikelola Admin)
insert into public.workers (id, full_name, slug, phone, email, bio, service_area, experience_years, application_status, is_verified, is_active)
values
  (
    'c0000000-0000-0000-0000-000000000001',
    'Budi Santoso',
    'budi-santoso',
    '6281234567891',
    'budi.santoso@gmail.com',
    'Spesialis plumbing & instalasi pipa bertekanan dengan pengalaman lebih dari 8 tahun di Jakarta Selatan.',
    'Jakarta Selatan',
    8,
    'approved',
    true,
    true
  ),
  (
    'c0000000-0000-0000-0000-000000000002',
    'Ahmad Hidayat',
    'ahmad-hidayat',
    '6281234567892',
    'ahmad.hidayat@gmail.com',
    'Ahli pengecatan dinding dan plafon rumah tinggal di Jakarta Timur. Rapi dan tepat waktu.',
    'Jakarta Timur',
    5,
    'approved',
    true,
    true
  ),
  (
    'c0000000-0000-0000-0000-000000000003',
    'Pak Joko Waskito',
    'pak-joko-waskito',
    '6281234567893',
    'joko.offline@buildmate.local',
    'Tukang serabutan senior untuk kunci, engsel pintu, dan perbaikan perabotan rumah.',
    'Jakarta Barat',
    12,
    'approved',
    true,
    true
  ),
  (
    'c0000000-0000-0000-0000-000000000004',
    'Rian Pramono',
    'rian-pramono',
    '6281234567894',
    'rian.pramono@gmail.com',
    'Teknisi pipa muda berpengalaman untuk perumahan dan apartemen.',
    'Jakarta Selatan',
    3,
    'pending',
    false,
    false
  )
on conflict (id) do nothing;
