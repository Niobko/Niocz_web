# Stav kompatibility překladů

Web nyní používá jeden kontrolní soubor `data/game-status.json`. Netlify ho zpřístupní přes serverovou funkci `/api/game-status`; na čistě statickém hostingu frontend bezpečně přejde přímo na JSON. Ve frontendu není žádný tajný klíč.

## Proč zatím není zapnutá automatická kontrola

Oficiální Steamworks metoda [`ISteamApps/GetAppBuilds`](https://partner.steamgames.com/doc/webapi/ISteamApps#GetAppBuilds) vyžaduje publisher API klíč vlastníka dané hry. Takový klíč se pro cizí hry nedá bezpečně ani oprávněně použít.

Anonymní SteamCMD dokáže příkazem `app_info_print` načíst metadata veřejné větve, ale není to dokumentované stabilní API pro webovou automatizaci a existují hlášené výpadky vracení app info. Proto web nepoužívá neověřený proxy endpoint ani automatický SteamDB scraping. Aktuální hodnoty jsou ručně ověřený snímek veřejných Steam větví ze SteamDB k 25. 8. 2026.

TODO: automatický provider zapnout až po výběru dokumentovaného a spolehlivého zdroje. Provider musí aktualizovat pouze `currentBuildId` a `provider.lastCheckedAt`; stav se potom vypočítá automaticky.

## Ověření překladu přímo na webu

Soubor `SUPABASE-GAME-STATUS-ADMIN.sql` přidává centrální tabulku `game_status_overrides`, samostatnou roli `profiles.is_admin`, RLS a dvě zabezpečené RPC funkce. Po spuštění migrace a jednorázovém označení účtu správce se přihlášenému správci vedle stavu zobrazí malá šipka. Běžní návštěvníci žádné ovládání neuvidí.

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

Při další ruční kontrole změňte pouze `currentBuildId`, `lastSteamUpdate` a `provider.lastCheckedAt`. Pokud se veřejný build změnil, `verifiedBuildId` ponechte beze změny, dokud překlad ve hře znovu neotestujete. Web mezitím automaticky ukáže oranžové „Čeká na ověření“.

## Nasazení

Netlify načte `netlify.toml` automaticky. Není potřeba nastavit žádnou proměnnou prostředí ani tajný klíč. Na GitHub Pages funguje statický fallback z `data/game-status.json`; automatický serverový přepočet je dostupný pouze na Netlify.

