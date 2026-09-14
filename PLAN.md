# IdleCombatz — startplan

## Aktuel implementation — dungeon-pivot, 2026-09-14

[Den komplette dungeon-pivot-plan](docs/dungeon-pivot-plan.md) er nu omsat til sammenhængende floors med rum, automatisk udforskning/kamp/loot og midlertidige spillerordrer. Fire layouts, boss/krypt, modulært miljø, kort og save v3 er implementeret. [Dungeon-QA](docs/dungeon-qa.md) registrerer verifikation, balance og udgivelsesstatus; det er facit for, hvilke kontroller der faktisk er gennemført.

Resten af dette dokument bevarer den oprindelige arena-plan og leverancehistorik. Boss, Slot II, Floor 4 og hurt/death-clips er siden leveret, som beskrevet under milepæl 2 og i [boss-QA](docs/boss-qa.md); ældre statusafsnit nedenfor skal læses historisk.

Status: Den animerede scene og farming-leverancen med upgrades, lokal save og balanceprøve er implementeret og kontrolleret. Se [farming-QA](docs/farming-qa.md), [balancerapport](docs/balance-qa.md) og de resterende visuelle forskelle i [docs/visual-qa.md](docs/visual-qa.md). Lyd og dedikerede hurt-/death-clips fra den samlede milepæl er endnu ikke leveret.

Den gennemførte leverance er beskrevet i [implementeringsplanen for upgrades, save og balance](docs/farming-implementation.md). Den bygger videre på den eksisterende kampmodel, inklusive rettelsen af fastlåsning ved melee-grænsen. Næste gameplay-leverance er tre floors og første boss med andet ability slot som belønning.

## Formål med starten

Byg en lille browserprototype, hvor en autonom hero farmer, tjener gold og bliver synligt stærkere gennem upgrades. Første milepæl skal gøre det muligt at vurdere kampens læsbarhed, spilfølelse og forholdet mellem damage og sustain.

Projektmappen er tom ved planens oprettelse. Billedet med “Modern Pixel” er bindende visuelt facit, konkretiseret i [visual.md](visual.md). Spillet skal genskabe det viste udseende. Den tidligere samtale og det oprindelige GDD bruges som designbaggrund; de få tilpasninger af equipment, levels og ability slots er beskrevet i visual.md.

## Principper, vi tager med

- Spilleren vælger build; bevægelse, targeting og combat er automatiske.
- Prototypen starter med én hero. Datastrukturen skal kunne rumme flere heroes senere.
- Gold er den eneste progression-valuta. Ingen XP eller hero-levels i starten.
- ATK, HP og DEF skal have forståelige funktioner. Procentbaseret Heal skalerer med Max HP, og DEF reducerer incoming damage.
- Permanent overlevelse på et passende floor er et legitimt resultat af et sustain-build.
- Ingen generel regeneration eller healing ved kills tilføjes i første version. Sustain skal kunne vurderes gennem de valgte abilities og stats.
- Abilities har fornuftig standardadfærd. Justerbare triggers er senere, valgfri optimering.
- Kampens simulation er source of truth. Grafik viser simulationens tilstand og hændelser.
- Gear, party, mastery, floor modifiers og offline progression implementeres efter den første kerne er afprøvet.

## Første leverance — animeret visuel prøve

Den første leverance er nu en kørende, lille animeret scene med de centrale assets fra referencen. Den kan startes med `npm run dev`; se [README.md](README.md). Asset-manifest, første grafiksæt, projektopsætning og browserverifikation er gennemført efter nedenstående rækkefølge. Denne prøve indleder milepæl 1; det samlede farming-loop følger derefter.

1. Skriv et konkret asset-manifest for første milepæl med filnavne, art-dimensioner, frameantal, timinger, pivots, loop-regler og kobling til kamp-events. Markér tydeligt planlagte assets og faktisk producerede assets.
2. Producer et sammenhængende første sæt: hero, skelet, dungeon-gulv, sidevægge, fakler og den orange sværdbue. Afprøv især idle, walk og attack; de resterende tilstande færdiggøres som del af milepælen.
3. Opret den minimale lokale projektopsætning, der kan vise sættet som en portrait-scene i bevægelse og i korrekt skala. Brug layoutet fra visual.md til at bedømme kompositionen.
4. Sammenlign scene og animation direkte med originalen. Ret synlige afvigelser, før asset-biblioteket og gameplay-indholdet udvides.

Prøven er færdig, når dungeon, figurer, pixelstørrelse og sværdeffekt fungerer sammen i både et screenshot og en kort bevægelig sekvens. Den er ikke i sig selv en færdig farming-prototype og opfylder endnu ikke hele acceptlisten for UI og gameplay.

## Milepæl 1 — første spilbare farming-arena

### 1. Saml et kort byggegrundlag

Skriv et kompakt GDD v0.2 med de aftalte principper, startindholdet og kampens regler. Adskil aktuelle funktioner fra fremtidsvisionen. Balanceværdier fra det oprindelige oplæg er startpunkter, som skal afprøves.

Leverance: Et fælles designgrundlag, der kan bruges direkte under implementering.

### 2. Opret projekt og simulation

- TypeScript, Phaser og Vite med HTML/CSS til UI.
- En mobilorienteret portrait-visning, som også kan afprøves på desktop.
- Adskilte moduler til simulation, balance, rendering, UI og save.
- Fælles combatant-data med identitet, side, stats, position, target og abilities. Party-data starter med én hero.
- Simulation med faste tidsskridt og tydelige hændelser for damage, healing, kills, abilities og respawn.
- Centrale balanceværdier, så costs, damage, healing og respawn kan justeres uden at ændre renderer.

Leverance: En kørende lokal app med en enkel struktur, som kan udvides til næste milepæl.

### 3. Byg den automatiske kamp

- Én åben dungeon-arena, én melee-hero og én baseline-enemy med skeletudseende som i visual.md.
- Cirka 3–6 aktive enemies med løbende genopfyldning.
- Hero finder nærmeste levende enemy, bevæger sig i range og angriber automatisk. Enemies bevæger sig mod og angriber heroen.
- HP, damage reduction, kills og gold-belønning.
- Ved hero-death stopper kampen, en respawn-timer vises, og arenaen resettes med friske enemies ved respawn.
- Ét ability slot med valg mellem Power Strike og Heal, så offensive og defensive valg kan afprøves tidligt.
- Power Strike kræver et gyldigt target; Heal bruges, når det giver mening, og spildes ikke på fuldt HP.

Leverance: Et sammenhængende farming-loop, der fortsætter automatisk gennem kills og dødsfald.

### 4. Tilføj upgrades, UI og visuel feedback

- Gold og gentagelige upgrades til ATK, Max HP, DEF og respawn-tid.
- Tydelig visning af pris, nuværende værdi og effekten af næste upgrade.
- Hero-HP, enemy-HP, equipped ability, cooldown og respawn-status.
- Enkel lokal save af gold, upgrade levels og valgt ability; ingen offline rewards.
- Arena, hero, enemies, UI og effekter, der genskaber den konkrete Modern Pixel-reference efter visual.md.
- Små bevægelses-, angrebs- og dødsanimationer, hit flash samt damage- og healing-tal.
- Enkel lyd til hits, kills og abilities med mute-funktion.

Arenaen skal være synlig, mens spilleren foretager de vigtigste upgrades. Første visuelle leverance skal kontrolleres direkte mod referencen efter acceptlisten i visual.md. Midlertidige assets kan bruges under arbejdet, men tæller ikke som en visuelt færdig leverance.

Leverance: En version, som kan spilles og vurderes uden udviklerværktøjer.

### 5. Afprøv og ret første milepæl

- Kontrollér centrale kampregler med målrettede tests: damage reduction, Heal/cooldown, én reward pr. kill samt death/respawn.
- Afprøv forløbet i browseren: start → farm → køb upgrade → skift ability → dø → respawn → reload og fortsæt med gemt progression.
- Kontrollér mobil-layout og læsbarhed på smal skærm.
- Kontrollér referenceproportioner, dungeon, sprites, UI, sværdeffekt og bevægelse efter visual.md, før indholdet udvides.
- Afprøv, at upgrades ændrer den faktiske kamp og kan mærkes visuelt.
- Afprøv et balanceret eksempel, hvor Heal + HP/DEF kan opretholde farming, og et offensivt eksempel, som dræber hurtigere. Vurder forskellen i gold over tid inklusive respawn.
- Ret observerede fejl og problemer med spilfølelse, før indholdet udvides.

Første milepæl er færdig, når den automatiske kamp, upgrades, ability-valg, death/respawn og save fungerer sammen, og vi kan vurdere, om kampen er tilfredsstillende at følge. Den beviser endnu ikke floor-valg eller boss-loopet.

## Milepæl 2 — test progression og det første gennembrud

Status 2026-09-13: Tre valgbare floors, rullende gold/min, Goblin King, andet ability slot, Floor 4/Moss Crypt og tilhørende sprite-sæt er implementeret. Se [boss-QA](docs/boss-qa.md). Øvrige enemy-archetypes og Whirlwind er fortsat næste udvidelse.

Efter første arena er afprøvet:

Den konkrete næste gameplay-leverance bruger eksisterende skeletter og abilities plus en ny boss. Enemy-archetypes og Whirlwind fra udvidelseslisten nedenfor følger bagefter. [Art-planen](docs/floors-boss-art-plan.md) fastlægger sprite-produktionen. Alle floors i første område og bossforsøget deler samme dungeon; bosssejr åbner første floor i område 2, hvor miljøet først skifter. Tidligere floors beholder deres oprindelige dungeon.

1. Tilføj tre valgbare farming-floors med forskellige stats og rewards. Lad hele den første sektion være tilgængelig, så effektivitet styrer valget.
2. Tilføj de øvrige enemy-archetypes og Whirlwind, så AoE-farming kan konkurrere med single-target og sustain.
3. Vis gold/min over et rullende interval, hvor dødstid tæller med.
4. Tilføj Goblin King som frivilligt forsøg med fuldt hero-HP og fuldt boss-HP ved start. Nederlag sender spilleren tilbage til tidligere farming-floor; boss-damage gemmes ikke.
5. Lad sejr åbne andet ability slot og et sværere farming-floor.
6. Afprøv et kort samlet forløb med farming, upgrades, bossnederlag, ændring af build og bosssejr. Justér pacing ud fra spiltesten.

Herefter kan prototypen udvides til de oprindelige ti floors, Fireball og en længere testsession. Hero #2 er kandidat til det første store system efter den afprøvede prototypekerne.

## Senere designhensyn

- Party-farming kan have individuel respawn. Under bossforsøg bør normal timer-respawn være slået fra, så forsøget ikke kan forlænges gennem skiftende genoplivninger.
- Mastery skal belønne meningsfuld spell-brug og give plads til at prøve nye spells. Det må ikke belønne spildte casts eller gøre fornuftige triggers til en ulempe.
- Standardadfærd skal kunne klare normal progression; triggeroptimering giver specialisering og ekstra effektivitet.
- Party, mastery og triggers dokumenteres som fremtidige udvidelser uden at blive bygget som tomme systemer i første milepæl.
