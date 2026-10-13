-- ==========================================================
-- BUILDMATE STAFF ROLES, PERMISSIONS & CMS (A10, A11, A12, B9)
-- ==========================================================

-- 1. Create Roles Table
create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  description text,
  permissions text[] not null default '{}',
  is_preset boolean default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. Alter Profiles Table to support Staff Role & Status
do $$
begin
  -- Drop existing check constraint on profiles.role if it exists
  alter table public.profiles drop constraint if exists profiles_role_check;
  alter table public.profiles add constraint profiles_role_check
    check (role in ('customer', 'worker', 'admin', 'staff'));

  -- Add staff_role_id if not exists
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'staff_role_id') then
    alter table public.profiles add column staff_role_id uuid references public.roles(id) on delete set null;
  end if;

  -- Add staff_status if not exists
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'staff_status') then
    alter table public.profiles add column staff_status text check (staff_status in ('invited', 'active', 'disabled'));
  end if;
end $$;

-- 3. Seed Preset Roles (A10 & A12)
insert into public.roles (id, name, description, permissions, is_preset)
values
  (
    '00000000-0000-0000-0000-000000000001',
    'Editor Konten',
    'Dapat melihat dashboard dan mengelola seluruh konten publik CMS.',
    array['dashboard.view', 'content.manage'],
    true
  ),
  (
    '00000000-0000-0000-0000-000000000002',
    'Pemantau Tukang',
    'Dapat memantau pesanan, melihat mitra, dan memverifikasi aplikasi pendaftaran tukang.',
    array['dashboard.view', 'workers.view', 'workers.review', 'orders.view'],
    true
  )
on conflict (name) do update
set
  description = excluded.description,
  permissions = excluded.permissions,
  is_preset = excluded.is_preset;

-- 4. Function has_permission (A12 & B9)
create or replace function public.has_permission(p text) returns boolean
language sql stable security definer set search_path = public as $$
  select case
    when public.my_role() = 'admin' then true
    when public.my_role() = 'staff' then exists (
      select 1 from public.profiles prof
      join public.roles r on prof.staff_role_id = r.id
      where prof.id = auth.uid()
        and prof.staff_status = 'active'
        and p = any(r.permissions)
    )
    else false
  end;
$$;

-- 5. Update handle_new_user trigger to recognize staff
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (
    id,
    full_name,
    phone,
    avatar_url,
    role,
    staff_role_id,
    staff_status
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'avatar_url',
    case new.raw_user_meta_data->>'signup_as'
      when 'worker' then 'worker'
      when 'staff'  then 'staff'
      else 'customer' end,
    case
      when new.raw_user_meta_data->>'staff_role_id' is not null
        then (new.raw_user_meta_data->>'staff_role_id')::uuid
      else null end,
    case
      when new.raw_user_meta_data->>'signup_as' = 'staff' then 'invited'
      else null end
  );

  insert into public.subscriptions (user_id) values (new.id)
  on conflict (user_id) do nothing;

  return new;
end; $$;

-- 6. CMS Tables: site_content and faq_items (A11)
create table if not exists public.site_content (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz default now()
);

create table if not exists public.faq_items (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  answer text not null,
  sort_order int default 0,
  is_active boolean default true,
  updated_at timestamptz default now()
);

-- 7. Admin Audit Log Table
create table if not exists public.admin_audit (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  actor_id uuid references public.profiles(id) on delete set null,
  details jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- 8. Storage bucket for CMS
insert into storage.buckets (id, name, public)
values ('site-content', 'site-content', true)
on conflict (id) do update set public = true;

-- 9. RLS Policies
alter table public.roles enable row level security;
alter table public.site_content enable row level security;
alter table public.faq_items enable row level security;
alter table public.admin_audit enable row level security;

-- Roles policies
drop policy if exists admin_all_roles on public.roles;
create policy admin_all_roles on public.roles
  for all using (public.my_role() = 'admin');

drop policy if exists staff_read_roles on public.roles;
create policy staff_read_roles on public.roles
  for select using (public.my_role() in ('admin', 'staff'));

-- Site content policies
drop policy if exists public_read_site_content on public.site_content;
create policy public_read_site_content on public.site_content
  for select using (true);

drop policy if exists manage_site_content on public.site_content;
create policy manage_site_content on public.site_content
  for all using (public.has_permission('content.manage'));

-- FAQ items policies
drop policy if exists public_read_faq_items on public.faq_items;
create policy public_read_faq_items on public.faq_items
  for select using (is_active = true or public.has_permission('content.manage'));

drop policy if exists manage_faq_items on public.faq_items;
create policy manage_faq_items on public.faq_items
  for all using (public.has_permission('content.manage'));

-- Admin audit policies
drop policy if exists view_admin_audit on public.admin_audit;
create policy view_admin_audit on public.admin_audit
  for select using (public.my_role() = 'admin');

drop policy if exists insert_admin_audit on public.admin_audit;
create policy insert_admin_audit on public.admin_audit
  for insert with check (public.my_role() in ('admin', 'staff'));

-- Update existing table RLS with permission checks
drop policy if exists staff_view_orders on public.orders;
create policy staff_view_orders on public.orders
  for select using (public.has_permission('orders.view'));

drop policy if exists staff_manage_orders on public.orders;
create policy staff_manage_orders on public.orders
  for update using (public.has_permission('orders.manage'));

drop policy if exists staff_view_workers on public.workers;
create policy staff_view_workers on public.workers
  for select using (public.has_permission('workers.view'));

drop policy if exists staff_manage_workers on public.workers;
create policy staff_manage_workers on public.workers
  for update using (public.has_permission('workers.manage') or public.has_permission('workers.review'));

drop policy if exists staff_view_payouts on public.payouts;
create policy staff_view_payouts on public.payouts
  for select using (public.has_permission('payouts.view'));

drop policy if exists staff_manage_payouts on public.payouts;
create policy staff_manage_payouts on public.payouts
  for update using (public.has_permission('payouts.manage'));
