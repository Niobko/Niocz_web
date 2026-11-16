# Cooking Simulator 2: Better Together

Lokální projekt: `C:\Users\Pknio\Documents\GitHub\Niocz_web`

Detail: `cooking-simulator-2.html`  
Společný slug: `cooking-simulator-2`  
Steam App ID: **2455360**, ověřeno 16. 11. 2026 na [oficiálním Steamu](https://store.steampowered.com/app/2455360/).

Čeština v1.0, hra v1.23.1f72f80, Unity, vydání 16. 11. 2026, ZIP 0.20 MB. Texty a UI 100 %, kontrola ve hře 75 %.

## Před vlastním nasazením

1. V Supabase projektu používaném v `config.js` spusťte celý soubor `SQL EDITOR/SUPABASE-COOKING-SIMULATOR-2.sql`. Vyžaduje stávající tabulky webu a sloupce administrace Steam konfigurace. Nejde o nový Supabase projekt; ostatní instalační SQL znovu nespouštějte.
2. SQL v jedné transakci rozšíří seznamy povolených her pro komentáře, hlášení chyb, hodnocení (hvězdičky i like/dislike) a stahování. Vloží registraci do `game_versions` a počáteční počítadlo. Existující řádky, oprávnění, RLS, funkce a notifikační triggery nepřepisuje. Opakované spuštění zachová již uložené verze a počty stažení.
3. Ověřte registraci čtecím dotazem:

```sql
select game_slug, name, translation_version, supported_game_version,
       translation_updated_at, steam_app_id, verified_build_id
from public.game_versions
where game_slug = 'cooking-simulator-2';

select game_slug, download_count
from public.download_totals
where game_slug = 'cooking-simulator-2';
```

4. Po vlastním nasazení ověřte pod přihlášeným účtem komentář, hodnocení, oblíbené, sledování a předvýběr hry v hlášení chyb. Místní kontrola neodesílá zkušební příspěvky do produkční databáze.
5. V detailu otevřete stav verze a spusťte ruční kontrolu Steamu. Hodnoty `verifiedBuildId`, `currentBuildId` a `lastSteamUpdate` jsou lokálně `null`; žádné číslo buildu nebylo odhadnuto. Existující hodinová úloha a ruční kontrola si aktuální build načtou podle App ID. Zjištěný build se automaticky nestane ověřeným buildem.
6. Dodaný stav „Funkční“ je zachován. Když Steam vrátí aktuální build a ověřený build stále chybí, společná logika zobrazí „Čeká na ověření“ a pozastaví stahování. Teprve po skutečné kontrole kompatibility uložte ověřený Build ID přes stávající administraci.

## Zapojení

Katalog a novinky používají stejné karty jako ostatní hry. Detail používá společné CSS a JavaScript včetně autora, komentářů, hodnocení, reportů, počítadla a dostupnosti stahování. Registr v `user-system.js` propojuje profil, oblíbené, sledování a odkazy z upozornění; `game_versions` zajišťuje databázovou registraci a administraci. Datum aktualizace a informace autora používají společnou logiku webu. Samostatný systém historie úprav nebyl v aktuálním projektu nalezen.

Všech šest původních souborů je v `assets/Cooking Simulator 2/` beze změny obsahu. `Cooking_hl.jpg` je cover na kartách a detailu i součást galerie se všemi pěti screenshoty. Celkem je na detailu sedm elementů obrázků (cover je záměrně také v galerii).

SQL je připraven pro ruční spuštění; produkční databáze nebyla změněna. Nebyl proveden git commit, push ani nasazení na Netlify.
