# IdleCombatz — asset-manifest

**Leverance:** Første animerede visuelle prøve.  
**Produktionsstatus:** Character-sheets, dungeon, UI-atlas og transparent VFX er produceret og integreret i den kørende scene. Fire simulationstests og production-build passerer. Den første prøve er kontrolleret i browser; [visuel QA](docs/visual-qa.md) dokumenterer evidens og resterende art-forskelle. Dette er ikke hele farming-milepælens visuelle accept.  
**Visuelt facit:** [Original reference](references/modern-pixel-reference.png) og [visual.md](visual.md).  
**Scope og rækkefølge:** [PLAN.md](PLAN.md).

Dette manifest beskriver konkrete produktionsmål. Det hævder ikke, at alle filer er produceret eller godkendt. Timinger, frameantal og pivots er implementeringsvalg; de kan ikke aflæses af reference-stillbilledet.

## Status og godkendelse

| Status | Betydning |
|---|---|
| Planlagt | Specificeret, men ingen verificeret eksport |
| Produceret | Fil findes; format, frames og metadata er kontrolleret |
| Integreret | Indlæses og afspilles i browser-scenen |
| Kontrolleret | Sammenlignet med referencen i både stillbillede og bevægelse |

En genereret enkeltillustration eller et flot sourceark er ikke i sig selv et færdigt animationsasset. Status ændres kun på baggrund af den faktiske fil og dens afspilning. Der føres særskilt status for source, eksport og visuel kontrol, når de foreligger.

## Fil- og skala-kontrakt

- Original reference bevares uændret. Den bruges til sammenligning, ikke som udskåret gameplay-atlas.
- Spilassets og genererede kilder ligger under `public/assets/`. Character-originaler bevares som `hero-sheet-original.png` og `skeleton-sheet-original.png` ved siden af de indlæste filer. Dungeon og UI-atlas er selvstændige genererede originalfiler. Der findes ikke en særskilt `assets/source/`-mappe.
- Rastereksporter er PNG. Figurer og VFX har ægte alfa; sort eller ternet baggrund må ikke være bagt ind i filen.
- Producerede filnavne nedenfor er faktiske paths relative til `public/assets/`. Planlagte filer er kontraktmål; manifest og loader opdateres sammen ved ændringer.
- Art-pixels er det fælles synlige pixel-grid. Sourcefilens pixelmål kan være større og må ikke forveksles med figurens art-skala.
- Normal arena er omtrent 180 × 244 art-pixels, vist i 360 × 488 UI-enheder. Hero, skelet, sten, våben og skarpe effekter bruger samme pixelsprog.
- Heroens synlige krop er 24–28 art-pixels høj; skelet er lidt smallere og højst omtrent samme højde. Våben og transparente margener tæller ikke med i kropshøjden.
- Nearest-neighbor, deaktiveret billedudglatning og rendering på art-grid. Aktørens scale ændres ikke mellem clips.
- Frames nummereres fra 0. Rektangler og frame-dimensioner skal være hele pixels, også hvis den genererede kilde ikke har et matematisk ensartet grid.
- Et sourceark med eksempelvis 4 kolonner og 3 rækker er et produktionslayout. De faktiske crop-rektangler verificeres før eksport; en ukendt billedhøjde må ikke divideres blindt med 3.
- Ingen automatisk trimning pr. frame uden tilhørende stabil pivot-metadata. Atlas får 2 pixels padding/extrusion ved behov; ingen fremmede farver langs transparent outline.

## Første visuelle prøve — produktionsliste

Tabellen viser den aktuelle status efter den første scene-QA. Kendte visuelle forskelle står i docs/visual-qa.md. Dedikerede klip og assets markeret planlagt er fortsat ikke produceret.

| ID | Foreslået eksport | Art-mål / indhold | Status |
|---|---|---|---|
| `hero.knight` | `characters/hero-sheet.png`; original i `characters/hero-sheet-original.png` | 1448 × 1086 RGBA; 4 idle, 4 walk, 4 attack; runtime 48 × 48 art-celle, synlig idle-krop 26 art-pixels | Kontrolleret i første prøve; se QA |
| `enemy.skeleton` | `characters/skeleton-sheet.png`; original i `characters/skeleton-sheet-original.png` | 1448 × 1086 RGBA; 4 idle, 4 walk, 4 attack; runtime 48 × 48 art-celle, synlig idle-krop 24 art-pixels | Kontrolleret i første prøve; se QA |
| `environment.dungeon` | `environment/dungeon.png` | 1086 × 1448 RGB; runtime nearest-neighbor til 180 × 244; violet gulv, sidevægge, fakler og props samlet i baggrunden | Kontrolleret i første prøve; se QA |
| `environment.torch` | Bagt ind i `environment/dungeon.png` | Statisk fakkel/flamme og grundlys; 4 selvstændige flammeframes er fortsat planlagt | Statisk asset integreret; frameanimation udestår |
| `environment.torchGlow` | Runtime-lag i `src/game/createGame.ts` | Flakkende lokal glød og små opadgående embers over baggrundens lys | Kontrolleret i første prøve; se QA |
| `actor.contactShadow` | Runtime-tekstur i `src/game/textures.ts` | 18 × 6 pixels med trappet silhuet; foot-anker, mindre skala for skelet | Integreret og kontrolleret i scenen |
| `fx.slashBasic` | `effects/combat-alpha.png`, frames 0–3 | 64 × 64 runtime-celler, skala 0,53; mindre variant af samme varme crescent | Kontrolleret i første prøve; se QA |
| `fx.powerStrike` | `effects/combat-alpha.png`, frames 0–3 | 64 × 64 runtime-celler, skala 0,88; større varm crescent | Kontrolleret i første prøve; se QA |
| `fx.impact` | `effects/combat-alpha.png`, frames 4–7 | 64 × 64 runtime-celler; skala 0,26 basic / 0,44 Power Strike | Kontrolleret i første prøve; se QA |
| `fx.sparks` | Runtime-lag i `src/game/createGame.ts` | Små 1 × 2 / 2 × 1 pixelgnister; 3 ved basic, 7 ved Power Strike/death | Kontrolleret i første prøve; se QA |
| `ui.atlas` | `ui/icons.png` | 1448 × 1086 RGBA; 12 ikoner normaliseres i runtime til 4 × 3 celler på 48 × 48 | Kontrolleret i første prøve; se QA |
| `ui.heroPortrait` | `ui/icons.png`, frame 0 | Knight-bust; genereret ud fra samme designreference, sammenhæng med aktør skal kontrolleres | Kontrolleret i første prøve; se QA |
| `ui.powerStrike` / `ui.heal` | `ui/icons.png`, frames 1 / 2 | Varm sværd/impact og grøn plusform | Kontrolleret i første prøve; se QA |
| `ui.lock` | `ui/icons.png`, frame 10 | Gråviolet lås | Kontrolleret i første prøve; se QA |
| `ui.navigation` | `ui/icons.png`, frames 3–6 | Hero, Skills, Upgrades, Boss | Kontrolleret i første prøve; se QA |
| `ui.resources` / `ui.settings` | `ui/icons.png`, frames 7–9 | Gold, floor/trappe, tandhjul | Kontrolleret i første prøve; se QA |
| `ui.armor` | `ui/icons.png`, frame 11 | Ekstra rustningsikon; ikke et implementeret equipment-system | Produceret; ikke påkrævet af proof |
| `ui.frames` | `src/styles.css` | Mørke indsatser, tynde violette rammer og diskrete bevels | Kontrolleret i første prøve; se QA |
| `ui.font` | `@fontsource/inter` via `src/main.ts` | Lokalt bundlet Inter 500, 600 og 700; SIL OFL 1.1 | Produceret dependency; licens bevaret |
| `ui.combatNumbers` | Procedurale bitmap-glyphs i `src/game/textures.ts` | 3 × 5 tegn for `0–9`, `+` med mørk outline; orange/gul damage og grøn healing | Kontrolleret i første prøve; se QA |

En samlet dungeon-baggrund er tilladt til den første faste visuelle scene, hvis den er selvstændigt produceret og matcher referencens rum. Milepæl 1 kræver et dokumenteret miljøsæt, så layout og beskæring kan tilpasses uden at strække stenenes pixelstørrelse. Baggrunden erstatter ikke selvstændige figurer, VFX eller UI.

Enemy-HP er en runtime-komponent på 19 × 3 art-pixels med mørk ramme og rød fyldning. HUD, damage, healing, gold og cooldowns viser den lille simulations faktiske tilstand. Den giver 1 gold pr. skelet-kill; gold har endnu ingen købsfunktion og bliver ikke gemt. Et komplet progression-/farming-loop er fortsat næste milepæl.

### Verificerede kilder og runtime-normalisering

- Character-crops og pivots findes i [`public/assets/characters/loading.json`](public/assets/characters/loading.json). [`source-metadata.json`](public/assets/characters/source-metadata.json) registrerer kildedimensioner, alfa og frame-bounds. Arkene er genereret med den indbyggede ImageGen ud fra den gemte reference; originaler er bevaret.
- Hvert character-ark er 1448 × 1086 med et nominelt 4 × 3-grid på 362 × 362. Attack-frame 10 har 400 pixels bred crop; frame 11 starter ved x=1124 og er 324 pixels bred. Dette bevarer sværdspidsen og forhindrer et afskåret fragment i recovery-framen.
- Runtime normaliserer characters til 48 × 48 art-pixels med foot-pivot `(24,40)`. Heros source-skala er `26/252` art-pixels pr. source-pixel; skeletons er `24/264`. Margenerne beskytter våben og attack-bevægelse uden at ændre kropsskala mellem clips.
- Dungeon er genereret som et særskilt rum uden gameplay-figurer eller HUD. Runtime-samplingen er 180 × 244 og skal vurderes for stenstørrelse og proportioner i scenen; kilden er ikke et native 180 × 244 tile-set.
- [`src/prepareIcons.ts`](src/prepareIcons.ts) finder opaque bounds i UI-atlassets celler med alfa over 200. Kolonnegrænser er `0,362,724,1086,1448`; rækkegrænser er `0,360,690,1086`. Hvert motiv samples med nearest-neighbor til højst 44 × 44 og centreres i en 48 × 48 celle. Runtime-atlas er 192 × 144; kilden ændres ikke.
- Frame-rækkefølge for UI: portrait, Power Strike, Heal, Hero, Skills, Upgrades, Boss, gold, floor, settings, lock, armor. Runtime-atlasset indeholder transparente margener; dets 48 pixels er en UI-celle, ikke en påstand om world-art-skala.
- Inter leveres af den installerede `@fontsource/inter`-pakke. Den uændrede [`Inter-OFL.txt`](public/assets/licenses/Inter-OFL.txt) er kopieret fra pakkens `LICENSE`; ophav er The Inter Project Authors.
- Den valgte [`effects/combat-alpha.png`](public/assets/effects/combat-alpha.png) er 1774 × 887 RGBA. Hjørne og tomt indre har alfa 0; verificeret impact-center har alfa 253. [`effects/loading.json`](public/assets/effects/loading.json) registrerer kilder, crops, foreslåede pivots og produktions-timing. Runtime bruger heltallige kolonnegrænser `0,444,887,1331,1774` og rækker `0,444,887`, normaliseret til 64 × 64.
- VFX-originalen `combat.png`, alfa-mellemresultatet `combat-alpha-attempt.png` og det sorte mellemresultat `combat-black.png` er bevaret som ImageGen leverede dem. Kun `combat-alpha.png` indlæses af scenen.

## Clips, framefordeling og timing

Character-source-layout er **4 kolonner × 3 rækker**: idle i række 0, walk i række 1 og attack i række 2. Dimensioner og crops er registreret i character-`loading.json`. Tabellen registrerer den aktuelle runtime-timing; den særskilte frameanimation af fakkelflammen er fortsat et produktionsmål.

| Clip | Frames i normaliseret ark | Timing | Loop / afslutning | Synkronisering |
|---|---|---|---|---|
| `hero.idle` | 0–3 | 250 ms hver; 4 fps | Loop | Ingen gameplay-events |
| `hero.walk` | 4–7 | 9 fps; ca. 111 ms hver | Loop under bevægelse | Fodposition følger simulationen; bevægelse ligger ikke i sprite-root |
| `hero.attack` | 8–11 | 65 / 55 / 75 / 85 ms; 280 ms | Én gang, derefter relevant tilstand | Kontakt ved start af frame 10, 120 ms efter start |
| `skeleton.idle` | 0–3 | 250 ms hver; 4 fps | Loop | Forskudt startfase pr. skelet |
| `skeleton.walk` | 4–7 | 9 fps; ca. 111 ms hver | Loop under bevægelse | Ingen indbagt translation |
| `skeleton.attack` | 8–11 | 65 / 55 / 75 / 85 ms; 280 ms | Én gang | Kontakt ved start af frame 10, 120 ms efter start |
| `torch.flame` — senere asset | 0–3 | Mål 100 / 130 / 90 / 120 ms; 440 ms | Loop | Aktuelt viser scenen statisk flamme med separat glød/embers |
| `slash.basic` | 0–3 | 60 ms hver; 240 ms | Én gang, fjern effekt | Starter ved simulationens hit-event |
| `slash.powerStrike` | 0–3 | 60 ms hver; 240 ms | Én gang, fjern effekt | Starter ved simulationens hit-event; større skala |
| `impact.warm` | 4–7 | 50 ms hver; 200 ms | Én gang, fjern effekt | Starter på hit; target-position med lokal y-offset |
| `combatNumber.damage/heal` | Runtime | 700 ms; bevæges 8 art-pixels op, reduceret bevægelse 1 pixel | Én gang; fade mod slutningen | Faktisk hit-/heal-værdi, afrundet til heltal; max 8 samtidige tal |

Timinger er første afprøvelige defaults. Konkrete afvigelser fra visual.md er registreret nedenfor. Hvis en sprite kræver mere eller mindre windup, ændres clip-metadata og den fælles hit-timing sammen. Nye værdier dokumenteres; en tilfældig framerate må ikke flytte damage uden tilsvarende simulation.

**Timing-punkter til scene-QA:** VFX-metadata foreslår en crescent på 200 ms med varighederne 40/50/65/45 og impact på 180 ms med 30/40/50/60. Aktuel runtime bruger tabellens 240/200 ms med lige frames. Basic-buen bruger dermed samme varighed som Power Strike. Combat-tal lever 700 ms mod visual.md's mål på 450–650 ms. Disse forskelle er dokumenterede afprøvningsværdier, ikke en endelig godkendelse af timing.

Power Strike genbruger foreløbig heroens attack-kropsclip med separat stor VFX. Der kræves ikke en separat identisk kropsanimation. Ved kommende højere attack speed komprimeres/afbrydes clip på en kontrolleret måde; angreb må ikke ophobes i en animationskø.

## Pivots og metadata

**Aktørens world-position er midtpunktet mellem føddernes kontaktpunkter.** Det samme punkt bruges til bevægelse, renderposition, kontaktskygge og depth-sortering. Spejling sker omkring denne lodrette akse.

Faktiske character-metadata og øvrige produktionsmål:

| Eksporttype | Pivotmål i art-pixels | Regel |
|---|---|---|
| Hero i runtime 48 × 48 | `(24, 40)` | Source-pivot `(181,325)`; frame 11 bruger x=143 efter forskudt crop |
| Skelet i runtime 48 × 48 | `(24, 40)` | Source-pivot y=353 idle, y=339 walk, y=327 attack; x=181, undtagen frame 11 x=143 |
| Udvidet attack-frame | Bevar foot-point; offset dokumenteres | Mere våbenplads ændrer ikke aktørens world-position |
| Fakkel i 8 × 16 | `(4, 15)` | Anker i holderens vægkontakt |
| Kontaktskygge | Midtpunkt | Ligger direkte under aktørens foot-point |
| Sværdbue | Heroens foot-point plus dokumenteret lokal offset | Spejles med angrebsretningen; ikke centreret efter hver frames alpha-bounds |
| Hit-stjerne | Effektens centrum | Placeres ved target/våbenkontakt, ikke ved target-fødder |

For hvert produceret spritesheet/atlas skal metadata som minimum indeholde: filnavn, faktiske billeddimensioner, frame-navne, heltallige crop-rektangler, origin/pivot pr. frame, synlige body-bounds, clip-rækkefølge, varigheder og om effekten loopes. Masterfil/source og genererings- eller licenskilde registreres sammen med eksporten.

Et ark godkendes ikke, hvis hovedstørrelse, hjelm, våben, farver eller fødder ændrer identitet mellem frames. Udtræk og normalisering må ikke skjule, at en kilde mangler den nødvendige framekonsistens.

## Hændelser: animationen viser kampen

Første proof bruger en lille, deterministisk kampmodel i [`src/game/simulation.ts`](src/game/simulation.ts) med faste trin på 1/60 sekund. Den beregner bevægelse, melee-angreb, HP/skade, DEF-reduktion, Power Strike, Heal, kills, 1 gold pr. skelet, genopfyldning af enemies og 5 sekunders hero-respawn. [`createGame.ts`](src/game/createGame.ts) viser modellen og dens events; rendering er ikke source of truth for damage eller rewards. Progressionsupgrades, floor-valg og boss-system findes endnu ikke.

De faktiske events er `hit`, `heal`, `death` og `respawn`. Attack-klippet følger aktørens state og stateTime; simulationens kontakt er ved 120 ms. Renderer starter bue, impact, tal og sparks på det afregnede event. Den mere udbyggede event-kontrakt nedenfor er et fremtidigt strukturmål, ikke nye implementerede event-navne:

- `attackStarted`: aktør, target, starttid og planlagt hit-tid. Renderer vælger og tidsjusterer attack-clip.
- `damageApplied`: aktør, target, tidspunkt og faktisk damage. Starter target-flash, impact og damage-tal.
- `abilityCast`: ability-ID, caster, target/position og tidspunkt. Starter ability-effekt og dock-feedback.
- `healingApplied`, `combatantDied` og `combatantRespawned` tilføjes med det tilhørende gameplay.
- En render-frame eller Phaser-animation-callback må aldrig beregne damage, godkende kills eller udbetale gold.
- Hvis browseren taber render-frames, skal samme damage kun vises/afregnes én gang. VFX kan springe til korrekt fase eller afsluttes.
- Lille hurt-rekyl er kun visuel; den ændrer ikke simulationens position eller indfører mekanisk knockback.

## Resterende assets til milepæl 1

Disse tilstande er nødvendige for en færdig farming-arena, men ikke en forudsætning for at vise den første idle/walk/attack-prøve.

| Asset / clip | Produktionsmål | Trigger / loop | Status |
|---|---|---|---|
| Hero + skelet hurt | Aktuelt tint i 80 ms; mål 1–2 dedikerede frames | Hit-event; kort overlay, blokerer ikke kamp | Runtime-feedback integreret; dedikerede clips planlagt |
| Hero death | Aktuelt 400 ms fade og sparks; mål 4 sammenfaldsframes | Death-event; 5 sekunders timer, derefter frisk arena | Fade/respawn integreret; dedikeret clip planlagt |
| Skelet death | Aktuelt 400 ms fade og sparks, fjernes efter 450 ms; mål 4 knogle-collapse-frames | Death-event | Fade/despawn integreret; dedikeret clip planlagt |
| Hero spawn/respawn | 200 ms fade-in til idle | Respawn-event; ingen fuldskærmseffekt | Integreret; scene-QA udestår |
| Heal-ikon | `ui/icons.png`, frame 2; tyk grøn plusform | Tilgængelig, når ability-valg findes | Integreret; scene-QA udestår |
| Heal world-effekt | Runtime grøn tint i 150 ms og 8 opadgående pixelpartikler i 700 ms | Heal-event; én afspilning | Integreret; scene-QA udestår |
| Healing-tal | `+` og faktisk healed HP afrundet; 700 ms | Heal-event; samme glyph-system som damage | Integreret; scene-QA udestår |
| Modulært dungeon-sæt | 6+ gulvtiles 16 × 16; vægge i samme grid, props 16 × 24–24 × 40 | Statisk, undtagen fakler | Planlagt |
| Hero/Skills/Upgrades-paneler | Hero-inspektion og equipped Power Strike/Heal; Upgrades/Boss viser klart manglende funktion | Åbnes fra navigationen | Visuelle paneler integreret; upgrades/boss-gameplay planlagt |
| Settings/mute-ikon | `ui/icons.png`, frame 9; gråt pixel-tandhjul | Åbner sceneindstillinger; mute tilføjes med lyd | Integreret; scene-QA udestår |
| Hit-, kill- og ability-lyd | Korte diskrete one-shots med kendt kilde/licens | Gameplay-event; mute understøttet | Planlagt |

## Senere milepæle

| Asset | Produktionsmål | Leveres med |
|---|---|---|
| Bat | Ca. 24 × 16; 4 flight-frames ved 10 fps; hurt/death | Øvrige enemy-archetypes |
| Golem | Ca. 32 × 40; tung idle/walk/attack/hurt/death | Øvrige enemy-archetypes |
| Whirlwind | Ca. 20 × 20 cyan spiral-ikon; varm roterende world-bue | Whirlwind-gameplay |
| Goblin King | Ca. 48 × 56 med våbenmargin; idle/walk/attack/hurt/death | Første boss og boss-HP-komponent |
| Boss victory / slot unlock | Kort varm dødseffekt og tydelig lås → slot-overgang | Bosssejr og andet ability slot |
| Fireball | Ca. 20 × 20 ikon; projectile, hale og varm impact | Fireball-gameplay |
| Hero #2 og #3 | Fælles art-grid, særskilt læsbar rolle og silhuet | Senere party-unlocks |

Party, mastery, triggerindstillinger, gear og floor engineering får ikke tomme UI-assets eller falske progressionstal i første scene.

## Teknisk verifikation

`npm test` passerer fire målrettede tests for meningsfuld Heal/cooldown ved ability-skift, kill/reward og bounded tilstand, deterministisk reset samt combat-stop og frisk arena ved respawn. `npm run build` passerer TypeScript-kontrol og Vite production-build. Direkte visuel sammenligning, bevægelsesprøve og browserkontrol er registreret i [docs/visual-qa.md](docs/visual-qa.md).

Faktiske genereringsprompts: [characters](art-prompts/characters.md), [environment/UI](art-prompts/environment-ui.md) og [effekter](art-prompts/effects.md). Alle producerede bitmap-assets er lavet med indbygget ImageGen.

## Kontrol før første prøve afleveres

- [x] Faktiske filer og metadata er registreret; ingen planlagt fil omtales som produceret.
- [x] Dungeon og UI vurderes mod spilskærmsområdet i originalen, ikke hele præsentationsarket.
- [x] Hero og skelet har referenceproportioner, stabil identitet og samme art-pixelstørrelse.
- [x] Idle, walk og attack fungerer både separat og ved tilstandsskift; fødder og sværd hopper ikke mellem frames.
- [x] Der findes en rolig frame og en reproducerbar Power Strike-kontaktframe.
- [x] Sværdbuen er en kort varm crescent med lagdelt kerne, ikke en glat neon-outline.
- [x] Fakler i begge sider og mindst én tydelig tønde/søjledetalje holder dungeon-kompositionen genkendelig.
- [x] Hver HP-/damage-/cooldown-visning kan forklares af den aktuelle demohændelse.
- [x] Screenshot ved 360 × 796 og kort bevægelig sekvens er kontrolleret; 360 × 640, 390 × 844 og desktop tilpasser uden blur eller vandret scroll.
- [x] Resterende afvigelser er dokumenteret. Denne prøves afslutning er adskilt fra hele farming-milepælens acceptliste.
