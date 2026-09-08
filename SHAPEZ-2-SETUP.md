# Shapez-2

Stránka: shapez-2.html

Před nasazením spusťte v Supabase SQL Editoru celý soubor SQL EDITOR/SUPABASE-SHAPEZ-2.sql. Rozšiřuje povolené slugy pro komentáře, hlášení chyb, hodnocení (like/dislike) a počítadlo stažení. Zachovává existující hry, oprávnění a data; lze jej spustit opakovaně. Živá databáze nebyla změněna. Tento soubor spusťte jako poslední z herních SQL aktualizací.

Steam App ID 2162800 je ověřené podle https://store.steampowered.com/app/2162800/ . App ID identifikuje hru, nikoli konkrétní build. Ověřený Build ID pro v1.2.0-rc3 nebyl dodán; nevymýšlíme jej ani neoznačujeme aktuální veřejný build automaticky za kompatibilní. Výchozí stav je Funkční. Po první úspěšné kontrole Steamu se podle společné logiky stav přepne na Čeká na ověření a download se zablokuje, dokud správce nepotvrdí kompatibilitu stavem Funkční. Tím se uloží ověřený build a další změna buildu opět vyžádá kontrolu.

Automatická hodinová kontrola, ruční refresh, admin stavy, report s předvolenou hrou, komentáře, hodnocení a download counter používají stávající společný systém. Pro živé ověření těchto služeb je nutné nasazení a výše uvedená SQL aktualizace.

Bez pushu a deploye.

Aktualizace Steam dat: aktuální veřejný build byl doplněn také do lokálního JS fallbacku a použit jako výchozí ověřený build podle zadaného stavu Funkční. Shapez-2: 24668948; Prince of Persia: 17528300. Jde o výchozí konfiguraci podle zadání, nikoli nový herní test překladu. Předchozí poznámka o chybějícím buildu již neplatí.
