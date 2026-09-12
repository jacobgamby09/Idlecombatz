# Første visuelle prøve — kontrol

Dato: 2026-09-12. Status: Første animerede scene implementeret og kontrolleret lokalt. Dette afslutter den første prøve i PLAN.md; det afslutter ikke hele farming-milepælen.

## Leverancen

- Selvstændigt genereret dungeon, hero, skelet, UI-atlas og transparent VFX.
- Hero/skelet: idle, walk og attack på fælles art-grid, justerede fodpivots og individuelle figurer i Phaser.
- Lille deterministisk kampmodel, automatisk targeting/bevægelse, damage, Power Strike, Heal, kills og genopfyldning af enemies.
- Kompakt HUD og navigation, ability-valg, pause/play, reset og visning af originalreferencen.
- Grafikken er produceret med indbygget ImageGen. Originalreference og producerede filer er bevaret i projektet.

## Evidens

| Kontrol | Resultat |
|---|---|
| TypeScript og production-build | `npm run build` passerer |
| Kampregler | `npm test`: fire tests passerer; Heal/cooldown, rewards, reset og respawn |
| Første indlæsning | Canvas og alle krævede assets indlæses; ingen Vite-overlay eller registrerede browserfejl |
| Normal mobil | 360 × 796, korrekt portrait-komposition |
| Kompakt mobil | 360 × 640, uden vandret/lodret scroll; kampfladen tilpasses |
| Større mobil | 390 × 844, uden vandret/lodret scroll; korrekt canvas efter genindlæsning |
| Desktop | 1280 × 960, centreret 360 × 796 spilflade |
| Interaktion | Hero/Skills/Upgrades/Boss-paneler, ability-valg, pause/play, reset, reference-dialog og Escape er afprøvet |
| Touch | Produktknapper har mindst 44 × 44 touchområde |
| Animation | Idle/walk/attack og effekter er afprøvet i den levende scene; skift mellem kampstillinger er kontrolleret i screenshots. En 8,5 sekunders canvas-optagelse er gemt |

Det store Phaser-bundle giver en Vite-advarsel om chunk-størrelse. Build gennemføres; optimering af loading og bundling er et senere trin.

### Screenshots og bevægelse

- [Fastfrosset Power Strike, 360 × 796](../artifacts/scene-strike-360x796.png).
- [Kompakt visning, 360 × 640](../artifacts/scene-360x640.png).
- [Større mobil, 390 × 844](../artifacts/scene-390x844.png).
- [Bevægelsesprøve, WebM](../artifacts/scene-motion.webm) — canvas-optagelse af idle/walk/attack, effekter og kamp; ikke en optagelse af HTML-panelet omkring arenaen.

Power Strike-screenshot kan reproduceres i dev-versionen med `window.__IDLECOMBATZ__.capturePowerStrike()`. Funktionen nulstiller scenen, afspiller til det første store slag og fryser den. Den er kun et udviklingsværktøj. Normale sceneindstillinger bruger Pause, Reset og Reference.

## Fejl fundet og rettet

1. Canvas og kamera kunne have forskellige størrelser ved første load/viewport-skift, hvilket gav store tomme bånd omkring dungeon. Størrelsen synkroniseres nu både ved sceneoprettelse og resize. Genindlæsning er kontrolleret på de tre mobilstørrelser.
2. Ability-skift kunne fjerne keyboard-focus ved panel-rerender, så Escape ikke lukkede panelet. Focus bevares nu, og Escape håndteres på dokumentniveau.
3. Figurer stod for tæt og dækkede hinandens kroppe. Større afstand mellem fødder og passende melee-range giver bedre læsbarhed.
4. Skeletternes source-rækker havde forskellig baseline. Metadata retter pivots i den normaliserede runtime-tekstur.
5. Billedværktøjets første VFX-eksporter indeholdt bagt checkerboard. Kun den efterfølgende verificerede RGBA-fil bruges i scenen.

## Opfølgning: pauser i combat (2026-09-12)

Brugerens mobiloptagelse viste, at heroen kunne stå stille, mens enemies stadig bevægede sig. Simulationen reproducerede op til 5,02 sekunders ventetid med et angreb klar og en enemy lige ved melee-grænsen. Bevægelsen stoppede præcis ved angrebsafstand 23; afrunding kunne efterlade en afstand på `23.000000000000004`, og figurernes indbyrdes skub kunne holde dem lige udenfor grænsen.

Bevægelsen sigter nu en halv intern pixel indenfor melee-grænsen, og afstandssammenligningen tolererer numerisk afrunding. Rettelsen gælder både hero og skeletter. Attack-cooldowns, animationstiming og damage er uændrede.

Tre nye regressionstests fejlede før rettelsen og passerer efter den: afrunding ved grænsen samt tre minutters kamp med henholdsvis Power Strike og Heal. I disse forløb er længste ventetid med angreb klar og en enemy indenfor 23,1 nu ét simulationstick (1/60 sekund). Alle syv tests og production-build passerer. Lokal Chromium-kontrol ved 390 × 844 bekræfter rendering og fortsat kamp uden registrerede browserfejl; dette er ikke en test på en fysisk iPhone.

## Visuel vurdering mod referencen

Den mørke violetpalette, dungeonens sidevægge og varme fakler, den lille stålhero, skeletternes relative størrelse, de skarpe pixelkanter og den orange sværdbue er samlet i den viste komposition. UI'et følger de mørke rammer, små rasterikoner og fire navigationselementer.

Kendte forskelle til næste art-iteration:

- Skeletkranierne er rundere og lidt mere dominerende end referencefigurernes.
- Sværdbuens røde yderkant er mere kornet. Den kan renses og få en mere sammenhængende gul/hvid inderside.
- Docken har to slots efter prototype-reglerne og er derfor mere tom end referencebilledets fem fliser. Det er en dokumenteret indholdstilpasning i visual.md.

Denne kontrol er en vurdering af første prøve, ikke en påstand om pixelidentisk rekonstruktion eller brugerens endelige art-godkendelse.

## Fortsat uden for denne leverance

Dedikerede hurt/death-clips, separat animeret fakkelflamme, modulært tile-set, lyd, upgrades, save, flere floors og boss hører til de næste dele af planen. Aktuel death-visning er fade/sparks, og fakler bevæges gennem glød og embers. Gold og HP er faktiske værdier i den lille model, men progression gemmes ikke.
