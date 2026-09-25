-- NioCZ LOC: oprava oprávnění triggeru při administrátorské úpravě žádosti
-- Spusťte celý soubor jednou v Supabase SQL Editoru.

begin;

-- Funkce pouze normalizuje předaný text. Nečte tabulky a neběží jako vlastník.
-- Trigger private.prepare_translation_request() je SECURITY INVOKER, proto musí mít
-- přihlášená role právo spustit tuto vnořenou pomocnou funkci.
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

revoke all on function private.normalize_translation_request_name(text)
  from public, anon, authenticated;
grant execute on function private.normalize_translation_request_name(text)
  to authenticated;

commit;
