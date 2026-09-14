# IdleCombatz — plan for pivot til automatisk dungeon-udforskning

Dato: 2026-09-14. Status: Retningen er godkendt og implementeret som første dungeon-version. Faktiske resultater, afprøvningsvalg og udgivelsesstatus står i [dungeon-QA](dungeon-qa.md). Dokumentet nedenfor bevarer designgrundlaget og de oprindelige afprøvningsmål.

## 1. Produktretning

IdleCombatz bliver et idle dungeon-RPG, hvor helten selv bevæger sig gennem et sammenhængende floor med rum, korridorer, fjender og loot. Spilleren kan når som helst give en destination, vælge en fjende eller prioritere en kiste. Når ordren er udført, fortsætter helten automatisk.

Dungeon-layoutet har en tydelig hovedrute med korte sidegrene. Det giver en fornemmelse af udforskning, samtidig med at auto-adfærden er let at forstå. Referencen til Shattered Pixel Dungeon handler her om floor-struktur, rum og opdagelse. Vi designer vores eget layout og vores egne assets og beholder realtidskamp og permanent progression.

Tre principper afgør alle senere valg:

1. Helten kan udforske, kæmpe, samle loot og gentage floors uden input, når spillet kører.
2. Aktiv deltagelse giver kontrol over rækkefølge og prioritering; de samme områder og rewards er tilgængelige på Auto.
3. Spilleren skal kunne se, hvad helten laver, hvorfor han gør det, og hvad der sker bagefter.

Lukket eller suspenderet browser giver fortsat ingen offline progression i første leverance. Offline rewards er en særskilt senere udvidelse, ikke noget vi kan love ved blot at lade auto-adfærden køre.

## 2. Udgangspunkt i den nuværende kode

| System | Aktuel funktion | Planlagt ændring |
|---|---|---|
| `src/game/simulation.ts` | Automatisk kamp, nærmeste target, direkte bevægelse, fast arena og løbende enemy-respawn | Bevar kampregler; erstat bevægelse, target-søgning og respawn med dungeon-navigation og floor-forløb |
| `src/game/world.ts` | Fire floor-definitioner med stats/rewards samt Goblin King | Tilføj layouts, encounters, clear-mål, unlocks og bossens placering |
| `src/game/createGame.ts` | Én baggrund, fast kamera, sprites og kamp-VFX | Modulært miljø, større world, kamerafølge, fog og input til world-positioner |
| `src/game/progression.ts` og `balance.ts` | Gold, ATK/HP/DEF/Recovery, Power Strike og Heal | Genbrug funktionerne; afprøv økonomi, sustain og tempo med rejsetid mellem kampe |
| `src/game/types.ts` og `save.ts` | Save v2 med permanent progression og hero-status; encounters genskabes ved reload | Save v3 med aktivt dungeon-besøg, udforskning, fjender, loot og styreindstillinger |
| `src/ui.ts` og `styles.css` | HUD, abilities, upgrades, floors og separat boss-knap | Clear-status, Auto/ordre-status, kort, gentag/progression og boss som del af dungeon |
| Grafik | Hero, skeletter, boss, animationer, UI og VFX findes; miljøerne er samlede billeder | Genbrug figurer og effekter; producer et modulært miljøsæt til hvert område |

Den nuværende adskillelse mellem simulation og rendering beholdes. Vi skifter ikke engine eller frontend-stack som del af pivotet.

De eksisterende dokumenter indeholder historiske beskrivelser, som ikke alle er ajour. Eksempelvis er boss, upgrades, saves og hurt/death-animationer implementeret, selv om tidlige afsnit stadig omtaler dem som kommende arbejde. Ovenstående tager udgangspunkt i kode og de seneste leveranceafsnit.

## 3. Første sammenhængende spiloplevelse

Et nyt spil starter ved indgangen til Floor 1. Auto er aktiv, og helten finder selv det første rum. Fjender reagerer, når han nærmer sig; efter kampen åbner han en synlig kiste og fortsætter mod næste ukendte område. Spilleren kan købe upgrades undervejs.

Hvis spilleren trykker på en sidegren, undersøger helten den først. Hvis spilleren derefter lægger telefonen fra sig, færdiggør han ordren, genoptager udforskningen, clearer resten og går videre eller gentager flooren efter den valgte indstilling.

Første testlayout har syv rum i alt. Dette er et forbindelsesdiagram, ikke en tegning i fysisk målestok:

```text
Indgang ── Kamprum A ── Kamprum B ── Slutkamp ── Trappe
                │             │
             Kisterum      Sidekamp
```

Der er fire kamprum, et rent kisterum, indgang og udgang. Helten kommer tilbage til hovedruten efter sidegrenene. Første layout har ingen låste nøgledøre, skjulte rum eller gåder.

## 4. Styring og automatisk adfærd

### 4.1 Spillerens handlinger

| Input | Regel |
|---|---|
| Tryk på et kendt, gangbart gulvfelt | Giv en bevægelsesordre til feltet |
| Tryk på et opdaget rum på kortet | Gå til en tilgængelig position i rummet |
| Tryk på en synlig fjende | Prioritér fjenden, hvis der er en gyldig rute og angrebsposition |
| Tryk på en synlig, uåbnet kiste | Gå hen, håndtér kamp undervejs og åbn kisten |
| Tryk på Auto | Afbryd den midlertidige ordre og genoptag automatisk udforskning |
| Giv en ny ordre | Erstat den gamle; første version har ingen ordrekø |
| Tryk på ukendt område, væg eller utilgængeligt mål | Kort feedback og behold den nuværende gyldige handling |
| Pause i Settings | Stop hele simulationen; dette er adskilt fra Auto |

Vi begynder med destinationer og mål frem for joystick. Det er den første form for manuel overtagelse. Direkte WASD-/joystick-styring er en mulig senere udvidelse og indgår ikke skjult i første leverance.

En ordre kræver ikke, at spilleren slår Auto fra først. Status viser eksempelvis `På vej til kiste · Auto bagefter`. Et destinationsmærke viser det valgte sted. Når målet er nået, fjenden dør eller kisten allerede er åbnet, afsluttes ordren. En kort, færdiggjort handling er nok; vi venter ikke på en vilkårlig inaktivitetstimer.

### 4.2 Prioriteter

Auto arbejder i denne rækkefølge:

1. Død, pause, boss-resultat eller floor-overgang håndteres først.
2. Et allerede startet angreb afsluttes efter de gældende kampregler.
3. En lokal, aktiveret trussel håndteres. Et eksplicit fjendemål får prioritet, når det er tilgængeligt.
4. Den midlertidige spillerordre fortsættes.
5. Kendt loot i det netop ryddede rum samles op.
6. Nærmeste tilgængelige uudforskede forbindelse vælges efter reel ruteafstand.
7. Kendte resterende fjender eller kister på flooren opsøges.
8. Når clear-kravene er opfyldt, går helten til trappen.

Første version lader helten standse og kæmpe mod aktive fjender på ruten. Et gulvtryk er derfor ikke en garanti for at løbe ud af en igangværende kamp. Dermed er adfærden forståelig, og styringen kræver ikke et samtidigt dodge-/kiting-system.

Auto bruger kun opdaget information til valg af destination. Kortets skjulte layout bruges til validering af level-data, ikke til at lade helten vide, hvor en skjult kiste står.

### 4.3 Robust navigation

- Logisk tile-grid med firevejsruter og jævn bevægelse mellem felternes centre. Det holder hjørner og smalle passager håndterbare.
- Ruter beregnes gennem gangbare felter; målet er en fri angrebs-/interaktionsposition ved siden af objektet.
- Tile-kollision og aktørens fodaftryk gælder også, når figurer skubber sig fri af hinanden. Eksisterende crowd-separation må ikke skubbe nogen ind i en væg.
- Aktører bruger enkel lokal kø-/vigeadfærd og reserverer deres næste bevægelsesfelt. Vi begynder med brede korridorer, så vi kan holde systemet lille.
- En flyttende modstander eller blokeret rute udløser genberegning ved behov, ikke en fuld søgning for hver figur i hvert render-frame.
- Registrér manglende fremgang. Efter en kort, konfigurerbar grænse genberegnes ruten; ved vedvarende fejl vælges et andet gyldigt mål og fejlårsagen logges til QA.
- Sidste udvej er en kontrolleret tilbagevenden til floor-indgangen med recovery og ny run. Spillet skal ikke sidde permanent fast. Denne vej tæller som en QA-fejl, ikke som en accepteret navigationsløsning.

## 5. Kamp, loot og floor-regler

### 5.1 Kamp i rum og korridorer

Melee, damage reduction, Power Strike, Heal og de eksisterende kontakt-timinger genbruges. Fjender placeres i encounters ved besøg-start og genopfyldes ikke løbende i ryddede rum.

Fjender bliver aktive gennem en konfigureret lokal aggro-radius og fri synslinje. De forfølger inden for deres rum og nærmeste forbindelseszone. De må ikke trække hele dungeon med sig. Ved opgivet forfølgelse går de tilbage til spawn; sårede, levende fjender nulstilles først, når den lokale kamp er afsluttet. Døde fjender genskabes først i en ny run.

Angreb kontrollerer range og vægge ved det faktiske hit. Et gammelt target-ID giver ikke ret til at ramme gennem en væg eller på tværs af et rum. Et ugyldigt hit giver ingen skade; en påbegyndt abilities cooldown refunderes ikke.

Der er ingen ny automatisk regeneration. Heal følger fortsat sin cooldown og meningsfulde brug, også mellem kampe. Mere tid til Heal under rejse kan ændre balancen markant og skal måles.

### 5.2 Loot

- Fjendens gold afregnes én gang ved kill, som nu. En mønt-effekt kan vise opsamlingen; den skaber ikke et ekstra gold-beløb.
- Kister åbnes automatisk ved nærhed, når der ikke er lokal kamp. De giver gold, ikke inventory eller udstyr i første version.
- Hver fjende og kiste har et stabilt ID i det aktive besøg. En allerede afregnet reward må ikke kunne udløses igen ved reload eller gentaget input.
- Kisteåbning og ændring af gold gemmes som én samlet tilstand.
- Alle kister kan findes og åbnes af Auto. Der er ingen tidsbegrænsede klik-rewards.

### 5.3 Clear, gentagelse og progression

Et floor er gennemført, når alle dets kamprum er ryddet, alle kister er åbnet og en eventuel boss er besejret. Der kræves ikke besøg på hvert enkelt gulvfelt. Sidegrene er alternative rutevalg; sidekampe er en del af clear-kravet i denne første version.

Trappen viser tydeligt, hvad der mangler. At finde trappen tidligt springer ikke resten af flooren over. Clear-reward og unlock afregnes én gang pr. besøg; første-sejrs-unlocks afregnes én gang permanent.

To progressionstilstande vises i floor-panelet:

| Indstilling | Efter clear |
|---|---|
| Fortsæt fremad — standard for nye spil | Gå til næste oplåste floor; ved sidste producerede floor gentages dette floor |
| Gentag dette floor | Start en frisk run på det valgte tilgængelige floor |

Et nyt besøg nulstiller fjender, kister og run-clear, men beholder gold, upgrades, unlocks og kortkendskab til et uændret layout. Hero-HP og cooldowns føres videre mellem normale floors og gentagelser. Rejse eller genstart er ikke en gratis heal.

Skift til et andet tilgængeligt floor kan ske uden for lokal kamp og starter et nyt besøg. Under kamp vises i stedet en tydelig retreat-handling, der afslutter besøget og bruger recovery-tiden. Der kan ikke teleportereres frem og tilbage for at undgå et indkommende hit.

### 5.4 Død og automatisk tilbagefald

Ved død beholder spilleren optjent gold, upgrades og permanente unlocks. Recovery-upgraden bestemmer ventetiden, hvorefter helten starter ved indgangen med fuldt HP og en frisk run. Fjender, kister og run-clear nulstilles; allerede opdaget kortgeometri kan fortsat ses dæmpet. Vi gemmer ikke en halvdræbt boss mellem forsøg.

Efter to mislykkede runs i træk på samme floor går helten automatisk over til at gentage det højeste tidligere gennemførte, lavere floor. Hvis der ikke findes et, vælges Floor 1. Dette er et første tuningvalg, ikke en målt optimal grænse.

Spilleren ser eksempelvis `Floor 3 var for svært · Farmer Floor 2`. Farming fortsætter, indtil spilleren vælger at forsøge fremad igen; vi sender ikke automatisk helten tilbage i den samme nederlagsserie. Floor 1 skal give et nyt startbuild reel indtjening, også hvis helten dør før clear. Langtidsprøven skal vise positiv progression uden manuel redning.

## 6. Boss og de første fire floors

Den eksisterende struktur genbruges som progression:

| Floor | Formål i pivotet |
|---|---|
| 1 — Dungeon I | Introducer rute, sidegren, auto-loot og midlertidige ordrer |
| 2 — Dungeon II | Ny håndbygget rute, flere encounters og større krav til build |
| 3 — Dungeon III | Afsluttende rum med Goblin King; hans sejr er del af floor-clear |
| 4 — Moss Crypt | Første floor i næste område med et selvstændigt modulært kryptmiljø |

Nye spil låser floors op sekventielt. Eksisterende saves beholder allerede tilgængeligt indhold gennem migrationen nedenfor.

Goblin King flyttes ind i et særligt slutrum på Floor 3. Auto gennemfører først de almindelige rum og starter derefter forsøget ved bossindgangen. Status varsler overgangen kort uden at kræve et klik. Boss-panelet beskriver og viser denne kamp; det starter ikke længere en separat kamp fra ethvert floor.

Første udgave bevarer 90-sekunders forsøg, fuldt hero-/boss-HP og nulstillede ability-cooldowns ved selve forsøgsstart. Det er et eksplicit boss-checkpoint, én gang pr. run, ikke en generel dør-healing. Build-køb og ability-skift er fortsat låst under forsøget.

Død, timeout, retreat og reload under forsøget afslutter det med recovery og ny run, som indgår i samme tæller for mislykkede runs. Et nyt forsøg kræver, at Floor 3 gennemløbes igen. Bossens tal skal derfor afprøves på ny; de gamle tal er startværdier.

Første sejr giver fortsat Slot II med både Power Strike og Heal samt adgang til Moss Crypt. En gentagen Floor 3-run kan have bosskampen igen og give en almindelig gold-reward, men aldrig gentage Slot II-unlock. Sejrsvisningen må ikke holde Auto fast i et modalvindue: den afvikles og fortsætter efter den valgte progressionstilstand.

## 7. Grafik, kamera, kort og UI

### 7.1 Samme visuelle identitet i en større verden

Bevar den mørke violette sten, varme fakler, kompakte knight, skeletter, orange sværdeffekter og det tætte portrait-UI. Et større world-kort må ikke betyde, at hele flooren zoomes ud, så figurerne bliver ulæselige.

Begynd med et 16 × 16 art-pixel miljøgrid som allerede foreslået i asset-manifestet. Den eksisterende hero-krop er cirka 26 art-pixels høj. Afprøv fysisk fodaftryk, rumstørrelse og mindst to tiles brede almindelige korridorer i et enkelt prøverum. Bossens indgang og kamprum skal have plads til hans større footprint. Endelige map-dimensioner fastlægges efter denne skalaprøve.

Modulære assets, der skal produceres og registreres som nye:

| Assetgruppe | Første behov |
|---|---|
| Dungeon-gulv | Mindst seks sammenhængende varianter uden synlige samlinger |
| Vægge | Nord/syd/øst/vest, indre/ydre hjørner, afslutninger og åbninger |
| Døre/portaler | Almindelig passage samt bossindgang; ingen nøglemekanik endnu |
| Trapper | Indgang/udgang med tydelig låst og åben status |
| Kiste | Lukket, åbning og åben; stabilt fodpunkt |
| Props | Fakler, søjler, tønder og murbrokker, med angivet kollisionsstatus |
| Navigation | Målmarkør, markeret fjende, kortsymboler og Auto/ordre-feedback |
| Moss Crypt | Gulv, vægge og områdeprops i eksisterende kryptstil |

Producer først et prøverum med hjørne, passage, kiste, helt og kamp. Det skal godkendes visuelt i gameplay, før alle varianter og kryptsættet færdiggøres. Midlertidige felter er egnede til navigationstests, men tæller ikke som færdig grafik. Nye bitmap-assets produceres med den eksisterende ImageGen-arbejdsgang, referencer, bevarede originaler og dokumenterede crops/pivots.

Eksisterende sideorientering/spejling bruges i den første mekaniske prøve. Op-/nedadgående gang er et konkret visuelt kontrolpunkt. Hvis figurerne virker som om de glider sidelæns, tilføjes konsistente op-/nedadgående walk-clips før den visuelle leverance er færdig; et fuldt otte-retningssystem er fortsat uden for scope.

### 7.2 Kamera og synlighed

- Kameraet følger heroens position med en rolig dødzone og holder sig inden for kortets grænser.
- Pixel-skalaen bevares; kameraets renderposition afrundes, så bevægelse ikke giver flimrende pixelkanter.
- Udforsket område og aktuelt synsfelt er adskilt. Ukendt er skjult, kendt uden for synsfeltet er dæmpet.
- Første synsfelt bruger tile-afstand og vægblokeret syn. Det genberegnes ved relevante tile-/dørændringer.
- Fjender, loot og effekter bag vægge må ikke afsløres af deres HP-bjælker, lys eller labels.
- Væggenes forgrund og props sorteres, så de kan give dybde uden at skjule helten permanent.
- Desktop og mobil viser samme portrait-spil; UI, ikke world-kameraet, styrer HUD-positioner.

### 7.3 UI og input

Bevar HUD, abilities og upgrades. Tilføj en kompakt linje med aktivitet og clear-status, fx `Udforsker · 3/4 kamprum`, samt Auto-knap og et lille kort, der kan åbnes større. Kortet viser opdagede rum, forbindelser, helt, kister og kendt trappe.

Kortet kan give destinationer i allerede kendte rum. Panorering på det åbne kort må ikke blive til en bevægelsesordre. I selve world-visningen følger kameraet helten; fri kamera-pan er ikke nødvendig i første version.

Tryk oversættes gennem kameraets aktuelle scroll og skala til world-koordinater. Fjende/kiste rammes før gulvet under dem. Touch-områder er mindst 44 × 44 CSS-pixels, også når symbolet er mindre. UI-klik må aldrig gå igennem til gulvet. Tilføj fokusérbare HTML-kontroller for Auto, floor-indstillinger og kendte rum/mål, så centrale valg også kan betjenes med tastatur uden et joystick-system.

Spillets eksisterende UI-sprog er engelsk; eksemplerne her forklarer reglerne på dansk. Implementeringen skal bruge ét konsekvent UI-sprog.

### 7.4 Opdatering af den visuelle specifikation

Pivotet ændrer bevidst reglerne om fast arena, fast kamera og fravær af pathfinding i `visual.md`, særligt afsnit 4.3 og 7.2. Ved implementeringsstart tilføjes et tydeligt afsnit om den nye dungeon-komposition, så fremtidigt arbejde ikke følger modstridende krav. Palette, spriteskala, materialer, VFX og mobile proportioner består.

## 8. Teknisk opdeling

Hold løsningen lille og modulær. Følgende er foreslåede ansvarsområder, ikke et krav om et stort generisk framework:

| Fil/område | Ansvar |
|---|---|
| `src/game/dungeon/types.ts` | Definitioner for tiles, rum, forbindelser, spawns, interaktioner og aktiv run |
| `src/game/dungeon/layouts.ts` | Håndbyggede layouts og validering af indgang, trappe og tilgængelige mål |
| `src/game/dungeon/navigation.ts` | Grid-ruter, footprint, kollision og bevægelsesreservationer |
| `src/game/dungeon/exploration.ts` | Opdaget område, synsfelt og udforskningsmål |
| `src/game/dungeon/brain.ts` | Auto-prioriteter, spillerordrer og håndtering af ugyldige mål |
| `src/game/dungeon/run.ts` | Encounters, loot, clear, gentagelse, død, bossforløb og floor-overgang |
| `src/game/simulation.ts` | Fast tidsskridt og eksisterende kampregler, koordineret med dungeon-modulerne |
| `src/game/dungeon/render.ts` | Miljølag, fog, kortgrundlag og world-markører, brugt af Phaser-scenen |
| `src/game/createGame.ts` | Scene-livscyklus, kamera, actor/VFX-visning og dispatch af input |
| `src/game/types.ts`, `save.ts`, `ui.ts` | Snapshot/controller-kontrakt, save v3 og spillerens kontroller |

Skeln mellem fire forskellige slags tilstand: permanent progression, aktiv run, aktuelt encounter og midlertidig spillerordre. En stor enkelt `mode`-enum med alle kombinationer af farming, boss, manuel styring og overgang vil blive svær at holde korrekt.

Fælles regler:

- Simulationen ejer positioner, fjende-HP, kisteindhold, gold, clear og unlocks.
- UI sender kommandoer; det ændrer ikke dungeon-data direkte.
- Renderer viser tilstand og events; en animationscallback må aldrig udbetale loot eller flytte til næste floor.
- Samme startdata, seed og tidsstemplede kommandoer skal give samme gameplay-resultat.
- Hver floor-definition har et layout-ID og en revision; hver run har sit eget ID og stabile entity-ID'er.
- Objekter uden for kameraet kan simuleres efter deres gameplay-behov, mens deres sprites og VFX begrænses til relevante områder. Der kræves ikke en tung streamingmotor til fire små floors.

## 9. Saves og eksisterende spillere

### 9.1 Save v3

Den nye save skal indeholde:

- Gold, upgrade levels, abilities, Slot II/boss-unlock, tilgængelige og gennemførte floors.
- Aktivt floor, layout-ID/revision, run-ID, seed og eventuel tilfældighedstilstand.
- Hero-position, HP, cooldowns, respawn og kampdata, der kræves for korrekt fortsættelse.
- Fjendernes tilstand, fjende-ID'er, åbnede kister, encounter-clear og afregnede run-rewards.
- Opdagede felter/rum; aktuelt synsfelt kan beregnes igen.
- Gentag/fremad-indstilling, nederlagstæller og en gyldig midlertidig ordre.

Ved normal reload fortsættes samme besøg. Fjender genskabes ikke med friske rewards, og helten får ikke en gratis heal. Igangværende angrebsdata som target, timer og allerede leveret hit skal enten gemmes tilstrækkeligt til nøjagtig fortsættelse eller normaliseres efter én testet regel uden ekstra hit. Første implementering vælger at gemme de nødvendige kampdata; ruter genberegnes fra positionerne.

Boss-reload bevarer den nuværende særlige retreat-regel. Clear og floor-overgang skrives samlet, så afbrydelse ved trappen ikke kan give to rewards eller springe unlock over.

Bevar den nuværende periodiske save og save ved skjulning/lukning. Gem også umiddelbart ved kister, clear, rejse, upgrades og unlocks. En pludselig browserlukning kan fortsat miste det seneste interval; vi lover ikke servergaranterede transaktioner.

### 9.2 Migration fra v1/v2

1. Valider den gamle save med versionsspecifikke regler.
2. Bevar gold, levels, ability-valg, hero-HP, cooldowns, recovery og `bossDefeated`.
3. Bevar adgang til Floors 1–3 for eksisterende spillere, da disse allerede var frit tilgængelige. `bossDefeated` bevarer desuden Slot II og Floor 4.
4. Start et nyt dungeon-besøg på det tidligere valgte tilgængelige floor, eller Floor 1 for v1. Den gamle arena havde ingen gemt dungeon-position eller rum-clear, der kan overføres.
5. Markér ikke alle tilgængelige floors som gennemført. Adgang og faktisk clear-historik er forskellige felter.
6. Brug som udgangspunkt gentagelse af det gemte floor for migrerede spillere, så opdateringen ikke sender dem fremad uventet.
7. Bevar originalen i en separat backupnøgle før første v3-write. Hvis backup eller skrivning fejler, bevares den gamle save, og UI viser fejlen.

En ukendt eller beskadiget save må fortsat ikke overskrives automatisk. Ved kendt v3-save med forældet layout-revision bevares permanent progression, mens den berørte run genskabes ved indgangen med bevaret hero-status; årsagen vises kort. Valider layout, entity-ID'er, positioner og clear/unlock-sammenhæng, ikke kun numeriske grænser.

Der gemmes én aktiv run i første version. Rejse væk fra et floor afslutter besøget. Samtidige faner og cloud-sync udvides ikke i dette pivot.

## 10. Balance og idle-kvalitet

Et rum kan være flot, men stadig være for langsomt eller uinteressant. Vi skal måle hele besøget inklusive gang, loot, kamp og recovery.

Første afprøvningsmål — ikke løfter eller allerede målte værdier:

| Måling | Første mål |
|---|---|
| Clear-tid på et passende normal-floor | Cirka 2–4 minutter |
| Rejsetid uden kamp | Højst cirka 25–30 % af run-tiden |
| Typisk encounter | 2–4 skeletter; undgå at alle rum aktiveres samtidig |
| Fordeling af gold | Start omkring 80 % fra kills og 20 % fra kister/clear; tilpas efter målinger |
| Auto uden input | Kan gennemføre alle mål med et passende build og fortsætte indtjening ved nederlag |
| Aktiv styring | Samme hastighed, skade, loot og synsregler som Auto; fordel kommer fra prioritering |

Den nuværende bevægelseshastighed er tunet til én lille arena. Den kopieres ikke ukritisk til et større floor. Justér ruteafstande og hastighed sammen; undgå lange tomme korridorer og kunstige ventepauser.

Gold/min skal inkludere gang, kisteåbning, bossforsøg og dødstid. Ved siden af den rullende måling er gennemsnit over færdige runs nyttigt, fordi en stor kiste-reward ellers kan få et floor til kortvarigt at se bedre ud end det er.

Afprøv mindst et friskt startbuild, et offensivt build, et Heal/HP/DEF-build, et build ved bossgrænsen og et eksisterende stærkt save. Sammenlign fuld Auto med et enkelt reproducerbart forløb af spillerordrer. Hvis manuel styring bliver nødvendig for almindelig progression, skal Auto eller encounter-designet rettes.

## 11. Implementering i otte etaper

Etaperne bygges i rækkefølge. Hver etape har et afprøveligt resultat; generering og ekstra indhold kommer efter en fungerende kerne.

| Etape | Konkret arbejde | Færdig når |
|---|---|---|
| 1. Designgrundlag og baseline | Opdatér plan/visuelle undtagelser; registrér eksisterende build/tests, gem v1/v2-fixtures og baseline-balance; lav isoleret `codex/`-branch | De valgte regler for styring, clear, død, boss og migration kan implementeres uden modstridende dokumenter |
| 2. Et navigerbart floor | Syvrums-layout, grid, validering, kollision, pathfinding, destinationsinput og kamerafølge med midlertidigt miljø | Helten når alle rum, kan vende i passager og går aldrig gennem vægge; mobiltryk rammer korrekt world-position |
| 3. Automatisk udforskning og kamp | Brain, fog/syn, lokal aggro, target-håndtering og vægkontrol ved hit | Helten udforsker og rydder samtlige encounters uden input; en spillerordre udføres og Auto genoptages |
| 4. En komplet gentagelig run | Kister, clear, trappe, repeat/fremad, død/recovery og fallback | En run kan begynde, cleares, belønnes og gentages; død kræver ingen manuel hjælp |
| 5. Saves og rigtig UI | Save v3/migration, kort, Auto/status, floor-indstillinger og tilgængelige kontroller | Reload i gang, kamp, loot og overgang virker; gamle saves bevarer progression; flowet kan forstås uden debug-UI |
| 6. Færdigt visuelt første floor | Modulært dungeon-sæt, kiste/trappe, props, lys, depth, markører og nødvendig retningsanimation | Første floor matcher art direction i screenshots og bevægelse på mobil/desktop; ingen midlertidige miljøfelter |
| 7. Fire floors og boss | Yderligere håndbyggede layouts, Goblin King på Floor 3, Slot II og modulær Moss Crypt | Samlet forløb fra nyt spil til boss, unlock og krypt fungerer automatisk og ved indgriben |
| 8. Balance, langtidsprøve og udgivelse | Mål rejse/kamp/gold, ret observerede fastlåsninger, kør regression og browserverifikation, opdatér README/QA/manifest og udgiv via projektets eksisterende deployment | Acceptlisten nedenfor er opfyldt, kendte begrænsninger er dokumenteret, og den udgivne version er kontrolleret |

Første store beslutningspunkt ligger efter etape 4: Er det tilfredsstillende at følge helten, og giver det mening at gribe ind? Hvis nej, ændres rute, tempo og kontrol på dette ene floor, før vi udvider indholdet. Etape 1–4 er en intern spilbar prøve; etape 1–8 er det samlede første pivot.

Etape 2–3 og miljøproduktionen er de største usikkerheder. Et troværdigt kalenderestimat kræver, at navigations- og skalaprøven er afprøvet. Vi planlægger derfor efter disse leverancer frem for at love en dato før den første prøve.

## 12. Verifikation og accept

### Automatiske tests

- Layoutets indgang, alle encounters, kister og trappe er tilgængelige med relevante footprints. Ingen spawns i vægge.
- Ruter og crowd-separation respekterer vægge, døråbninger og andre aktører. Tilgængelige alternative mål vælges ved blokering.
- Target-prioritet og Auto-genoptagelse virker ved nye ordrer, dødt mål, åbnet kiste og ugyldigt input.
- Fog afslører ikke loot/fjender bag vægge; Auto får ikke skjult viden.
- Angreb leverer højst ét hit, og intet hit går gennem vægge. Eksisterende Heal-, cooldown-, DEF- og upgrade-regler bevares, hvor designet ikke ændrer dem.
- Hvert kill, hver kiste, clear og første boss-unlock afregnes korrekt én gang i den relevante run/permanente progression.
- Død, retreat, fallback, gentagelse, floor-skift og boss-timeout kan ikke holde simulationen fast eller give utilsigtet gratis healing.
- Save roundtrip ved navigation, midt i angreb, efter kiste, under recovery og ved trappe. v1/v2-migration, boss-reload, ukendt version, korruption og storage-fejl dækkes.

De nuværende tests for fast arena, seks genopfyldte aktører og valgbare floors revideres bevidst til de nye regler. Vi bevarer relevante regressionstests; det er ikke et mål at tvinge den nye dungeon til at ligne den gamle arena.

### Browser og simulation over tid

- Afprøv 360 × 640, 360 × 796, 390 × 844 og bred desktop; ingen vandret scroll, strakte tiles, skjulte knapper eller input gennem paneler.
- Kontrollér kamera, vægoverlap, retningsskift, fog, effekter og kiste/trappe-animation i bevægelse, inklusive reduced motion.
- Gennemfør hele forløbet: nyt spil → auto-rum → manuel ordre → Auto igen → loot → clear → næste floor → død → recovery → fallback → upgrade → nyt forsøg → boss → Slot II → krypt.
- Lad et passende build gentage hver normal-floor mindst 20 gange i den rene simulation. Test flere seeds, når randomisering introduceres.
- Kør mindst 30 minutters synlig browser-session med fuld Auto og passende build; ingen uforklaret stilstand, dubleret reward eller voksende ophobning af sprites/listeners.
- Afprøv startbuild og for svært floor separat: indtjening og fallback skal virke, ikke nødvendigvis clear på et underdimensioneret build.
- Kontrollér pause, skjult fane, reload, viewport-resize og storage-fejl. Lukket/suspenderet browser må ikke udløse opdigtede offline rewards.
- Brug `npm test`, `npm run build` og opdaterede balance-/browser-scripts, når implementationen findes. Ydelse måles på konkrete testmiljøer; en desktop-mobilviewport dokumenterer layout, ikke ydelse på en rigtig telefon.

Pivotet er færdigt, når fire floors inklusive boss og krypt fungerer som sammenhængende, automatisk udforskede dungeons, spilleren kan styre med midlertidige ordrer, og saves, økonomi og grafik holder til det samlede forløb. En navigationsdemo alene opfylder ikke planen.

## 13. Senere udvidelser

Efter det første afprøvede pivot kan vi tilføje:

1. Seed-baseret variation ved at forbinde godkendte rumskabeloner, med automatisk connectivity-/clear-validering og stabilt layout ved reload.
2. Flere fjendetyper og rumroller, derefter flere abilities.
3. Direkte WASD-/joystick-styring med tydeligt skift til og fra Auto, hvis aktiv bevægelse giver værdi.
4. Valgfri auto-præferencer som boss-first eller ekstra grundig udforskning, når grundadfærden allerede fungerer.
5. Offline rewards baseret på observeret farming-effektivitet, med egen økonomi- og save-specifikation.
6. Gear, party, mastery og større områdesystemer efter den eksisterende progression er afprøvet i dungeon-formatet.

Første version omfatter ikke en stor sammenhængende oververden, hunger, permadeath, inventory management, procedurale labyrinter, nøgle-/gådesystemer eller krav om manuelle dodges. Det er bevidste scope-grænser, så hele idle-loopet kan blive færdigt.
