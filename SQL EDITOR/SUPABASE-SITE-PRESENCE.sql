-- NioCZ LOC: bezpečný online/offline stav autora přes Realtime Presence.
-- Spusťte celý soubor jednou v Supabase SQL Editoru. Je idempotentní.

begin;

-- Soukromý channel mohou všichni návštěvníci pouze číst. Zapisovat Presence
-- smí jen přihlášený účet ověřený stejnou is_admin logikou jako správa webu.
drop policy if exists "Site Presence is publicly readable" on realtime.messages;
create policy "Site Presence is publicly readable"
on realtime.messages
for select
to anon, authenticated
using (
  (select realtime.topic()) = 'site-presence'
  and realtime.messages.extension = 'presence'
);

drop policy if exists "Only the site admin can track Site Presence" on realtime.messages;
create policy "Only the site admin can track Site Presence"
on realtime.messages
for insert
to authenticated
with check (
  (select realtime.topic()) = 'site-presence'
  and realtime.messages.extension = 'presence'
  and public.is_game_status_admin()
);

commit;

-- Kontrola po spuštění: právě jeden účet Nio musí mít na stejném řádku
-- is_author = true i is_admin = true. Jeho UUID načte klient z chráněného
-- příznaku is_author; display_name se k identifikaci Presence nepoužívá.
-- select id, display_name, is_author, is_admin
-- from public.profiles
-- where is_author = true or is_admin = true;
