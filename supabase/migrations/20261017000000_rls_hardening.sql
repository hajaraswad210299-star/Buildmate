-- RLS hardening & missing self-access policies (SPEC B13, B25.6, B5)
-- Safe to run more than once.

-- 1. Profiles: users read/update their own row, but can never change their own role (B2)
drop policy if exists user_read_own_profile on public.profiles;
create policy user_read_own_profile on public.profiles
  for select using (id = auth.uid());

drop policy if exists user_update_own_profile on public.profiles;
create policy user_update_own_profile on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

create or replace function public.guard_profile_privileged_columns()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  jwt_role text := nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role';
begin
  -- Direct DB sessions (SQL editor, migrations, scripts) have no JWT; the service role
  -- (server-side admin client) and admins may change these columns too
  if jwt_role is null or jwt_role = 'service_role' or public.my_role() = 'admin' then
    return new;
  end if;
  if new.role is distinct from old.role
     or new.staff_role_id is distinct from old.staff_role_id
     or new.staff_status is distinct from old.staff_status then
    raise exception 'privileged_profile_columns_are_read_only';
  end if;
  return new;
end; $$;

drop trigger if exists guard_profile_privileged_columns on public.profiles;
create trigger guard_profile_privileged_columns
before update on public.profiles
for each row execute function public.guard_profile_privileged_columns();

-- 2. Customers read their own orders and related rows (C07/C08, realtime)
drop policy if exists customer_select_own_orders on public.orders;
create policy customer_select_own_orders on public.orders
  for select using (customer_id = auth.uid());

drop policy if exists customer_select_own_order_photos on public.order_photos;
create policy customer_select_own_order_photos on public.order_photos
  for select using (order_id in (select id from public.orders where customer_id = auth.uid()));

drop policy if exists customer_select_own_order_events on public.order_events;
create policy customer_select_own_order_events on public.order_events
  for select using (order_id in (select id from public.orders where customer_id = auth.uid()));

drop policy if exists customer_select_own_complaints on public.complaints;
create policy customer_select_own_complaints on public.complaints
  for select using (order_id in (select id from public.orders where customer_id = auth.uid()));

drop policy if exists user_select_own_subscription on public.subscriptions;
create policy user_select_own_subscription on public.subscriptions
  for select using (user_id = auth.uid());

-- 3. Worker packages are part of the public catalog (C04)
drop policy if exists public_read_worker_packages on public.worker_packages;
create policy public_read_worker_packages on public.worker_packages
  for select using (true);

-- 4. Workers: read-only on their own row; every write goes through the server (B13)
drop policy if exists worker_manage_own_profile on public.workers;
drop policy if exists worker_select_own_profile on public.workers;
create policy worker_select_own_profile on public.workers
  for select using (user_id = auth.uid());

-- 5. Offers can only be answered through the server, and pending offers
--    must not expose the full order row before acceptance (B25.6)
drop policy if exists worker_update_job_offers on public.job_offers;

drop policy if exists worker_select_assigned_orders on public.orders;
create policy worker_select_assigned_orders on public.orders
  for select using (worker_id = public.my_worker_id());

-- 6. Auto-complete (B25.4) records completed_by = 'system'
alter table public.orders drop constraint if exists orders_completed_by_check;
alter table public.orders add constraint orders_completed_by_check
  check (completed_by in ('customer', 'admin', 'system'));
