# Ready or Not

Stránka ready-or-not.html používá společné JS/CSS a centrální status.

Obrázky jsou uložené v assets/Ready or Not. Ready_hl.jpg je hlavní obrázek na detailu, kartě překladu a v novinkách; Ready_1.png až Ready_5.png tvoří galerii.

Před nasazením spusťte SQL EDITOR/SUPABASE-READY-OR-NOT.sql jako poslední herní SQL aktualizaci. Zachovává stávající hry a data; rozšiřuje constraints komentářů, hlášení chyb, ratingu/like-dislike a download counteru. Živá databáze nebyla změněna.

Steam App ID 1144200: https://store.steampowered.com/app/1144200/Ready_or_Not/ . Živá kontrola SteamCMD dne 10. 9. 2026 vrátila build 24942528 z 3. 9. 2026. Podle zadaného stavu Funkční slouží jako výchozí ověřený build; kompatibilita překladu nebyla testována ve hře. Nový build automaticky vyvolá čekání na ověření a blokování downloadu.

Automatická kontrola, ruční refresh a admin stav používají existující společné funkce. Koncové ověření na Netlify a zápisy do Supabase vyžadují nasazení a SQL aktualizaci. Bez pushu a deploye.
