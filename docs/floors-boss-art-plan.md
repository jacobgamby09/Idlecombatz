# Art-plan: tre floors, første boss og næste dungeon

Dato: 2026-09-13. Status: Produktionsplan. Nye sprites og miljøer nedenfor er ikke produceret endnu.

## Dungeon følger område, ikke floor

Floor 1–3 bruger præcis den nuværende dungeon: samme gulv, vægge, fakler, props, palette og belysning. Floor-skift ændrer fjendernes stats/rewards og floor-nummer. Vi laver ikke et nyt baggrundsbillede eller en palette-variant for hvert floor.

Første boss kæmpes i dette samme miljø. Farming-enemies ryddes til forsøget, og bossens navn/HP vises tydeligt. Bosssejr åbner andet ability slot og første floor i område 2. Først ved indgangen til det nye område skifter dungeon-miljøet. Hvis spilleren vender tilbage til et tidligere floor, bruges det oprindelige miljø igen.

I data tilknyttes floors en `regionId`, og regionen vælger `environmentId`. Udseendet afhænger ikke af om en bestemt boss blot er besejret; det afhænger af det område, spilleren aktuelt farmer i. Scene- og asset-skift må ikke nulstille gold, upgrades eller save.

## Det første produktionssæt

Den eksisterende knight, skeletterne og sværdeffekterne er den visuelle målestok. Nye sprites skal passe til deres faktiske størrelse i spillet og til [visual.md](../visual.md).

| Asset | Planlagt indhold | Formål |
|---|---|---|
| Goblin King | Idle 4, walk 4, attack 6, hurt 2, death 6 frames | Ny boss med tydelig krone, tungt våben og egen silhuet |
| Boss-portræt | Ét kompakt pixelportræt | Boss-knap, navn/HP og resultatvisning |
| Hero hurt/death | Hurt 2, death 4 frames | Udbyg den nuværende tint/fade med rigtig reaktion og sammenfald |
| Skelet hurt/death | Hurt 2, death 4 frames | Kort rekyl og tydeligt knogle-sammenfald |
| Boss-angrebseffekt | 4–6 frames til et kort tungt våben-impact | Gør kontakt og skade let at aflæse; ingen ny manuel dodge-mekanik |
| Sejr og slot-unlock | Kort varm accent, lås → aktivt slot, tydelig reward-tekst | Gør andet ability slot til en synlig belønning |
| Område 2-dungeon | Én ny baggrund med samme arena-geometri | Miljøskift som belønning efter bossen |

Bossens synlige krop sigter mod cirka 48 × 56 art-pixels med separat plads til krone/våben, sammenlignet med heroens cirka 26 pixels i højden. Endelig størrelse fastlægges i en rigtig mobilscene, så bossen ikke skjuler heroen eller HP-visningen.

Der er 34 planlagte character-frames i dette sæt: 22 til bossen og 6 ekstra til hver af de to eksisterende figurer. Hurt-klip er korte visuelle reaktioner og må ikke skabe stunlock eller nye pauser i simulationen. Death-klip stopper ikke den aftalte respawn-timer.

Der kræves ikke nye kropsanimationer til Power Strike eller Heal for denne gameplay-leverance. Effekter, cooldowns og andet ability slot kobles til simulationens faktiske casts. UI-animationen kan genbruge eksisterende lås- og ability-ikoner.

## Område 2: foreslået retning

Forslaget er en dybere, mosgroet krypt: samme mørke pixelstil og perspektiv, mere kølig blågrøn sten, rod-/mosdetaljer og fortsat varmt fakkellys. Overgangen skal være mærkbar uden at skifte spillets art direction.

Lav ét miljøskifte, som kan bruges på alle floors i område 2. Det eksisterende områdes billede bliver bevaret uændret. Område 2 beholder foreløbig samme gangbare areal og prop-placeringer, så billedskiftet ikke kræver nye collision- eller pathfinding-regler.

Den konkrete nye palette og detaljering er et produktionsforslag; brugerens bindende regel er, at dungeon først skifter efter bossen ved indgang til næste område.

## Produktionsrækkefølge og kvalitet

1. Færdiggør rettelsen af arenaens størrelse ved åbning/lukning af Upgrades, så sprites vurderes i korrekt skala.
2. Lav én rolig boss-pose ved siden af eksisterende hero og skelet i den nuværende dungeon. Kontrollér silhuet, størrelse, outline, farver og våbenplads før hele sheetet produceres.
3. Producer bossens animationsark ud fra den fastlagte figur. Bevar samme hoved, krone, våben, palette og fodanker gennem alle frames. Frames med identitetsskift eller manglende kontaktpose omarbejdes.
4. Producer hurt/death-udvidelser til hero og skelet med deres eksisterende ark som direkte visuelle referencer.
5. Producer boss-impact, portræt og unlock-feedback. Damage afregnes af simulationen; animationsframes og VFX synkroniseres til dens hit-event. Bossens windup/hit-tid aftales sammen med boss-reglerne, før klippet kobles på.
6. Producer område 2 som et separat miljøasset med den samme scene-geometri.
7. Integrér assets i en testscene med idle, bevægelse, kontakt, death og sejr. Afprøv mobil, overlap, hurtig panel-navigation og genindlæsning.

Bitmap-produktion udføres med ImageGen og direkte billedreferencer til det eksisterende art-sæt. En genereret spritesheet er en kilde, ikke en færdig animation: transparente områder, framekonsistens, crops og fodpivots kontrolleres før integration. Originaler og prompts bevares.

Hvert ark får loading-metadata med faktiske dimensioner, heltallige crop-rektangler, frame-navne, fodpivot, clip-rækkefølge og timings. Attack-frames kan have større rektangler til våbnet uden at flytte figurens position. Nearest-neighbor skal bevare den fælles art-pixelstørrelse; bossen må ikke blot være en opskaleret normal mob.

## Bevidst senere

Bat, golem, armored-skeleton-varianter, Whirlwind og Fireball kan give de efterfølgende floors mere variation. De produceres, når deres gameplay-roller er med i leverancen, så hver sprite har en faktisk funktion. Den første tre-floor/boss-leverance bruger eksisterende skeletter og abilities plus den nye boss.

## Accept før levering

- Floor 1–3 og bossforsøget viser det samme miljøasset, også efter reload.
- Sejr giver et tydeligt andet ability slot; miljøet skifter, når spilleren går ind i område 2.
- Retur til tidligere floors genskaber område 1's udseende.
- Boss og normale figurer har fælles perspektiv, art-pixelstørrelse og stabilt fodanker i alle clips.
- Angreb er læsbare, skaden vises én gang, og hurt/death-animationer skaber ikke combat-pauser.
- Arenaen vender tilbage til korrekt størrelse efter upgrades, floor-valg, bossresultat og viewport-skift.
- Screenshot og bevægelsesprøve dokumenterer både bossen og overgangen til næste dungeon. Planlagte assets registreres først som producerede efter faktisk eksport og kontrol.
