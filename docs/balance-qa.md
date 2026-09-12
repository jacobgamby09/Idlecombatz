# Første balanceprøve

Dato: 2026-09-12. Reproduktion: `npm run balance`. Implementering: `scripts/balance.mjs`; rå resultater: [balance-results.json](balance-results.json).

## Metode

Simulation ved 60 ticks/sekund, ti minutter pr. build, seeds 41, 7 og 123. Gold/min inkluderer respawn; manuel pause og offline-tid indgår ikke. Alle builds indenfor en budgetgruppe får samme gold-budget. Hele levels købes efter en fast strategi, så noget gold kan være tilbage. Tabellen viser faktisk forbrug; ubrugte penge giver ingen kampbonus.

Offense køber kun ATK og bruger Power Strike. Sustain skifter mellem HP og DEF og bruger Heal. Mixed skifter mellem ATK, HP og DEF og bruger Power Strike. De faste build-tests starter med fuldt HP efter fordelingen; en separat progressionstest starter med nul gold og køber løbende uden gratis healing. Dette er repræsentative strategier, ikke en udtømmende søgning efter det optimale build.

## Resultater

Gold/min og uptime er gennemsnit af tre runs. Dødsfald vises pr. seed.

| Build | Budget / brugt | ATK / HP / DEF levels | Gold/min | Uptime | Dødsfald på 10 min |
|---|---:|---|---:|---:|---|
| Baseline, Power Strike | 0 / 0 | 0 / 0 / 0 | 15,17 | 89,13 % | 13 / 13 / 13 |
| Baseline, Heal | 0 / 0 | 0 / 0 / 0 | 13,57 | 94,47 % | 7 / 7 / 6 |
| Offense | 60 / 59 | 6 / 0 / 0 | 26,50 | 93,87 % | 8 / 7 / 7 |
| Sustain | 60 / 55 | 0 / 4 / 4 | 14,90 | 100 % | 0 / 0 / 0 |
| Mixed | 60 / 55 | 3 / 3 / 2 | 22,73 | 94,98 % | 6 / 6 / 6 |
| Offense | 120 / 119 | 9 / 0 / 0 | 27,87 | 94,43 % | 7 / 6 / 7 |
| Sustain | 120 / 116 | 0 / 7 / 6 | 14,90 | 100 % | 0 / 0 / 0 |
| Mixed | 120 / 120 | 5 / 5 / 5 | 26,03 | 97,49 % | 3 / 4 / 3 |
| Offense | 240 / 216 | 12 / 0 / 0 | 29,30 | 94,43 % | 7 / 6 / 7 |
| Sustain | 240 / 226 | 0 / 10 / 9 | 14,90 | 100 % | 0 / 0 / 0 |
| Mixed | 240 / 223 | 8 / 7 / 7 | 29,27 | 98,33 % | 2 / 2 / 2 |

Sustain med fire HP- og fire DEF-levels blev også kørt i 30 minutter på alle tre seeds: ingen dødsfald, 14,73–14,87 gold/min og minimum 256,9–267,9 HP ud af 352. Heal kan levere 70,4 HP hver tiende sekund, altså højst 7,04 HP/sekund. Målt incoming damage var 4,75–5,16 HP/sekund, og Heal blev kun brugt ved tilstrækkeligt manglende HP. HP-bufferen håndterede de observerede dyk mellem casts. Det viser stabil sustain i de målte forløb; det er ikke et matematisk bevis for evig overlevelse i enhver positionering.

## De første ti minutter fra nul

Med seed 41 og løbende køb: første ATK-køb efter 22,28 sekunder, første HP-køb med Heal efter 23,80 sekunder. Offense foretog 13 køb, Sustain 14 og Mixed 22. Sustain døde én gang tidligt og havde samlet 99,16 % uptime; Offense døde otte gange og havde 93,31 %. Køb af HP fylder ikke heroens liv op i disse forløb.

DEF koster 4 gold ved første køb og bliver derfor tilgængelig før de to ovenstående køb. Pacing-målet på 20–45 sekunder beskriver første ATK/HP-køb, ikke en minimumsventetid på enhver upgrade.

## Valgte ændringer og begrænsning

Startpriser og stat-trin fra implementeringsplanen er beholdt. Skeletternes basisangreb er ændret fra 4 til 6: ved 4 kunne Heal uden upgrades allerede overleve hele baseline-testen. Ved 6 kræver stabil sustain en investering, mens første køb stadig kan nås før første normale dødsfald. Attack-speed, Heal-procent, cooldowns og melee-logik er bevaret.

Et teknisk prototype-loft på 100 levels til ATK/HP/DEF og 15 til Recovery holder priser/stats endelige. Gold har et loft på 10^12. Disse grænser er langt udenfor den korte spiltest.

Offense giver mest gold på dette ene floor, men dominerer ikke samtidig overlevelsen. Mixed nærmer sig samme indtjening ved højere budget med færre dødsfald. En ren defensiv investering efter opnået stabil sustain giver ikke mere gold her; incitamentet til at flytte op på sværere floors skal afprøves i næste leverance. Recovery er dækket af kamp-/købstests, men denne rapport optimerer ikke builds med Recovery.
