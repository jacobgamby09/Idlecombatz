# Implementeringsplan: upgrades, save og første balanceprøve

Dato: 2026-09-12. Status: Implementeret og kontrolleret lokalt. Resultater findes i [farming-QA](farming-qa.md) og [balancerapporten](balance-qa.md). Nedenstående bevarer implementeringsgrundlaget; de faktiske balanceændringer er dokumenteret i rapporten.

## Mål og afgrænsning

Spilleren skal kunne åbne spillet, farme gold, købe en forbedring, se dens effekt i kampen og fortsætte med sin progression efter genindlæsning. Vi skal kunne sammenligne et offensivt build med et sustain-build over tid, inklusive dødstid.

Leverancen omfatter én arena, de eksisterende enemies, ét ability slot med Power Strike eller Heal, fire upgrade-typer og lokal save. Den følger [visual.md](../visual.md) og genbruger den nuværende grafik. Kampen fortsætter automatisk, mens upgrades er åbne.

Floors, boss, andet ability slot, gear, mastery, party, trigger-editor og offline rewards følger senere. Lyd og dedikerede hurt-/death-clips er fortsat punkter i den overordnede milepæl; denne leverance afslutter ikke automatisk hele dens acceptliste.

## Udgangspunkt i koden

- `src/game/simulation.ts` ejer kamp, gold, cooldowns, death og respawn. Stats ligger endnu som faste værdier i `DEMO`.
- `src/game/createGame.ts` forbinder simulationen med Phaser og eksponerer en lille controller.
- `src/ui.ts` har allerede Hero- og Skills-paneler. Upgrades er en placeholder, og UI'et har egne kopier af controller-/ability-typerne.
- `src/main.ts` starter altid en ny session. Der findes endnu intet save-modul.
- Syv simulationstests dækker de eksisterende regler og melee-fejlen. De skal fortsat passere.

## 1. Saml regler, progression og fælles typer

Flyt kampens og økonomiens justerbare værdier til `src/game/balance.ts`. Bevar de nuværende kampværdier som baseline, og adskil enemy-stats fra heroens afledte stats.

Opret `src/game/progression.ts` med upgrade-definitioner, levels, prisberegning og afledning af hero-stats. Gold og upgrade-levels skal have én ejer i spiltilstanden; UI og save læser den samme tilstand. Gem levels, og beregn stats ud fra dem, så balanceændringer ikke efterlader gamle, duplikerede stat-værdier.

Saml `Ability`, `UpgradeId`, snapshot- og controller-kontrakter i `src/game/types.ts`. UI'et skal kunne hente aktuelle stats, valgt ability, gold, cooldowns, respawn-status samt næste pris/effekt for hver upgrade uden selv at beregne kampregler.

Der bygges videre på den eksisterende actor-samling. Denne opgave kræver hverken en ny engine eller et fuldt party-system.

**Færdig når:** Kampen opfører sig som før med nul upgrades, og simulation og UI bruger samme definition af værdier og typer.

## 2. Implementér køb og effekten i den levende kamp

Første balanceudkast, som justeres i trin 5:

| Upgrade | Startværdi | Effekt pr. level | Første pris | Prisvækst |
|---|---:|---:|---:|---:|
| ATK | 24 | +4 ATK | 6 gold | ×1,18 |
| Max HP | 224 | +32 Max HP | 6 gold | ×1,18 |
| DEF | 12 | +8 DEF | 4 gold | ×1,18 |
| Respawn | 5 sekunder | −0,2 sekunder, minimum 2 sekunder | 8 gold | ×1,25 |

Næste pris er `ceil(startpris × prisvækst^nuværendeLevel)`. Der købes ét level pr. tryk. Respawn har 15 levels og viser derefter Max. ATK, HP og DEF kan købes gentagne gange; beregninger skal afvise værdier udenfor den understøttede, endelige talgrænse fremfor at tillade overflow.

Køb går gennem én synkron `buyUpgrade(id)`-handling. Den kontrollerer type, loft og aktuel saldo, trækker den præcise pris og øger level samlet. Et mislykket køb ændrer intet. Hurtige gentagne tryk må aldrig bruge en gammel pris eller skabe negativ gold. Resultatet fortæller UI'et, om købet lykkedes og hvorfor det eventuelt blev afvist.

Regler ved køb:

- ATK påvirker basic attacks og Power Strike. Et allerede påbegyndt angreb beholder den skade, der blev fastlagt ved angrebets start; næste angreb bruger den nye værdi.
- HP-upgrades øger Max HP, men giver ikke en øjeblikkelig heal. Eksempel: `100/224 → 100/256`. Det fremgår af upgrade-beskrivelsen. Heal og næste respawn bruger den nye Max HP.
- DEF anvender den nuværende formel: `incomingDamage × 100 / (100 + DEF)`. UI'et viser også den afledte skadereduktion, så +DEF kan forstås konkret.
- Respawn-køb påvirker næste dødsfald. En igangværende nedtælling afsluttes som allerede planlagt.
- Køb er tilladt under kamp, pause og respawn. Et køb nulstiller hverken arena, cooldowns eller dødstid.
- Power Strike beholder sin nuværende multiplikator og cooldown. Heal beholder 20 % af Max HP, sin cooldown og sin nyttige standardtrigger.

ATK giver fortsat indirekte overlevelse gennem hurtigere kills. Det indgår i balancemålingen. Der tilføjes ingen healing fra ATK, kills eller generel regeneration. Et sustain-build må gerne opnå permanent overlevelse på den første arena.

**Færdig når:** Alle fire køb ændrer den rigtige spilregel med det samme eller på det klart angivne næste kamp-event, og pris/effekt i UI matcher simulationen.

## 3. Gør Upgrades og Hero brugbare på mobil

Erstat Upgrades-placeholderen med fire kompakte rækker. Hver række viser navn, level, nuværende værdi, næste værdi, pris og købsknap. Eksempel: `ATK 24 → 28 · 6 gold`. Vis Max for en afsluttet respawn-upgrade og en tydelig tilstand, når gold ikke rækker.

Panelet får en mobilhøjde, hvor selve kampen stadig kan aflæses. På korte skærme scroller indholdet inde i panelet. Vi skal især undgå, at det eksisterende overlay dækker heroen, når spilleren køber; om nødvendigt får Upgrades plads i den nederste del af layoutet med arenaen tilpasset ovenover.

Opdater værdier og knaptilstande uden at genopbygge hele panelets DOM ved hvert UI-tick. Det bevarer scrollposition, tastaturfokus og stabilitet under gentagne køb. Brug den nuværende pixelgrafik, mørke rammer og varme gold-accenter. Touchområder er mindst 44 × 44 pixels.

Hero-panelet viser reel ATK, Max HP, DEF/skadereduktion og respawn-tid. Skills forklarer effekten af den valgte ability med aktuelle værdier. Valgt ability kommer fra spiltilstanden, også ved opstart fra save.

Et vellykket køb giver en kort visuel kvittering og opdaterer HUD/stat-preview. Spillets tekst ændres fra Visual Study til farming-prototype, og beskrivelser om manglende køb/save fjernes, når funktionerne faktisk virker.

**Færdig når:** Spilleren kan se prisen, købe, forstå ændringen og følge kampen på 360 × 640 og 390 × 844 uden utilsigtet scroll eller mistet fokus.

## 4. Tilføj lokal save og entydig reset-adfærd

Opret `src/game/save.ts` med versionsmærket format og indlæsning før første UI-snapshot. Brug lokal browser-storage på det aktuelle domæne; progression synkroniseres ikke mellem enheder eller mellem localhost og den offentlige side.

Save indeholder gold, upgrade-levels og valgt ability. Gem desuden heroens aktuelle HP, begge ability-cooldowns og eventuel resterende respawn-tid, så genindlæsning ikke bliver en gratis fuld heal eller nulstilling af respawn. Ved indlæsning skabes et nyt encounter med friske enemies og bevaret hero-status. Positioner, enemies, partikler og igangværende angreb genskabes ikke frame for frame.

Der uddeles ingen offline gold, healing eller cooldown-fremskridt. Tiden udenfor spillet tælles heller ikke som aktiv spiltesttid. En gemt død hero fortsætter sin resterende respawn-tid ved genåbning.

Gem straks efter køb og ability-skift, periodisk ved ændringer (højst én gang pr. sekund), og ved `visibilitychange` til skjult samt `pagehide`. Gem den samlede tilstand i én post. Et pludseligt browsernedbrud kan miste ændringer siden sidste vellykkede save; køb og almindelig reload skal kontrolleres særskilt.

Indlæsning validerer version, typer, finite tal, lovlige levels, ability-id, HP og cooldown-/respawn-grænser. Manglende save giver en normal start. Beskadiget eller nyere, ukendt save må ikke få spillet til at crashe eller blive tavst overskrevet; bevar den oprindelige post og vis en kort besked med mulighed for en eksplicit ny start. Hvis storage ikke kan skrives, fortsætter spillet i hukommelsen med en tydelig besked om, at fremgangen ikke bliver gemt. Der bygges ikke cloud-sync eller sammenfletning mellem samtidige faner i denne leverance.

Reset opdeles klart:

- Det nuværende offentlige Reset scene fjernes som genvej til fuld heal. Den deterministiske nulstilling til visuel QA beholdes som udviklingsværktøj og må ikke skrive til en rigtig save.
- Settings får Start over med en bekræftelse inde i spillet, der forklarer, at gold og upgrades slettes. Først derefter nulstilles både session og lokal save.
- Pause og genoptagelse bevares. En ny sideindlæsning starter normalt som aktiv, med den indlæste progression.

**Færdig når:** Reload bevarer køb og ability-valg korrekt, død/reload ikke springer respawn over, og en bekræftet ny start også forbliver nulstillet efter endnu en reload.

## 5. Mål og justér progressionen

Lav et lille reproducerbart script i `scripts/` til at køre simulationen uden rendering. Sammenlign købte builds med samme samlede gold-budget og flere start-seeds. Et eventuelt seed-input er til test; normale sessioner bruger den valgte standard.

Mål kills, optjent gold pr. aktivt minut, andel af tiden heroen lever, dødsfald og gennemsnitlig levetid. Respawn tæller med i den aktive måletid; manuel pause og baggrundstid gør ikke. Gem parametre og resultater i `docs/balance-qa.md` fremfor at tilføje en stor statistikflade til produktet nu.

Afprøv som minimum baseline, ATK-tungt Power Strike-build, HP/DEF-tungt Heal-build og et blandet build. Kør ti minutters sammenligninger, og forlæng sustain-prøven, hvis den ser stabil ud. Endelig observation kan vise stabil farming i et målt interval; den beviser ikke alene evig overlevelse. Kontrollér også heal pr. sekund mod incoming damage og de kortvarige HP-dyk mellem heals.

Foreløbige pacing-mål:

- Første køb kan normalt foretages efter cirka 20–45 sekunder fra en frisk start.
- De første 5–10 minutter giver flere mærkbare valg fremfor en lang ventetid på ét level.
- Offensive køb forbedrer kill-tempo; defensive køb forbedrer overlevelse eller uptime ved et sammenligneligt budget.
- Et eksempel på stabil Heal + HP/DEF-farming kan nås indenfor prototypens korte testsession.
- Der er et målt interval, hvor forsvar er et meningsfuldt alternativ til endnu et ATK-køb. Hvis ATK dominerer både indtjening og overlevelse ved alle afprøvede budgetter, justeres priser, stat-trin eller enemy-pres, og sammenligningen køres igen.

Priserne i trin 2 er startværdier. Vi tvinger ikke alle builds til samme gold/min, og vi straffer ikke et sustain-build for at kunne overleve permanent. Valg af mest effektivt farming-floor afprøves først med flere floors i næste leverance.

**Færdig når:** En kort rapport viser build-budgetter, resultater og de valgte balancejusteringer, suppleret med en faktisk spiltest af de første køb.

## 6. Verificér hele spillerforløbet og udgiv

Tilføj målrettede tests til de eksisterende syv:

- Prisvækst, level-loft, korrekt fratrækning, afviste køb og gentagne køb med begrænset saldo.
- ATK ved angrebsstart, HP-køb uden gratis heal, procentbaseret Heal efter HP-køb, DEF-formel og respawn-køb under dødstid.
- Save-rundtur, manglende/beskadiget/ukendt save, storage-fejl, ability-synkronisering og bevaret HP/cooldown/respawn uden offline rewards.
- Start over sletter progression, mens pause og udviklingsværktøjer ikke ødelægger en gemt session.

Kør `npm test` og `npm run build`. Bevar melee-regressionstests, så nye stats og ændringer i kampflow ikke genindfører pauserne.

Afprøv i browseren: frisk start → farm til første køb → åbn Upgrades med synlig kamp → køb → skift ability → dø → køb under respawn → respawn → reload → fortsæt med gemt progression. Afprøv også utilstrækkelig gold, hurtige tryk og Start over med både annullering og bekræftelse.

Kontrollér 360 × 640, 360 × 796, 390 × 844 og desktop samt fokus, Escape og browserfejl. Gem screenshots med åbent upgrade-panel og en kort bevægelsesprøve. Lokal mobil-emulering dokumenteres som sådan; fysisk iPhone-kontrol kræver en efterfølgende prøve på telefonen.

Opdater README og status i PLAN.md til det faktisk leverede. Commit og push de færdige ændringer til det eksisterende repository, følg den tilknyttede deployment, og verificér, at den offentlige side indeholder det nye build og kan gemme/genindlæse progression. Offentlig test med nulstilling må kun ske i testbrowserens egen lokale storage.

**Leverancen er færdig når:** Farm → køb → mærk forbedring → dø/respawn → reload fungerer samlet, de fire upgrades og save er testet, balanceprøven er dokumenteret, og det verificerede build er live.

## Arbejdsrækkefølge

1. Fælles regler/typer og køb i simulationen, med tests.
2. Upgrades-panel, aktuelle hero-stats og stabil mobilinteraktion.
3. Save/opstart og tydelig Start over-adfærd, med tests.
4. Målte build-sammenligninger og tuning af de første 5–10 minutter.
5. Samlet browserkontrol, dokumentation og udgivelse.

Efter denne leverance følger de tre farming-floors og første boss med andet ability slot som belønning, som beskrevet i [PLAN.md](../PLAN.md).
