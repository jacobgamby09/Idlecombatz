# IdleCombatz

En mobilorienteret prototype til et incremental auto-RPG. Første leverance er en lokal, animeret visuel scene, der skal genskabe [Modern Pixel-referencen](references/modern-pixel-reference.png).

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

Kør simulationens fire tests med `npm test`. Både de fire tests og `npm run build` passerer. Tests dækker Heal/cooldown, kill/reward, reset og hero-respawn.

## Den første prøve

Den lokale scene kører med en mørk portrait-dungeon, en knight, skeletter, flakkende fakkellys og korte orange sværdeffekter. Idle, walk og attack er integreret med referencens kompakte HUD, ability-dock og navigation. Character-sheets, dungeon, UI-atlas og transparent VFX er produceret. Første prøve er kontrolleret i browser på tre mobilstørrelser og desktop; [visuel QA](docs/visual-qa.md) indeholder screenshots, optagelse og de resterende forskelle mod referencen.

Scenen har en lille rigtig kampmodel: automatisk bevægelse og angreb, HP/skade, Power Strike eller Heal, kills med 1 gold og 5 sekunders respawn. Figurer fader ud ved død; særskilte hurt-/death-clips kommer senere. Faklernes grundflamme ligger i baggrunden med animeret glød og embers ovenpå; et separat flamme-spritesheet er endnu ikke produceret.

HP, gold og cooldowns nulstilles med Reset eller ved genindlæsning og gemmes ikke. Valgt ability bevares ved Reset i samme session. Pause, Reset og referencevisning bruges til at kontrollere prøven. Upgrades, flere floors, boss, persistens og fuld balance leveres i de efterfølgende trin i [planen](PLAN.md).

Aktuel asset-status og konkrete eksportkrav står i [asset-manifest.md](asset-manifest.md). Et planlagt asset er ikke et produceret eller visuelt godkendt asset.

## Projektgrundlag

- [PLAN.md](PLAN.md) — rækkefølge, scope og milepæle.
- [visual.md](visual.md) — bindende komposition, art direction, farver, UI og visuel accept.
- [asset-manifest.md](asset-manifest.md) — filer, dimensioner, clips, pivots, timing og leverancestatus.
- [Original reference](references/modern-pixel-reference.png) — uændret visuelt facit.
- [Tekniske primærkilder](docs/technical-sources.md) — Phaser-textures og browserverifikation.
- [Visuel QA](docs/visual-qa.md) — resultater og konkrete kendte forskelle.
- [Characters-prompts](art-prompts/characters.md), [environment/UI-prompts](art-prompts/environment-ui.md) og [effekt-prompts](art-prompts/effects.md) — de faktiske ImageGen-prompts og asset-provenance.

Genererede asset-originaler er bevaret i `public/assets/`. Character-crops, pivots og timing ligger i [loading.json](public/assets/characters/loading.json). Inter-fonten bundles lokalt fra `@fontsource/inter`; [SIL OFL-licensen](public/assets/licenses/Inter-OFL.txt) følger projektet.

Spillet starter med én hero. [Combat-simulationen](src/game/simulation.ts) er allerede adskilt fra [Phaser-renderingen](src/game/createGame.ts), så damage og rewards afgøres af spilreglerne. Fremtidigt party, mastery og finjusterbare triggers er dokumenteret som vision, men implementeres ikke som tomme systemer i den første visuelle prøve.
