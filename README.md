# IdleCombatz

En mobilorienteret prototype til et incremental auto-RPG: automatisk kamp, gold, upgrades og lokal save med [Modern Pixel-referencen](references/modern-pixel-reference.png) som visuelt grundlag. [Spil i browseren](https://idlecombatz.vercel.app).

## Kør lokalt

Projektet bruger TypeScript, Phaser og Vite:

```powershell
npm install
npm run dev
```

Åbn den lokale adresse, Vite viser i terminalen. Lav et production-build med:

```powershell
npm run build
```

Kør de 27 kamp-, upgrade-, boss- og save-tests med `npm test`. Kør farming-sammenligningen med `npm run balance` og boss-sammenligningen med `node --experimental-strip-types scripts/boss-balance.mjs`; resultater står i [boss-QA](docs/boss-qa.md).

## Farming-prototypen

Den lokale scene kører med en mørk portrait-dungeon, en knight, skeletter, flakkende fakkellys og korte orange sværdeffekter. Idle, walk og attack er integreret med referencens kompakte HUD, ability-dock og navigation. Character-sheets, dungeon, UI-atlas og transparent VFX er produceret. Første prøve er kontrolleret i browser på tre mobilstørrelser og desktop; [visuel QA](docs/visual-qa.md) indeholder screenshots, optagelse og de resterende forskelle mod referencen.

Scenen har automatisk bevægelse og angreb, HP/skade, Power Strike eller Heal og 5 sekunders grund-respawn. Hero og skeletter har dedikerede hurt- og death-clips. Faklernes grundflamme ligger i baggrunden med animeret glød og embers ovenpå; et separat flamme-spritesheet er endnu ikke produceret.

Floor-knappen ved gold vælger mellem Floor 1–3 med stigende fjende-HP, skade og rewards. De deler præcis samme dungeon. Panelet viser målt gold/min inklusive dødstid. Goblin King er et frivilligt 90-sekunders bossforsøg med fuldt hero- og boss-HP ved start. Død, timeout, retreat eller reload afslutter forsøget; bossen får fuldt HP ved næste forsøg. Upgrades og ability-skift er låst under forsøget.

Første sejr åbner Slot II, så Power Strike og Heal begge kører automatisk, og giver adgang til Floor 4: Moss Crypt. Miljøet skifter først ved indgang til krypten. Retur til Floor 1–3 viser den oprindelige dungeon igen. Floor og unlock gemmes; eksisterende version 1-saves migreres uden tab af progression.

Upgrades-panelet giver gentagelige køb til ATK, Max HP, DEF og respawn-tid, mens arenaen er synlig. HP-køb healer ikke straks; Heal og næste respawn bruger den nye Max HP. Recovery gælder næste dødsfald. ATK/HP/DEF har et prototype-loft på 100 levels, Recovery på 15 (2 sekunders respawn).

Gold, levels, valgt ability, hero-HP, begge cooldowns og resterende respawn-tid gemmes lokalt i denne browser. Køb og ability-skift gemmes straks; øvrige ændringer gemmes højst én gang pr. sekund og ved normal skjulning/lukning. Reload starter et nyt encounter med gemt hero-status. Der er ingen offline rewards eller cloud-sync, og samtidige faner sammenflettes ikke. Settings indeholder Pause, referencevisning og Start over med bekræftelse. Save-fejl vises i spillet; ukendte/beskadigede saves bevares, indtil spilleren eksplicit starter forfra.

[Farming-QA](docs/farming-qa.md) dokumenterer første køb/save-forløb. [Boss-QA](docs/boss-qa.md) dokumenterer den aktuelle floor/boss-leverance. Party, mastery, flere fjendetyper og lyd følger senere i [planen](PLAN.md).

Aktuel asset-status og konkrete eksportkrav står i [asset-manifest.md](asset-manifest.md). Et planlagt asset er ikke et produceret eller visuelt godkendt asset.

## Projektgrundlag

- [PLAN.md](PLAN.md) — rækkefølge, scope og milepæle.
- [visual.md](visual.md) — bindende komposition, art direction, farver, UI og visuel accept.
- [asset-manifest.md](asset-manifest.md) — filer, dimensioner, clips, pivots, timing og leverancestatus.
- [Original reference](references/modern-pixel-reference.png) — uændret visuelt facit.
- [Tekniske primærkilder](docs/technical-sources.md) — Phaser-textures og browserverifikation.
- [Visuel QA](docs/visual-qa.md) — resultater og konkrete kendte forskelle.
- [Characters-prompts](art-prompts/characters.md), [environment/UI-prompts](art-prompts/environment-ui.md) og [effekt-prompts](art-prompts/effects.md) — de faktiske ImageGen-prompts og asset-provenance.
- [Boss/region-prompts](art-prompts/boss-region.md) — det nye sæt med direkte referencer til eksisterende figurer og dungeon.

Genererede asset-originaler er bevaret i `public/assets/`. Character-crops, pivots og timing ligger i [loading.json](public/assets/characters/loading.json). Inter-fonten bundles lokalt fra `@fontsource/inter`; [SIL OFL-licensen](public/assets/licenses/Inter-OFL.txt) følger projektet.

Spillet starter med én hero. [Combat-simulationen](src/game/simulation.ts) er allerede adskilt fra [Phaser-renderingen](src/game/createGame.ts), så damage og rewards afgøres af spilreglerne. Fremtidigt party, mastery og finjusterbare triggers er dokumenteret som vision, men implementeres ikke som tomme systemer i den første visuelle prøve.
