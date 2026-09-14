# Dungeon-pivot — verifikation

Dato: 2026-09-14. Version: 0.2.0. Spilflow: load/save → automatisk udforskning → lokale encounters → loot → clear → trappe → næste/gentaget floor. En spillerordre afbryder udforskningsvalget midlertidigt, mens kamp forbliver automatisk.

## Implementeret

- Fire håndbyggede layoutvarianter med syv rum, hovedrute, sidegrene, lokale enemies, to kister og trappe.
- Firevejsnavigation på 16-pixel-grid, fysisk vægkontrol, vægblokeret syn, fog og kortkendskab. Lokal separation holder aktører fri af hinanden uden at skubbe dem gennem vægge.
- Auto finder rum, kæmper, looter og fortsætter. Gulv-, kiste-, fjende- og rumordrer vender tilbage til Auto. Utilgængelige mål giver feedback.
- Clear/repeat/progression, død/recovery og automatisk tilbagefald efter to mislykkede runs.
- Goblin King som afslutning på Floor 3; 90-sekunders forsøg, engangs-Slot II og adgang til Moss Crypt. Sejrsvisningen kræver ikke et klik.
- Save v3 med aktivt besøg og kampdata. v1/v2-migration bevarer progression og gammel floor-adgang og tager backup før første write.
- Nyt ImageGen-miljøatlas, selvstændige kister/trapper/fakler, roligt kamerafølge og kort-/Auto-UI.

## Kontroller og evidens

| Kontrol | Resultat |
|---|---|
| Før pivot | 27 eksisterende tests og production-build passerede |
| Opdaterede tests | 38 tests passerer; combat, upgrades, navigation, fog, loot, boss, migration og storage-fejl |
| Lang simulationsprøve | 20 gennemførte gentagelser pr. floor, ingen rute-recovery; reward-ledger kontrolleret pr. tick og save-validering hvert sekund |
| Samlet browserforløb | 16 checks passerer i `scripts/check-dungeon-flow.js`, herunder køb, rumordre, Auto-genoptagelse, clear, repeat, retreat, bosssejr og krypt |
| Deployed Auto-forløb | Over seks minutter i normal hastighed med ATK/HP/DEF 12: Floor 1 → 2 → 3 → boss → krypt, fem clears i alt og ingen fejl. [Transitionsdata](dungeon-release-results.json) |
| Faktisk pointer-input | Browser-museklik i bossrummet gav en gyldig move-ordre gennem kameraets koordinatkonvertering |
| Gentagne afbrydelser | Spillerordrer på tværs af fire floors og tre spawn-seeds genoptager Auto uden rute-recovery |
| Væghjørner | En diagonal vægkontakt blokerer både syn og melee-hit; alle 80 floor-gentagelser passerer med denne regel |
| Normal reload | Genindlæsning af Floor 4 beholdt gold, unlock, run-ID, udforskning og skadet hero; ingen save-fejl |
| Production-save | Ægte v2-migration i browseren bevarede stats/gold og tog backup; et efterfølgende UI-køb af ATK overlevede normal reload. Ingen DEV-hook i production |
| UI-input og reduced motion | Kortordre vises som midlertidig ordre; Auto annullerer den. Enter åbner kortet og aktiverer en fokuseret rumknap i preview. Klik på kort/Upgrades giver ingen world-pointer-events. Reduced motion afprøvet ved 360 × 640 |
| Browser-/assetfejl | Ingen rapporterede runtime-fejl eller manglende assets i den gennemførte kontrol |
| Byg | TypeScript og Vite production-build passerer; Vites eksisterende advarsel om Phaser-bundlestørrelse består |
| Uafbrudt production-browserprøve | 30,22 minutter, 181 samples, 17 clears og 411 gold med startbuild; alle samples havde `document.hidden === false`, ingen browserfejl. [Målinger](dungeon-soak-results.json) |
| Udgivelse | [Production](https://idlecombatz.vercel.app) verificeret efter Vercel `READY` for commit `96932fc`, deployment `dpl_48cV8aNySafpfqLWpnxXFBQtAU8a`. JavaScript `index-CP7iHnUJ.js`, save v3, kort og Auto indlæses uden browser-/asset-/save-fejl eller vandret overflow ved 390 × 844. Dokumentationscommit efter denne kontrol ændrer ikke spilbuildet |

Den lange prøve kørte i én uafbrudt Chromium-session på et lokalt production-build fra før de sidste rettelser af væghjørners syn, restore-synsfelt, viewport og fjernelse af gamle baggrunde. Den blev ikke genstartet under arbejdet. Den endelige kamp-/navigationskode er efterfølgende dækket af alle 38 tests, 80 floor-gentagelser og det særskilte seks-minutters Auto-forløb på Vercel. Heap-målingen inkluderer videooptagelse og QA-data og er ikke en fuld analyse af memory leaks.

## Visuel kontrol

Snapshots kontrolleres på 360 × 640, 360 × 796, 390 × 844 og desktop. Både normalt dungeon, boss, krypt, kort og upgrades indgår. Upgrades ændrer nu det synlige world-udsnit i stedet for at nedskalere hele scenen; figurerne beholder derfor samme størrelse. Kamera, sprite/VFX-depth, fog og prop-matte er kontrolleret i gameplay.

Screenshots findes i `artifacts/dungeon-*.png`. `artifacts/dungeon-motion.webm` indeholder 34 sekunders faktisk canvas-gameplay fra production-browserprøven, uden HTML-UI. Browseren dekoder filen til 180 × 252 med readyState 4. Ingen pixelbilleder er erstattet med SVG-tegninger. Alpha-forsøgets kilde er RGB; den dokumenterede runtime-loader fjerner prop-matten. Originale kilder er bevaret.

En kort måling i synlig desktop-browser på Vercel-preview viste median 16,7 ms, p95 17,0 ms og maksimum 17,2 ms over 180 animation frames. Dette er en stikprøve på testmaskinen. De to gamle arenabaggrunde på tilsammen 3.161.329 bytes indlæses ikke længere; assets og historiske referencer bevares i projektet.

## Balance

[Reproducerbare målinger](dungeon-balance-results.json) kommer fra `npm run balance`. Hvert scenarie varer ti minutters simulation; scenarier der fejler, kan gå tilbage til Floor 1. `endedOnFloor` angiver dette, så en efterfølgende clear på et lavere floor ikke fejlagtigt læses som en bosssejr.

Efter afprøvning er almindelig rejsehastighed 72 art-pixels/s og bevægelse i kamp 36. Både Auto og spillerordrer bruger samme hastighed. Helten vælger trappen direkte efter clear, når ruten er kendt.

- Startbuild på Floor 1: første clear omkring 82 sekunder, 13,5 gold/min i ti minutters prøve. Dødsfald kræver ingen manuel redning.
- Heal/HP/DEF-build på Floor 2: første clear omkring 118 sekunder, 16,4 gold/min og ingen dødsfald.
- Et etableret build på Floor 3: første clear omkring 86 sekunder, 67,2 gold/min og ingen dødsfald.
- Etableret build på Floor 4: første clear omkring 83 sekunder, 67,2 gold/min og ingen dødsfald.

Det oprindelige mål på 2–4 minutter er justeret til kortere tidlige floors, omtrent 1–3 minutter afhængigt af build. Tom rejsetid ligger nær 30 % for start-/sustain-builds, men er stadig omkring 39–51 % for builds, der dræber meget hurtigt. Det er en konkret senere pacingmulighed; vi tilføjer ikke længere kampe eller kunstige pauser blot for at ramme en procent.

## Afprøvningsvalg og afgrænsninger

- Layoutvarianterne bruger samme overskuelige syvrumsstruktur med spejling, forskudte sideværelser og særskilt bossrum. Procedurel generering er ikke implementeret.
- Navigation bruger grid-ruter og lokal separation i brede passager. Et generisk reservationssystem er ikke nødvendigt for de nu afprøvede encounters.
- Kister har lukket/åben tilstand; fakler har flakkende lys. Flere kiste-/flammeframes og nye retningsanimationer er fortsat art-udvidelser.
- Eksisterende front/skrå karakterposes genbruges under op-/nedadgående bevægelse. Der er ingen nye otte-retningsark.
- Gulvpatches og vægfront/top sammensættes på grid'et. Der er endnu ikke et stort særskilt atlas til hver hjørne-/portalform, låste nøgledøre eller nye dekorative søjler.
- Der er én aktiv run, lokal save, ingen offline rewards, cloud-sync, lyd, gear eller direkte joystick/WASD.
- Viewport-kontrol i desktop-browser dokumenterer layout og input. Ydelse på en fysisk telefon er ikke målt.
