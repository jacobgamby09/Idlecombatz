# Farming-leverance — kontrol

Dato: 2026-09-12. Upgrades, lokal save og den første balanceprøve er implementeret. Denne kontrol supplerer den historiske [visuelle QA](visual-qa.md).

## Verifikation

- `npm test`: 19 tests passerer. Kamp, melee-grænse, køb/priser/lofter, HP/DEF/ATK/respawn samt save-rundtur, validering og storage-fejl.
- `npm run build`: TypeScript og production-build passerer. Den kendte advarsel om Phaser-bundlets størrelse består.
- `npm run balance`: tre seeds og tre budgetter plus baseline og løbende progression. Se [balance-qa.md](balance-qa.md).
- Chromium via agent-browser: 360 × 640, 360 × 796, 390 × 844 og 1280 × 960. Upgrades har plads under en synlig arena. Canvas-proportioner og dokument-scroll er kontrolleret; ingen registrerede browserfejl.
- Faktiske UI-køb af ATK, HP og Recovery, opdatering af pris/stats/gold, utilstrækkelig gold og bevaret fokus. Skift til Heal og reload bevarer levels, gold og equipped ability.
- Normal kamp har passeret død og respawn. En kontrolleret død fixture afprøver køb under respawn: Recovery Lv. 1 gav 4,8 sekunders fremtidig respawn, mens den eksisterende nedtælling blev på 5 sekunder. Reload bevarede død hero og resterende tid.
- Start over er afprøvet gennem UI med både annullering og bekræftelse. Annullering bevarede pause og progression; bekræftelse nulstillede levels/gold/ability, også efter reload.
- Escape lukker panelet. En ukendt save-version gav en synlig fejlbesked og blev bevaret uden overskrivning; eksplicit Start over genoprettede saving.
- Udviklingsværktøjet `capturePowerStrike()` efterfulgt af pagehide ændrede ikke den rigtige save.

## Fund og rettelser

Phaser `ScaleManager.resize()` beholdt et gammelt aspect ratio under FIT-skalering. Når Upgrades-panelet reducerede kampfladen, blev figurerne derfor for smalle. Renderer bruger nu `setGameSize()` ved opstart og resize, som dokumenteret i den installerede Phaser-kilde. Målt forhold mellem canvas' interne og viste dimensioner stemmer efter panel-/viewport-skift.

På korte skærme var den fjerde upgrade delvist skjult. Panelet har nu plads til alle fire rækker, mens en synlig kampflade bevares ovenover. Købsknapper er mindst 44 pixels høje og brede.

## Evidens

- [Upgrades, 360 × 640](../artifacts/farming-upgrades-360.png)
- [Upgrades, 360 × 796](../artifacts/farming-upgrades-796.png)
- [Upgrades, 390 × 844](../artifacts/farming-upgrades-390.png)
- [Upgrades på desktop](../artifacts/farming-upgrades-desktop.png)
- [Bevægende combat under upgrade-forløbet](../artifacts/farming-loop.webm) — browserens canvas optaget med MediaRecorder; HTML-panelet indgår ikke i denne optagelse.

## Praktiske grænser

Mobilkontrollen er browser-emulering, ikke en fysisk iPhone-test. Saving er lokal pr. browser/domæne; der er ingen cross-device-sync, sammenfletning mellem faner eller offline fremgang. Et pludseligt nedbrud kan miste tiden siden sidste vellykkede save. Reload genskaber enemies og positioner, men bevarer heroens HP, cooldowns og eventuelle respawn-tid.

Næste gameplay-leverance er flere floors og boss. Lyd, særskilte hurt-/death-clips og de tidligere dokumenterede art-forbedringer er fortsat udestående.
