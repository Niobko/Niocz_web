-- NioCZ LOC: bezpečná správa stavů překladů z webu
-- Spusťte celý soubor v Supabase SQL Editoru. Skript je navržen tak,
-- aby jej bylo možné spustit opakovaně.

begin;

-- Samostatná administrátorská role. Nepřebírá se automaticky z is_author,
-- protože bez auditu existujících policies nelze bezpečně předpokládat,
-- že si is_author nemůže běžný uživatel změnit sám.
alter table public.profiles
  add column if not exists is_admin boolean;

update public.profiles
set is_admin = false
where is_admin is null;

alter table public.profiles
  alter column is_admin set default false,
  alter column is_admin set not null;

-- Druhá obranná vrstva: běžný JWT požadavek nesmí změnit is_admin ani tehdy,
-- pokud už v projektu existuje příliš široká UPDATE policy na profiles.
create or replace function public.guard_profile_admin_role()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  if coalesce(auth.role(), '') in ('anon', 'authenticated') then
    if tg_op = 'INSERT' and new.is_admin then
      raise exception 'The admin role can only be assigned from the Supabase SQL Editor.'
        using errcode = '42501';
    end if;

    if tg_op = 'UPDATE' and new.is_admin is distinct from old.is_admin then
      raise exception 'The admin role can only be changed from the Supabase SQL Editor.'
        using errcode = '42501';
    end if;
  end if;

  return new;
end;
$function$;

revoke all on function public.guard_profile_admin_role() from public, anon, authenticated;

drop trigger if exists guard_profile_admin_role_trigger on public.profiles;
create trigger guard_profile_admin_role_trigger
before insert or update of is_admin on public.profiles
for each row execute function public.guard_profile_admin_role();

create table if not exists public.game_status_overrides (
  game_slug text primary key,
  status text not null,
  verified_build text,
  verified_version text,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.game_status_overrides
  add column if not exists status text,
  add column if not exists verified_build text,
  add column if not exists verified_version text,
  add column if not exists updated_by uuid references auth.users(id) on delete set null,
  add column if not exists updated_at timestamptz;

update public.game_status_overrides
set status = 'pending'
where status is null or status not in ('functional', 'pending', 'broken');

update public.game_status_overrides
set verified_build = null
where verified_build is not null and verified_build !~ '^[0-9]+$';

update public.game_status_overrides
set verified_version = left(nullif(btrim(verified_version), ''), 100),
    updated_at = coalesce(updated_at, now());

alter table public.game_status_overrides
  alter column status set not null,
  alter column updated_at set default now(),
  alter column updated_at set not null;

alter table public.game_status_overrides
  drop constraint if exists game_status_overrides_game_slug_check,
  drop constraint if exists game_status_overrides_status_check,
  drop constraint if exists game_status_overrides_verified_build_check,
  drop constraint if exists game_status_overrides_verified_version_check;

alter table public.game_status_overrides
  add constraint game_status_overrides_game_slug_check
    check (game_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  add constraint game_status_overrides_status_check
    check (status in ('functional', 'pending', 'broken')),
  add constraint game_status_overrides_verified_build_check
    check (verified_build is null or verified_build ~ '^[0-9]+$'),
  add constraint game_status_overrides_verified_version_check
    check (verified_version is null or char_length(verified_version) between 1 and 100);

create index if not exists game_status_overrides_updated_at_idx
  on public.game_status_overrides (updated_at desc);

alter table public.game_status_overrides enable row level security;

drop policy if exists "Game status overrides are publicly readable" on public.game_status_overrides;
create policy "Game status overrides are publicly readable"
on public.game_status_overrides
for select
to anon, authenticated
using (true);

-- Klienti smějí tabulku pouze číst. INSERT/UPDATE/DELETE provádí výhradně
-- security-definer RPC níže po serverové kontrole profiles.is_admin.
revoke all on table public.game_status_overrides from public, anon, authenticated;
grant select on table public.game_status_overrides to anon, authenticated;

create or replace function public.is_game_status_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select exists (
    select 1
    from public.profiles as profile
    where profile.id = auth.uid()
      and profile.is_admin = true
  );
$function$;

revoke all on function public.is_game_status_admin() from public, anon, authenticated;
grant execute on function public.is_game_status_admin() to authenticated;

create or replace function public.set_game_status_override(
  requested_game_slug text,
  requested_status text,
  requested_current_build text default null,
  requested_current_version text default null
)
returns public.game_status_overrides
language plpgsql
security definer
set search_path = ''
as $function$
declare
  caller_id uuid := auth.uid();
  normalized_slug text := lower(btrim(requested_game_slug));
  normalized_status text := lower(btrim(requested_status));
  normalized_build text := nullif(btrim(requested_current_build), '');
  normalized_version text := nullif(btrim(requested_current_version), '');
  saved_override public.game_status_overrides%rowtype;
begin
  if caller_id is null then
    raise exception 'Authentication is required.' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.profiles as profile
    where profile.id = caller_id
      and profile.is_admin = true
  ) then
    raise exception 'Administrator permission is required.' using errcode = '42501';
  end if;

  if normalized_slug is null or normalized_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then
    raise exception 'Invalid game slug.' using errcode = '22023';
  end if;

  if normalized_status not in ('functional', 'pending', 'broken') then
    raise exception 'Invalid translation status.' using errcode = '22023';
  end if;

  if normalized_build is not null and normalized_build !~ '^[0-9]+$' then
    raise exception 'Invalid Steam build ID.' using errcode = '22023';
  end if;

  if normalized_version is not null and char_length(normalized_version) > 100 then
    raise exception 'The game version is too long.' using errcode = '22023';
  end if;

  insert into public.game_status_overrides as existing (
    game_slug,
    status,
    verified_build,
    verified_version,
    updated_by,
    updated_at
  ) values (
    normalized_slug,
    normalized_status,
    case when normalized_status = 'functional' then normalized_build else null end,
    case when normalized_status = 'functional' then normalized_version else null end,
    caller_id,
    now()
  )
  on conflict (game_slug) do update
  set status = excluded.status,
      verified_build = case
        when excluded.status = 'functional' then excluded.verified_build
        else existing.verified_build
      end,
      verified_version = case
        when excluded.status = 'functional' then excluded.verified_version
        else existing.verified_version
      end,
      updated_by = caller_id,
      updated_at = now()
  returning * into saved_override;

  return saved_override;
end;
$function$;

revoke all on function public.set_game_status_override(text, text, text, text) from public, anon, authenticated;
grant execute on function public.set_game_status_override(text, text, text, text) to authenticated;

commit;

-- JEDNORÁZOVÝ KROK PO MIGRACI
-- 1. UID svého účtu najdete v Supabase: Authentication -> Users.
-- 2. Nahraďte YOUR-AUTH-USER-UUID a spusťte následující příkaz samostatně.
--    Příkaz zároveň odebere roli případnému starému administrátorovi, takže
--    zůstane právě jeden účet s právem měnit stav.
--
-- update public.profiles
-- set is_admin = (id = 'YOUR-AUTH-USER-UUID'::uuid)
-- where is_admin = true or id = 'YOUR-AUTH-USER-UUID'::uuid;
