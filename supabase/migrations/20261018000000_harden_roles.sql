-- 20261018000000_harden_roles.sql
-- Tujuan: role/status hanya bisa diubah oleh service role (server) atau admin.
-- ROLLBACK (jalankan manual jika perlu):
--   drop trigger if exists trg_protect_profile_privileged on public.profiles;
--   drop function if exists public.protect_profile_privileged();
--   drop trigger if exists trg_protect_worker_privileged on public.workers;
--   drop function if exists public.protect_worker_privileged();
--   (handle_new_user versi lama ada di 20261013000000_staff_and_permissions.sql)

-- 1. Trigger signup: hanya 'worker' atau 'customer'. Staf dibuat oleh server saat undangan.
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

-- 2. Lindungi kolom sensitif profiles. SECURITY INVOKER (default) supaya current_user = role pemanggil.
create or replace function public.protect_profile_privileged()
returns trigger language plpgsql set search_path = public as $$
begin
  if current_user in ('service_role', 'postgres', 'supabase_admin') then
    return new;
  end if;
  if public.my_role() = 'admin' then
    return new;
  end if;
  if new.role is distinct from old.role
     or new.staff_role_id is distinct from old.staff_role_id
     or new.staff_status is distinct from old.staff_status then
    raise exception 'Tidak diizinkan mengubah role, staff_role_id, atau staff_status' using errcode = '42501';
  end if;
  return new;
end; $$;

drop trigger if exists trg_protect_profile_privileged on public.profiles;
create trigger trg_protect_profile_privileged
  before update on public.profiles
  for each row execute function public.protect_profile_privileged();

-- 3. Lindungi kolom persetujuan mitra.
create or replace function public.protect_worker_privileged()
returns trigger language plpgsql set search_path = public as $$
begin
  if current_user in ('service_role', 'postgres', 'supabase_admin') then
    return new;
  end if;
  if public.my_role() = 'admin' then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.application_status := 'draft';
    new.is_verified := false;
    new.reviewed_by := null;
    new.reviewed_at := null;
    new.rejection_reason := null;
    return new;
  end if;
  if new.application_status is distinct from old.application_status
     or new.is_verified is distinct from old.is_verified
     or new.is_active is distinct from old.is_active
     or new.reviewed_by is distinct from old.reviewed_by
     or new.reviewed_at is distinct from old.reviewed_at
     or new.rejection_reason is distinct from old.rejection_reason then
    raise exception 'Tidak diizinkan mengubah status persetujuan mitra' using errcode = '42501';
  end if;
  return new;
end; $$;

drop trigger if exists trg_protect_worker_privileged on public.workers;
create trigger trg_protect_worker_privileged
  before insert or update on public.workers
  for each row execute function public.protect_worker_privileged();

-- 4. Default status mitra baru = draft (baris lama TIDAK diubah).
alter table public.workers alter column application_status set default 'draft';
