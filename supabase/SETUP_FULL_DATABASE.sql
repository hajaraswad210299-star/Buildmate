-- ==============================================================================
-- BUILDMATE COMPLETE DATABASE SETUP (SCHEMA, STORAGE, POLICIES & SEED DATA)
-- Jalankan file ini langsung di Supabase SQL Editor:
-- https://supabase.com/dashboard/project/izryebajgljqffgixqak/sql/new
-- ==============================================================================

-- 1. Profiles Table
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text,
  phone text,
  default_address text,
  avatar_url text,
  onboarding_completed boolean not null default false,
  role text not null default 'customer' check (role in ('customer', 'worker', 'admin')),
  created_at timestamptz default now()
);

-- 2. Categories Table
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  icon text not null default 'Setting4',
  is_active boolean default true,
  order_index int default 0,
  created_at timestamptz default now()
);

-- 3. Workers Table (user_id null = dikelola admin)
create table if not exists public.workers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique null references public.profiles(id) on delete set null,
  full_name text not null,
  slug text unique not null,
  phone text not null,
  email text,
  bio text,
  service_area text not null,
  experience_years int default 1,
  photo_path text,
  portfolio_paths text[] default '{}',
  application_status text not null default 'approved'
    check (application_status in ('draft', 'pending', 'approved', 'rejected')),
  rejection_reason text,
  reviewed_by uuid null references public.profiles(id),
  reviewed_at timestamptz,
  is_verified boolean default false,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- 4. Service Packages Table
create table if not exists public.service_packages (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories(id) on delete cascade,
  name text not null,
  description text,
  price int not null,
  est_duration_minutes int not null default 60,
  inclusions text[] default '{}',
  exclusions text[] default '{}',
  is_active boolean default true,
  created_at timestamptz default now()
);

-- 5. Worker Packages
create table if not exists public.worker_packages (
  worker_id uuid not null references public.workers(id) on delete cascade,
  package_id uuid not null references public.service_packages(id) on delete cascade,
  primary key (worker_id, package_id)
);

-- 6. Orders Table
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_code text unique not null,
  customer_id uuid not null references public.profiles(id),
  worker_id uuid null references public.workers(id),
  package_id uuid not null references public.service_packages(id),
  package_price int not null,
  service_fee int not null default 5000,
  total int not null,
  address text not null,
  scheduled_date date not null,
  time_slot text not null,
  description text,
  status text not null default 'pending_payment'
    check (status in (
      'pending_payment', 'paid', 'worker_confirmed', 'on_the_way',
      'in_progress', 'awaiting_confirmation', 'completed', 'cancelled'
    )),
  worker_response text default 'pending'
    check (worker_response in ('pending', 'accepted', 'declined')),
  admin_notes text,
  cancel_reason text,
  paid_at timestamptz,
  worker_confirmed_at timestamptz,
  on_the_way_at timestamptz,
  in_progress_at timestamptz,
  awaiting_confirmation_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  completed_by text check (completed_by in ('customer', 'admin')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 7. Order Photos
create table if not exists public.order_photos (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  type text not null check (type in ('problem', 'result')),
  uploaded_by text not null check (uploaded_by in ('customer', 'worker', 'admin')),
  source_note text,
  storage_path text not null,
  created_at timestamptz default now()
);

-- 8. Order Events (Audit Timeline)
create table if not exists public.order_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  event_type text not null,
  from_status text,
  to_status text,
  actor_type text not null,
  actor_id uuid null,
  actor_name text,
  note text,
  created_at timestamptz default now()
);

-- 9. Complaints Table
create table if not exists public.complaints (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  description text not null,
  status text not null default 'open' check (status in ('open', 'closed')),
  is_warranty boolean default false,
  resolution text,
  created_at timestamptz default now(),
  closed_at timestamptz
);

-- 10. Payments Table
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  provider_order_id text unique not null,
  kind text not null check (kind in ('order', 'subscription')),
  ref_id uuid not null,
  customer_id uuid not null references public.profiles(id),
  amount int not null,
  status text not null default 'pending'
    check (status in ('pending', 'success', 'failed', 'refunded')),
  snap_token text,
  raw_payload jsonb,
  processed_at timestamptz,
  created_at timestamptz default now()
);

-- 11. Subscriptions Table (Plus Membership)
create table if not exists public.subscriptions (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  plan text default 'free',
  current_period_end timestamptz null,
  updated_at timestamptz default now()
);

-- 12. Payouts Table (Escrow Ledger)
create table if not exists public.payouts (
  id uuid primary key default gen_random_uuid(),
  order_id uuid unique not null references public.orders(id) on delete cascade,
  worker_id uuid not null references public.workers(id),
  amount int not null,
  status text not null default 'pending' check (status in ('pending', 'paid')),
  paid_at timestamptz,
  paid_by uuid null references public.profiles(id),
  note text,
  created_at timestamptz default now()
);

-- Indexes for performance
create index if not exists idx_orders_status_created on public.orders (status, created_at desc);
create index if not exists idx_orders_customer on public.orders (customer_id);
create index if not exists idx_orders_worker on public.orders (worker_id, status);
create index if not exists idx_order_events_order on public.order_events (order_id, created_at);
create index if not exists idx_workers_active on public.workers (application_status, is_active);
create index if not exists idx_packages_active on public.service_packages (category_id, is_active);
create index if not exists idx_payouts_worker on public.payouts (worker_id, status);

-- Security Helper Functions
create or replace function public.my_role() returns text
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.my_worker_id() returns uuid
language sql stable security definer set search_path = public as $$
  select id from public.workers where user_id = auth.uid()
$$;

-- Trigger New User Profile
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, phone, avatar_url, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', 'Pengguna Baru'),
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'avatar_url',
    case when new.raw_user_meta_data->>'signup_as' = 'worker' then 'worker' else 'customer' end
  )
  on conflict (id) do nothing;
  
  insert into public.subscriptions (user_id) values (new.id)
  on conflict (user_id) do nothing;
  
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users for each row execute function public.handle_new_user();

-- Enable RLS
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.workers enable row level security;
alter table public.service_packages enable row level security;
alter table public.worker_packages enable row level security;
alter table public.orders enable row level security;
alter table public.order_photos enable row level security;
alter table public.order_events enable row level security;
alter table public.complaints enable row level security;
alter table public.payments enable row level security;
alter table public.subscriptions enable row level security;
alter table public.payouts enable row level security;

-- Admin Full Access Policies
drop policy if exists admin_all_profiles on public.profiles;
create policy admin_all_profiles on public.profiles for all using (public.my_role() = 'admin');

drop policy if exists admin_all_orders on public.orders;
create policy admin_all_orders on public.orders for all using (public.my_role() = 'admin');

drop policy if exists admin_all_workers on public.workers;
create policy admin_all_workers on public.workers for all using (public.my_role() = 'admin');

drop policy if exists admin_all_categories on public.categories;
create policy admin_all_categories on public.categories for all using (public.my_role() = 'admin');

drop policy if exists admin_all_packages on public.service_packages;
create policy admin_all_packages on public.service_packages for all using (public.my_role() = 'admin');

drop policy if exists admin_all_payouts on public.payouts;
create policy admin_all_payouts on public.payouts for all using (public.my_role() = 'admin');

drop policy if exists admin_all_payments on public.payments;
create policy admin_all_payments on public.payments for all using (public.my_role() = 'admin');

-- Public Read Catalog Policies
drop policy if exists public_read_categories on public.categories;
create policy public_read_categories on public.categories for select using (is_active = true);

drop policy if exists public_read_packages on public.service_packages;
create policy public_read_packages on public.service_packages for select using (is_active = true);

drop policy if exists public_read_workers on public.workers;
create policy public_read_workers on public.workers for select using (application_status = 'approved' and is_active = true);

-- User Self Profile Policies
drop policy if exists user_read_own_profile on public.profiles;
create policy user_read_own_profile on public.profiles for select using (id = auth.uid());

drop policy if exists user_update_own_profile on public.profiles;
create policy user_update_own_profile on public.profiles for update using (id = auth.uid());

-- Storage Bucket: Avatars
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = true;

drop policy if exists "Public avatars view" on storage.objects;
create policy "Public avatars view" on storage.objects for select using (bucket_id = 'avatars');

drop policy if exists "Users can upload their own avatar" on storage.objects;
create policy "Users can upload their own avatar" on storage.objects for insert to authenticated
with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users can update their own avatar" on storage.objects;
create policy "Users can update their own avatar" on storage.objects for update to authenticated
using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users can delete their own avatar" on storage.objects;
create policy "Users can delete their own avatar" on storage.objects for delete to authenticated
using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- ==============================================================================
-- SEED DATA (Katalog Kategori & Paket Layanan)
-- ==============================================================================
insert into public.categories (id, name, slug, icon, is_active, order_index)
values
  ('a0000000-0000-0000-0000-000000000001', 'Plumbing', 'plumbing', 'Drop', true, 1),
  ('a0000000-0000-0000-0000-000000000002', 'Pengecatan', 'pengecatan', 'Brush2', true, 2),
  ('a0000000-0000-0000-0000-000000000003', 'Perbaikan Umum', 'perbaikan-umum', 'Ruler', true, 3),
  ('a0000000-0000-0000-0000-000000000004', 'Servis AC Ringan', 'servis-ac', 'Wind', true, 4)
on conflict (id) do nothing;

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
    'b0000000-0000-0000-0000-000000000002',
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

-- Pastikan akun Super Admin terdaftar di public.profiles dengan role 'admin'
insert into public.profiles (id, full_name, role, onboarding_completed)
select id, 'Super Admin', 'admin', true
from auth.users
where email = 'hajaraswad210299@gmail.com'
on conflict (id) do update set role = 'admin', onboarding_completed = true;
