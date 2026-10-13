-- ==========================================================
-- BUILDMATE MITRA & DISPATCH EXTENSIONS (A6, B9, B11.6, B25)
-- ==========================================================

-- 1. Create Job Offers Table (B9 & B25)
create table if not exists public.job_offers (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  worker_id uuid not null references public.workers(id) on delete cascade,
  attempt_no int default 1,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined', 'expired', 'cancelled')),
  offered_at timestamptz default now(),
  expires_at timestamptz,
  responded_at timestamptz,
  decline_reason text,
  created_at timestamptz default now(),
  unique (order_id, worker_id)
);

create unique index if not exists idx_job_offers_pending_unique 
  on public.job_offers (order_id) where status = 'pending';
create index if not exists idx_job_offers_worker_status 
  on public.job_offers (worker_id, status);
create index if not exists idx_job_offers_order_status 
  on public.job_offers (order_id, status);

-- 2. Create App Settings Table (B9 & B25)
create table if not exists public.app_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz default now()
);

insert into public.app_settings (key, value)
values
  ('offer_timeout_seconds', '900'),
  ('dispatch_max_attempts', '5'),
  ('auto_complete_minutes', '1440')
on conflict (key) do nothing;

-- 3. Enhance Orders Table for Dispatch (B9 & B25)
do $$
begin
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'orders' and column_name = 'preferred_worker_id') then
    alter table public.orders add column preferred_worker_id uuid references public.workers(id) on delete set null;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'orders' and column_name = 'allow_reassign') then
    alter table public.orders add column allow_reassign boolean not null default true;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'orders' and column_name = 'dispatch_status') then
    alter table public.orders add column dispatch_status text not null default 'idle'
      check (dispatch_status in ('idle', 'searching', 'assigned', 'exhausted'));
  end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'orders' and column_name = 'dispatch_attempts') then
    alter table public.orders add column dispatch_attempts int not null default 0;
  end if;
end $$;

-- 4. Enhance Workers Table for Dispatch & Review (B9)
do $$
begin
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'workers' and column_name = 'last_offered_at') then
    alter table public.workers add column last_offered_at timestamptz;
  end if;
end $$;

-- 5. Helper RPC to claim worker role for Google OAuth (B11.6)
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

-- 6. Enable RLS on job_offers & app_settings
alter table public.job_offers enable row level security;
alter table public.app_settings enable row level security;

-- Policies for job_offers
create policy admin_all_job_offers on public.job_offers
  for all using (public.my_role() = 'admin' or public.my_role() = 'staff');

create policy worker_select_job_offers on public.job_offers
  for select using (worker_id = public.my_worker_id());

create policy worker_update_job_offers on public.job_offers
  for update using (worker_id = public.my_worker_id());

-- Policies for workers
create policy worker_manage_own_profile on public.workers
  for all using (user_id = auth.uid());

-- Policies for worker to view assigned orders
create policy worker_select_assigned_orders on public.orders
  for select using (
    worker_id = public.my_worker_id() or
    id in (select order_id from public.job_offers where worker_id = public.my_worker_id() and status = 'pending')
  );

-- Policies for worker payouts
create policy worker_select_own_payouts on public.payouts
  for select using (worker_id = public.my_worker_id());

-- Policies for app_settings
create policy authenticated_select_app_settings on public.app_settings
  for select using (auth.role() = 'authenticated');
create policy admin_manage_app_settings on public.app_settings
  for all using (public.my_role() = 'admin');
