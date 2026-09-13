# Floors, Goblin King og Moss Crypt — QA

Dato: 2026-09-13. Kørende implementation af den godkendte art-plan. Nye bitmaps er lavet med indbygget ImageGen ud fra de eksisterende character-ark og dungeon. Originalerne er bevaret; [prompts](../art-prompts/boss-region.md) og [loading-metadata](../public/assets/boss/loading.json) dokumenterer eksport og faktiske crops.

## Visuel kontrol

- [Goblin King, 390×780](../artifacts/goblin-king-390.png): samme eksisterende dungeon, tydelig boss-silhuet og separat HP/timer. Bossens krop er ca. 54 art-pixels høj mod heroens 26.
- [Sejr og slot-unlock](../artifacts/boss-victory-390.png): reward-kort efter bossens death-clip; det oprindelige miljø er stadig synligt.
- [Moss Crypt, 390×780](../artifacts/moss-crypt-390.png) og [360×640](../artifacts/moss-crypt-360.png): nyt koldt sten/mos-miljø med samme rum, props og varme fakler. Begge abilities kører.
- [Desktop](../artifacts/boss-desktop.png): samme kompakte scene inden for det brede viewport.
- [Frame-kontaktark](../artifacts/boss-art-study.png): runtime-teksturer med fodlinje. Kontrolleret for magenta kanter, nabofragmenter, våbenplads og sammenhængende collapse. Source-frame 7 med ekstra våben er fravalgt til fordel for pose 10 i walk-cyklussen. Heroens uregelmæssige framegrænser er målt individuelt.
- [34 sekunders bevægelsesprøve](../artifacts/boss-loop.webm): rigtig kørende kamp, boss-death og krypt-farming. Optaget fra Phaser-canvas med browserens MediaRecorder; HTML-HUD og reward-kort er dokumenteret i screenshots og indgår ikke i videoen. Afspilning/seek er kontrolleret ved kamp, death og krypt.

Character-kilderne i denne leverance er RGB med magenta key. Loaderen fjerner key-farven før sampling til art-grid; de bruges ikke direkte som RGB-sprites. Boss-impact har ægte alfa. Det første boss-koncept havde bagte tern og er kun bevaret som referencekilde, aldrig indlæst i spillet.

Hurt er visuel rekyl/tint uden stunlock. Attack-posen har prioritet over hurt, så et slag ikke visuelt afbrydes. Bossens kontaktpose starter præcis ved simulationens hit-tid 520 ms. Death-clips afsluttes før fade. Reduceret bevægelse slår UI-glow/entrance-animation fra og dæmper ekstra partikler.

## Funktionel kontrol

`npm test`: 27 beståede tests. De eksisterende 19 tests dækker combat-stall, priser, upgrades, damage, Heal, død og save. De otte nye tests dækker:

- Floor-skift bevarer HP, cooldowns, gold og upgrades; Floor 4 kræver sejr.
- Fuldt HP ved boss-start, låst build under forsøget og fuldt boss-reset ved næste forsøg.
- Død/timeout/retreat returnerer til tidligere floor uden boss-reward.
- Sejr åbner begge abilities og krypten én gang; miljøet skifter først ved rejse.
- Ét boss-hit ved kontaktframen, uden tidlig skade under windup.
- Hurt afbryder ikke attack, og death-poser holdes før fade.
- Version 1-save migreres; reload under boss er retreat; world-progress overlever reload.
- Gold/min inkluderer recovery og bruger floor-rewards.

`scripts/check-world-flow.js` gennemført i en isoleret udviklingsbrowser: 12 checks af det faktiske UI-forløb fra Floor 3 til boss, retreat, nyt forsøg, sejr, slot-unlock, krypten, retur til Floor 1 og tilbage til krypten. Derefter genindlæst via den rigtige save-loader: Floor 4, region crypt og unlock bevaret, ingen save-advarsel. Ingen asset-loadfejl, browserfejl eller vandret overflow ved dette forløb.

`scripts/check-arena-layout.js`: 16 målinger pr. viewport ved 390×780, 360×640 og 1280×900, med gentagne åbninger/lukninger af Upgrades under både pause og kørende kamp. Alle 48 målinger passerer grænsen på 1 px for canvas-størrelse og centrering. Den tidligere rettelse med opdatering af Phasers parent-bounds er bevaret.

`npm run build` passerer TypeScript og Vite production-build. Den eksisterende advarsel om det store Phaser-bundle består.

## Balanceprøve

Reproduceres med `node --experimental-strip-types scripts/boss-balance.mjs`. [Rå resultater](boss-balance-results.json) bruger seeds 41, 7 og 123. Køb foretages til de rigtige priser; budget er en testfixture, ikke gratis gold i produktet.

| Build / budget | Resultat i alle tre seeds |
|---|---|
| Uden upgrades | Tab efter ca. 13 sekunder |
| Kun ATK, 120/240/480 gold | Tab; skade alene giver ikke tilstrækkelig overlevelse |
| Blandet ATK/HP/DEF, 120 gold | Tab efter ca. 28 sekunder |
| Blandet, 240 gold | Sejr efter 25,1 sekunder; ca. 153 HP tilbage |
| Heal + HP/DEF, 120 gold | Sejr efter 75,1 sekunder; ca. 91 HP tilbage |

Floor-test med et blandet 240-gold build, 600 sekunder, seed 41: 28,7 / 44,6 / 58,8 gold/min på Floor 1/2/3. Floor 4 med begge abilities giver 66,6 gold/min. Det er første tuning, ikke dokumentation for endelig langtidsbalance. Højere floor øger også dødsfrekvensen.

## Afgrænsning

Dette er stadig ét hero-build med to kendte abilities. Bossen kan kun belønne én gang. Lyd, nye normale fjendetyper, mastery, trigger-minmax og party er ikke del af denne leverance. Miljøer er selvstændige genererede baggrunde, ikke modulære tilesets. Browser-QA emulerer mobilstørrelser i Chromium; fysisk iPhone/Safari er ikke verificeret her.
