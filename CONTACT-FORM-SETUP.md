# Nastavení kontaktního formuláře na Netlify

Kontaktní formulář odesílá e-maily pouze přes Netlify Function a službu Resend. API klíč se nikdy neposílá do prohlížeče.

## Povinné environment variables

V Netlify otevřete **Site configuration → Environment variables** a přidejte:

- `RESEND_API_KEY` – API klíč vytvořený v Resend.
- `CONTACT_FROM_EMAIL` – ověřený odesílatel v Resend, například `NioCZ web <kontakt@nioczloc.com>`. Doména uvedená v této hodnotě musí být v Resend ověřená.

Po přidání nebo změně proměnných spusťte nový deploy webu.

## Volitelné environment variables

- `CONTACT_TO_EMAIL` – cílová adresa. Když není nastavená, použije se `nioczpreklady@gmail.com`.
- `SUPABASE_URL` – URL existujícího Supabase projektu.
- `SUPABASE_ANON_KEY` – veřejný anon klíč existujícího Supabase projektu.

Poslední dvě proměnné umožní funkci bezpečně ověřit přihlášeného uživatele a přidat jeho jméno a e-mail do zprávy. Formulář bez nich funguje anonymně.

## Resend

1. V Resend přidejte a ověřte odesílací doménu, ideálně `nioczloc.com`.
2. Vytvořte API klíč s oprávněním pro odesílání e-mailů.
3. Klíč uložte pouze do `RESEND_API_KEY` na Netlify, nikdy do `config.js` ani jiného souboru v repozitáři.
4. Nastavte `CONTACT_FROM_EMAIL` na adresu z ověřené domény.

Endpoint formuláře je `/api/contact-message` a Netlify ho směruje na `/.netlify/functions/contact-message`.
