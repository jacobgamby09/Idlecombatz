# IdleCombatz

Et mobilorienteret idle dungeon-RPG med automatisk udforskning, realtidskamp, gold og permanente upgrades. [Spil i browseren](https://idlecombatz.vercel.app).

Helten bevæger sig gennem rum og korridorer, bekæmper lokale fjender, åbner kister og finder trappen videre. Tryk på gulvet, en fjende eller en kiste for at give en midlertidig ordre. Når ordren er udført, fortsætter Auto selv. Kortet giver også adgang til at vælge et opdaget rum med mus, touch eller tastatur.

## Spilforløb

- Fire floors med syv rum hver, en hovedrute og to sidegrene. Vægge, navigation, kamera og synsfelt er en del af gameplayet.
- Et besøg indeholder et fast sæt fjender og kister. Clear kræver alle kamprum, begge kister og en eventuel boss; ryddede rum genopfyldes først i næste besøg.
- Vælg **Continue forward** eller **Repeat this floor** under floor-indstillingerne. Nye spil låser floors op i rækkefølge.
- Død beholder gold/upgrades og starter efter recovery et nyt besøg. To mislykkede besøg på samme floor skifter automatisk til farming på et tidligere gennemført floor, eller Floor 1.
- Goblin King venter i slutrummet på Floor 3. Auto starter hans 90-sekunders forsøg efter almindelige rum og loot. Første sejr åbner Slot II og Moss Crypt.
- Power Strike, Heal, ATK, HP, DEF og Recovery bygger videre på den oprindelige kampmodel. Ingen ny automatisk regeneration; almindelig rejse healer ikke.

## Kør lokalt

TypeScript, Phaser og Vite:

```powershell
npm install
npm run dev
npm test
npm run build
npm run balance
```

Åbn den lokale adresse, Vite viser. `npm test` dækker kamp, progression, dungeon-navigation, loot, 20 gentagelser pr. floor, bossforløb og saves. Balance-scriptet sammenligner fire builds over ti minutter på hvert start-floor, inklusive eventuelt automatisk tilbagefald.

## Gemte spil

Save v3 gemmer permanent progression og det aktive besøg: positioner, kampdata, udforskning, fjender, kister og ordrer. Normal reload fortsætter besøget. Reload under en bosskamp afslutter forsøget med recovery.

Gamle v1/v2-saves migreres med gold, levels, abilities, hero-status og eksisterende floor-adgang bevaret. Originalen sikkerhedskopieres under `idlecombatz.save.pre-dungeon`, før den nye save skrives. Ukendte eller beskadigede saves overskrives ikke automatisk. Settings indeholder Start over med bekræftelse.

Save-fejl vises i spillet. Der er fortsat ingen offline rewards, cloud-sync eller sammenfletning af samtidige browserfaner. Faner, der er skjulte eller suspenderede, avancerer ikke simulationen.

## Plan, grafik og kontrol

- [Dungeon-pivot-plan](docs/dungeon-pivot-plan.md) — designregler, scope, migration og implementeringsetaper.
- [Dungeon-QA](docs/dungeon-qa.md) — aktuelle resultater, balance og kendte afgrænsninger.
- [Balance-data](docs/dungeon-balance-results.json) — reproducerbare målinger; `npm run balance` opdaterer filen.
- [Visuel specifikation](visual.md) — Modern Pixel-stilen og den nye dungeon-komposition.
- [Asset-manifest](asset-manifest.md) og [dungeon-prompts](art-prompts/dungeon-pivot.md) — faktiske assets, referencekilder og eksport.
- [Oprindelig projektplan](PLAN.md), [arena-QA](docs/farming-qa.md) og [tidligere boss-QA](docs/boss-qa.md) — leverancehistorik.

`src/game/simulation.ts` ejer spillets regler. `src/game/dungeon/` indeholder layout, navigation/synlighed og miljøvisning; Phaser og HTML-UI viser simulationen og sender spillerkommandoer. Kortene er håndbyggede varianter. Procedurelle layouts, direkte WASD/joystick, party, gear, mastery og lyd følger senere.
