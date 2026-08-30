# Stav kompatibility překladů

Web používá `data/game-status.json` jako konfiguraci a bezpečný statický fallback. Netlify funkce `/api/game-status` k němu připojí živý snapshot veřejných Steam větví uložený v Netlify Blobs. Na čistě statickém hostingu frontend bezpečně přejde přímo na JSON. Ve frontendu není žádný tajný klíč.

## Automatická hodinová kontrola

Funkce `steam-build-check` se spouští přes Netlify každou hodinu (`@hourly`). Přihlásí se anonymně přímo ke Steam PICS backendu a jedním požadavkem načte app-info pro každý `appId` v konfiguraci. Z veřejné větve čte `buildid` a `timeupdated`; nepoužívá SteamDB scraping ani cacheovaný proxy endpoint.

Výsledek je trvale uložený v Netlify Blobs a přežije další deploy. Když jedna hra dočasně nevrátí metadata, předchozí známá hodnota se zachová jen pro ni a ostatní hry se normálně aktualizují. Pokud snapshot chybí nebo je starší než 75 minut, `/api/game-status` se ho pokusí obnovit i při požadavku návštěvníka. Odpověď API i frontendový fetch mají vypnutou HTTP cache.

## Ruční okamžitá kontrola

Tlačítko v panelu „Stav verze“ posílá na `/api/game-status` JSON `POST` s bezpečně ověřeným slugem právě otevřené hry. Funkce přes HTTPS načte aktuální veřejný build pouze této hry, používá `no-store`, cache-busting parametr a osmivteřinový timeout. Úspěšná odpověď obsahuje `refresh.fresh: true`; frontend bez tohoto potvrzení data nepřijme jako výsledek ruční kontroly.

Uložení čerstvého buildu do Netlify Blobs je pouze doplňkové. Výpadek Blob úložiště proto už nezmění úspěšnou Steam kontrolu na chybu 500. Ruční kontrola zároveň neposouvá čas celého hodinového snapshotu, takže nemůže zabránit běžné automatické kontrole ostatních her. Neplatná hra, timeout a nedostupné Steam app-info vracejí samostatné chybové kódy a konkrétní české hlášky.

## Ověření překladu přímo na webu

Soubor `SUPABASE-GAME-STATUS-ADMIN.sql` přidává centrální tabulku `game_status_overrides`, samostatnou roli `profiles.is_admin`, RLS a dvě zabezpečené RPC funkce. Po spuštění migrace a jednorázovém označení účtu správce se přihlášenému správci vedle stavu zobrazí malá šipka. Běžní návštěvníci žádné ovládání neuvidí.

Pro nové hry Hearth and Hamlet a Kynseed spusťte také `SUPABASE-HEARTH-AND-KYNSEED.sql`. Pro PowerWash Simulator 2 spusťte `SUPABASE-POWERWASH-SIMULATOR-2.sql` a pro The Spell Brigade soubor `SUPABASE-THE-SPELL-BRIGADE.sql`. Migrace rozšíří povolené slugy komentářů, hlášení chyb, hodnocení a počítadla stažení a založí příslušné řádky počítadel. Tabulka `game_status_overrides` používá obecnou validaci bezpečného slugu, takže pro nové hry nepotřebuje další whitelist.

Správce může vybrat:

- `Funkční` — uloží se aktuální `currentBuildId` jako ověřený build. Pokud provider později vrátí jiný build, web znovu automaticky zobrazí „Čeká na ověření“.
- `Čeká na ověření` — stav zůstane oranžový do dalšího rozhodnutí správce.
- `Nefunkční / vyžaduje update` — stav bude červený.

Zápis nejde provést přímým požadavkem z konzole: klient má k tabulce pouze právo čtení a změnu provádí `set_game_status_override` až po serverové kontrole `profiles.is_admin`. Frontendový skrytý dropdown je jen uživatelské rozhraní, nikoli bezpečnostní ochrana.

Pokud není build pro některou hru dostupný, použije se dosavadní bezpečný manuální stav. `verified_version` se při označení funkčního překladu ukládá jako doplňující údaj.

## Záložní ruční aktualizace v repozitáři

Každá hra má `appId`, `verifiedBuildId`, `currentBuildId`, `lastSteamUpdate`, `manualStatus`, `override` a `displayStatus`.

- `manualStatus: "functional"` — překlad je ručně označen jako funkční.
- `manualStatus: "broken"` — zobrazí červený stav „Nefunkční / vyžaduje update“.
- neprázdné `currentBuildId` bez stejného `verifiedBuildId` — server zobrazí oranžové „Čeká na ověření“; platí to i pro první zjištěný build bez ověřené výchozí hodnoty.
- `lastSteamUpdate` — datum a čas posledního nasazení veřejného Steam buildu v ISO 8601, například `2026-08-19T08:22:53Z`.
- `override` může být `functional`, `pending`, `broken` nebo `null`; neprázdná hodnota má nejvyšší prioritu.

Tento postup je potřeba pouze před aktivací Supabase migrace nebo při výpadku databáze. Po ověření kompatibility nastavte `verifiedBuildId` na hodnotu `currentBuildId`, ponechte `manualStatus` jako `functional`, nastavte `override` na `null` a upravte `displayStatus` na zelený funkční stav. Potom commitněte změnu do nasazované větve.

Automatická kontrola mění pouze živé `currentBuildId`, `lastSteamUpdate` a čas kontroly. `verifiedBuildId` v fallbacku ani `verified_build` v Supabase nemění. Pokud se veřejný build změnil, web proto automaticky ukáže oranžové „Čeká na ověření“, dokud správce nepotvrdí nový build jako funkční.

## Nasazení

Netlify načte `netlify.toml` automaticky, nainstaluje závislosti z `package.json` a naplánuje `steam-build-check` na začátek každé hodiny. Není potřeba nastavit žádnou proměnnou prostředí ani tajný klíč. Na GitHub Pages funguje statický fallback z `data/game-status.json`; automatická kontrola je dostupná pouze na Netlify.

