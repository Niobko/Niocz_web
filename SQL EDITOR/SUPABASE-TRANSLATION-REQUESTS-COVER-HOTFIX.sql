-- Spusťte pouze tehdy, pokud už hlavní migrace proběhla a formulář hlásí
-- translation_requests_cover_url_check nebo translation_requests_description_check.
-- Oba CHECKy patří ke starému hlasování. Nový formulář cover nepoužívá a poznámka
-- je záměrně volitelná, její délku chrání translation_requests_note_length_check.

alter table public.translation_requests
  drop constraint if exists translation_requests_cover_url_check,
  drop constraint if exists translation_requests_description_check;
