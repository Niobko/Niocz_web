-- NioCZ: odpovědi administrátora na hlášení chyb.
-- Spusťte celý soubor v Supabase SQL Editoru před nasazením HTML/CSS.
-- Vyžaduje existující SUPABASE-GAME-STATUS-ADMIN.sql a jeho admin účet.
-- Skript lze spustit opakovaně; nemění reporty, jejich ID ani statusy.
begin;

alter table public.bug_reports
  add column if not exists admin_reply text,
  add column if not exists admin_reply_updated_at timestamptz,
  add column if not exists admin_reply_seen_at timestamptz;

alter table public.bug_reports enable row level security;

-- Zachovat existující SELECT/INSERT/status policies. Odpověď se čte spolu
-- s reportem. Trigger níže chrání nové sloupce i před širší starší policy.
create or replace function public.guard_bug_report_reply()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  reply_changed boolean;
  seen_changed boolean := false;
begin
  if tg_op = 'INSERT' then
    reply_changed := new.admin_reply is not null
      or new.admin_reply_updated_at is not null
      or new.admin_reply_seen_at is not null;
  else
    reply_changed := new.admin_reply is distinct from old.admin_reply
      or new.admin_reply_updated_at is distinct from old.admin_reply_updated_at;
    seen_changed := new.admin_reply_seen_at is distinct from old.admin_reply_seen_at;
  end if;

  if reply_changed then
    if auth.uid() is null or not public.is_game_status_admin() then
      raise exception 'Only an administrator can change a reply.' using errcode = '42501';
    end if;

    new.admin_reply := nullif(btrim(new.admin_reply), '');
    if char_length(new.admin_reply) > 5000 then
      raise exception 'Reply exceeds 5000 characters.' using errcode = '22001';
    end if;
    new.admin_reply_updated_at := case when new.admin_reply is null then null else now() end;
    new.admin_reply_seen_at := null;
    return new;
  end if;

  if seen_changed and (
    auth.uid() is null
    or new.user_id is distinct from auth.uid()
    or new.admin_reply is null
  ) then
    raise exception 'Only the report owner can mark its reply as read.' using errcode = '42501';
  end if;

  return new;
end;
$function$;

revoke all on function public.guard_bug_report_reply() from public, anon, authenticated;
drop trigger if exists guard_bug_report_reply_trigger on public.bug_reports;
create trigger guard_bug_report_reply_trigger
before insert or update on public.bug_reports
for each row execute function public.guard_bug_report_reply();

drop policy if exists "Admins can update bug report replies" on public.bug_reports;
create policy "Admins can update bug report replies"
on public.bug_reports for update to authenticated
using ((select public.is_game_status_admin()))
with check ((select public.is_game_status_admin()));

grant update (admin_reply, admin_reply_updated_at) on public.bug_reports to authenticated;

-- Vrátí pouze nejnovější nepřečtenou odpověď přihlášeného uživatele.
create or replace function public.get_unread_bug_report_reply()
returns table (report_id uuid)
language sql
stable
security invoker
set search_path = ''
as $function$
  select report.id
  from public.bug_reports as report
  where report.user_id = auth.uid()
    and report.admin_reply is not null
    and report.admin_reply_seen_at is null
  order by report.admin_reply_updated_at desc nulls last, report.created_at desc
  limit 1;
$function$;

revoke all on function public.get_unread_bug_report_reply() from public, anon, authenticated;
grant execute on function public.get_unread_bug_report_reply() to authenticated;

-- Uživatel nemá přímé UPDATE oprávnění. Tato úzce omezená funkce může
-- označit jako přečtenou jen odpověď na report patřící volajícímu účtu.
create or replace function public.mark_bug_report_reply_read(requested_report_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $function$
declare
  caller_id uuid := auth.uid();
  updated_id uuid;
begin
  if caller_id is null or requested_report_id is null then
    return false;
  end if;

  update public.bug_reports as report
  set admin_reply_seen_at = now()
  where report.id = requested_report_id
    and report.user_id = caller_id
    and report.admin_reply is not null
  returning report.id into updated_id;

  return updated_id is not null;
end;
$function$;

revoke all on function public.mark_bug_report_reply_read(uuid) from public, anon, authenticated;
grant execute on function public.mark_bug_report_reply_read(uuid) to authenticated;

commit;
