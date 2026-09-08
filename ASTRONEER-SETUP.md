# Astroneer

Stránka: astroneer.html. Obrázky: assets/Astronner (původní přílohy beze změny).

Před nasazením spusťte v Supabase SQL Editoru celý soubor SQL EDITOR/SUPABASE-ASTRONEER.sql jako poslední z herních SQL aktualizací. Přidává Astroneer do povolených her pro komentáře, hlášení chyb, hodnocení (like/dislike) a počítadlo stažení. Zachovává dosavadní hry, data i oprávnění a lze jej spustit opakovaně. Živá databáze nebyla změněna.

Steam App ID 361420: https://store.steampowered.com/app/361420/ASTRONEER/ . Oba existující poskytovatelé kontroly (Steam PICS a SteamCMD HTTP) dne 8. 9. 2026 vrátili veřejný build 24409322, aktualizovaný 12. 8. 2026. Podle zadaného stavu Funkční je použit jako výchozí ověřený build v centrálním configu i JS fallbacku. Nejde o herní test kompatibility překladu v1.0 pro v1.43.2. Další změna buildu vyvolá stav Čeká na ověření a zablokuje download, dokud správce nepotvrdí kompatibilitu.

Automatická hodinová kontrola, ruční refresh, admin stav, blokování downloadu, report s předvolenou hrou, komentáře, hodnocení a počítadlo používají společný systém. Koncové živé ověření vyžaduje nasazení Netlify a SQL aktualizaci.

Bez pushu a deploye.
