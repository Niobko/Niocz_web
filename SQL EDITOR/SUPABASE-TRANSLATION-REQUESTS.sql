-- NioCZ LOC: komunitní žádosti o překlad
-- Spusťte celý soubor jednou v Supabase SQL Editoru až po SUPABASE-USER-SYSTEM.sql.
-- Migrace rozšiřuje existující translation_requests / translation_votes a nemaže staré hlasy.

begin;

create schema if not exists private;

create table if not exists public.translation_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  game_name text not null,
  game_url text not null,
  note text,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  normalized_game_name text not null default '',
  slug text,
  title text,
  cover_url text,
  description text,
  vote_count integer not null default 0
);

alter table public.translation_requests
  add column if not exists user_id uuid references auth.users(id) on delete set null,
  add column if not exists game_name text,
  add column if not exists game_url text,
  add column if not exists note text,
  add column if not exists status text default 'pending',
  add column if not exists created_at timestamptz default now(),
  add column if not exists normalized_game_name text default '',
  add column if not exists slug text,
  add column if not exists title text,
  add column if not exists cover_url text,
  add column if not exists description text,
  add column if not exists vote_count integer default 0;

create table if not exists public.translation_votes (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.translation_requests(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint translation_votes_request_user_key unique (request_id, user_id)
);

create or replace function private.normalize_translation_request_name(input_name text)
returns text
language sql
immutable
strict
security invoker
set search_path = ''
as $function$
  select regexp_replace(
    translate(
      lower(trim(input_name)),
      'áäčďéěíĺľňóôöŕřšťúůüýž',
      'aacdeeillnooorrstuuuyz'
    ),
    '[^a-z0-9]+',
    '',
    'g'
  );
$function$;

-- Původní hlasování vyžadovalo cover a neprázdný popis. Nové žádosti mají místo
-- popisu volitelnou note a cover nepoužívají, proto staré CHECKy nesmí blokovat zápis.
alter table public.translation_requests
  drop constraint if exists translation_requests_cover_url_check,
  drop constraint if exists translation_requests_description_check;

-- Starší verze hlasování používala české hodnoty a vlastní CHECK constraint.
-- Odstraníme pouze CHECK, který kontroluje sloupec status, ještě před převodem dat.
do $block$
declare
  item record;
begin
  for item in
    select conname
    from pg_constraint
    where conrelid = 'public.translation_requests'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%status%'
  loop
    execute format('alter table public.translation_requests drop constraint %I', item.conname);
  end loop;
end;
$block$;

update public.translation_requests
set game_name = coalesce(nullif(trim(game_name), ''), nullif(trim(title), ''), 'Neznámá hra'),
    game_url = coalesce(nullif(trim(game_url), ''), 'https://store.steampowered.com/'),
    note = coalesce(note, nullif(description, '')),
    status = case status
      when 'Navrženo' then 'pending'
      when 'Zvažujeme' then 'considering'
      when 'Překládá se' then 'translating'
      when 'Hotovo' then 'completed'
      when 'Nový návrh' then 'pending'
      when 'Zvažuje se' then 'considering'
      when 'Plánovaný překlad' then 'planned'
      when 'Zamítnuto' then 'rejected'
      else coalesce(status, 'pending')
    end,
    created_at = coalesce(created_at, now());

update public.translation_requests
set status = 'pending'
where status not in ('pending', 'considering', 'planned', 'translating', 'completed', 'rejected');

update public.translation_requests
set normalized_game_name = private.normalize_translation_request_name(game_name),
    title = coalesce(nullif(title, ''), game_name),
    description = coalesce(description, note, ''),
    cover_url = coalesce(cover_url, ''),
    slug = coalesce(nullif(slug, ''), private.normalize_translation_request_name(game_name) || '-' || substr(md5(id::text), 1, 8)),
    vote_count = coalesce(vote_count, 0);

alter table public.translation_requests
  alter column game_name set not null,
  alter column game_url set not null,
  alter column status set default 'pending',
  alter column status set not null,
  alter column created_at set default now(),
  alter column created_at set not null,
  alter column normalized_game_name set default '',
  alter column normalized_game_name set not null,
  alter column vote_count set default 0,
  alter column vote_count set not null;

alter table public.translation_requests drop constraint if exists translation_requests_status_check;
alter table public.translation_requests
  add constraint translation_requests_status_check
  check (status in ('pending', 'considering', 'planned', 'translating', 'completed', 'rejected'));
alter table public.translation_requests drop constraint if exists translation_requests_game_name_length_check;
alter table public.translation_requests
  add constraint translation_requests_game_name_length_check check (char_length(trim(game_name)) between 2 and 120);
alter table public.translation_requests drop constraint if exists translation_requests_game_url_length_check;
alter table public.translation_requests
  add constraint translation_requests_game_url_length_check check (char_length(game_url) between 8 and 500);
alter table public.translation_requests drop constraint if exists translation_requests_note_length_check;
alter table public.translation_requests
  add constraint translation_requests_note_length_check check (note is null or char_length(note) <= 1000);

do $block$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.translation_votes'::regclass
      and contype = 'u'
      and pg_get_constraintdef(oid) ilike '%(request_id, user_id)%'
  ) then
    alter table public.translation_votes
      add constraint translation_votes_request_user_key unique (request_id, user_id);
  end if;
end;
$block$;

-- Smazání nevhodné žádosti administrátorem musí bezpečně odstranit i její hlasy.
do $block$
declare
  item record;
begin
  for item in
    select conname
    from pg_constraint
    where conrelid = 'public.translation_votes'::regclass
      and contype = 'f'
      and confrelid = 'public.translation_requests'::regclass
  loop
    execute format('alter table public.translation_votes drop constraint %I', item.conname);
  end loop;
  alter table public.translation_votes
    add constraint translation_votes_request_id_fkey
    foreign key (request_id) references public.translation_requests(id) on delete cascade;
end;
$block$;

create index if not exists translation_requests_status_created_idx
  on public.translation_requests (status, created_at desc);
create index if not exists translation_requests_normalized_name_idx
  on public.translation_requests (normalized_game_name);
create index if not exists translation_votes_request_idx
  on public.translation_votes (request_id);
create index if not exists translation_votes_user_created_idx
  on public.translation_votes (user_id, created_at desc);

create or replace function private.prepare_translation_request()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $function$
begin
  new.game_name := trim(new.game_name);
  new.game_url := trim(new.game_url);
  new.note := nullif(trim(new.note), '');
  new.normalized_game_name := private.normalize_translation_request_name(new.game_name);
  new.title := new.game_name;
  new.description := coalesce(new.note, '');
  new.cover_url := coalesce(new.cover_url, '');
  if new.slug is null or trim(new.slug) = '' then
    new.slug := new.normalized_game_name || '-' || substr(md5(random()::text || clock_timestamp()::text), 1, 8);
  end if;
  return new;
end;
$function$;

drop trigger if exists prepare_translation_request on public.translation_requests;
create trigger prepare_translation_request
before insert or update of game_name, game_url, note
on public.translation_requests
for each row execute function private.prepare_translation_request();

alter table public.translation_requests enable row level security;
alter table public.translation_votes enable row level security;

-- Nahrazuje původní hlasovací policies kompletní sadou níže, aby žádná stará
-- author policy nemohla obejít nové pravidlo profiles.is_admin.
do $block$
declare
  item record;
begin
  for item in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('translation_requests', 'translation_votes')
  loop
    execute format('drop policy %I on %I.%I', item.policyname, item.schemaname, item.tablename);
  end loop;
end;
$block$;

drop policy if exists "Translation requests are public" on public.translation_requests;
create policy "Translation requests are public"
on public.translation_requests for select to anon, authenticated using (true);

drop policy if exists "Admins update translation requests" on public.translation_requests;
create policy "Admins update translation requests"
on public.translation_requests for update to authenticated
using (private.is_admin()) with check (private.is_admin());

drop policy if exists "Admins delete translation requests" on public.translation_requests;
create policy "Admins delete translation requests"
on public.translation_requests for delete to authenticated
using (private.is_admin());

drop policy if exists "Users read own translation votes" on public.translation_votes;
create policy "Users read own translation votes"
on public.translation_votes for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users create own translation votes" on public.translation_votes;
create policy "Users create own translation votes"
on public.translation_votes for insert to authenticated
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "Users delete own translation votes" on public.translation_votes;
create policy "Users delete own translation votes"
on public.translation_votes for delete to authenticated
using ((select auth.uid()) = user_id);

revoke all on table public.translation_requests from public, anon, authenticated;
grant select (id, game_name, game_url, note, status, created_at)
  on table public.translation_requests to anon, authenticated;
grant update (game_name, game_url, note, status) on table public.translation_requests to authenticated;
grant delete on table public.translation_requests to authenticated;

revoke all on table public.translation_votes from public, anon, authenticated;
grant select, delete on table public.translation_votes to authenticated;
grant insert (request_id, user_id) on table public.translation_votes to authenticated;

revoke all on function private.normalize_translation_request_name(text) from public, anon, authenticated;
revoke all on function private.prepare_translation_request() from public, anon, authenticated;

create or replace function public.is_translation_request_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select coalesce(private.is_admin(), false);
$function$;

create or replace function public.get_translation_requests()
returns table (
  id text,
  game_name text,
  game_url text,
  note text,
  status text,
  created_at timestamptz,
  proposer_name text,
  vote_count bigint,
  user_has_voted boolean
)
language sql
stable
security definer
set search_path = ''
as $function$
  select
    request.id::text,
    request.game_name,
    request.game_url,
    request.note,
    request.status,
    request.created_at,
    coalesce(nullif(profile.display_name, ''), 'Člen komunity') as proposer_name,
    count(vote.request_id)::bigint as vote_count,
    coalesce(bool_or(vote.user_id = auth.uid()), false) as user_has_voted
  from public.translation_requests as request
  left join public.profiles as profile on profile.id = request.user_id
  left join public.translation_votes as vote on vote.request_id = request.id
  group by request.id, request.game_name, request.game_url, request.note,
           request.status, request.created_at, profile.display_name
  order by count(vote.request_id) desc, request.created_at desc;
$function$;

create or replace function public.create_translation_request(
  requested_game_name text,
  requested_game_url text,
  requested_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  caller_id uuid := auth.uid();
  clean_name text := trim(requested_game_name);
  clean_url text := trim(requested_game_url);
  normalized_name text;
  existing_request record;
  new_request_id text;
begin
  if caller_id is null then
    raise exception 'Pro vytvoření návrhu se musíte přihlásit.' using errcode = '42501';
  end if;
  if char_length(clean_name) < 2 or char_length(clean_name) > 120 then
    raise exception 'Název hry musí mít 2 až 120 znaků.' using errcode = '22023';
  end if;
  if clean_url !~* '^https?://[^[:space:]]+$' or char_length(clean_url) > 500 then
    raise exception 'Zadejte platnou adresu obchodu začínající http:// nebo https://.' using errcode = '22023';
  end if;
  if requested_note is not null and char_length(trim(requested_note)) > 1000 then
    raise exception 'Poznámka může mít nejvýše 1000 znaků.' using errcode = '22023';
  end if;

  normalized_name := private.normalize_translation_request_name(clean_name);
  if char_length(normalized_name) < 2 then
    raise exception 'Název hry neobsahuje dostatek platných znaků.' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtext(normalized_name));
  select request.id, request.game_name
  into existing_request
  from public.translation_requests as request
  where lower(trim(request.game_url)) = lower(clean_url)
     or request.normalized_game_name = normalized_name
     or (
       least(char_length(request.normalized_game_name), char_length(normalized_name)) >= 5
       and abs(char_length(request.normalized_game_name) - char_length(normalized_name)) <= 8
       and (
         request.normalized_game_name like '%' || normalized_name || '%'
         or normalized_name like '%' || request.normalized_game_name || '%'
       )
     )
  order by request.created_at
  limit 1;

  if existing_request.id is not null then
    return jsonb_build_object(
      'created', false,
      'request_id', existing_request.id::text,
      'game_name', existing_request.game_name
    );
  end if;

  insert into public.translation_requests (
    user_id, game_name, game_url, note, status,
    title, description, cover_url, slug, vote_count
  ) values (
    caller_id, clean_name, clean_url, nullif(trim(requested_note), ''), 'pending',
    clean_name, coalesce(nullif(trim(requested_note), ''), ''), '',
    normalized_name || '-' || substr(md5(random()::text || clock_timestamp()::text), 1, 8), 0
  ) returning id::text into new_request_id;

  return jsonb_build_object('created', true, 'request_id', new_request_id, 'game_name', clean_name);
end;
$function$;

revoke all on function public.is_translation_request_admin() from public, anon, authenticated;
grant execute on function public.is_translation_request_admin() to authenticated;
revoke all on function public.get_translation_requests() from public, anon, authenticated;
grant execute on function public.get_translation_requests() to anon, authenticated;
revoke all on function public.create_translation_request(text, text, text) from public, anon, authenticated;
grant execute on function public.create_translation_request(text, text, text) to authenticated;

commit;
