# Dungeon-pivot — artproduktion

Dato: 2026-09-14. Alle nye bitmap-kilder er produceret med det indbyggede ImageGen-værktøj. Ingen CLI/API-fallback. Den eksisterende `public/assets/environment/dungeon.png` blev vist og brugt som stilreference, ikke som et ark der kunne genbruges direkte som tiles.

## Faktiske filer

- `public/assets/environment/dungeon-atlas.png`: første generering, 1254 × 1254 RGB. Fire rækker med dungeon-gulv, kryptgulv, vægmaterialer og props.
- `public/assets/environment/dungeon-atlas-alpha.png`: efterfølgende alpha-forsøg, 1254 × 1254 RGB; dette er runtime-kilden. Værktøjet leverede fortsat en opak grå/hvid baggrund på prop-rækken. Filnavnet dokumenterer forsøget og betyder ikke, at originalen har alfa.
- `public/assets/environment/dungeon-loading.json`: faktisk kildeformat, normaliseringsmål og frame-crops.

Originalerne er bevaret i projektet. Runtime-loaderen sampler gulvpatches til 32 × 32, vægge til 16 × 16 og props til 32 × 32, med nearest-neighbor. Tre source-pixels udelades ved hver cellekant for at fjerne arkets skillelinjer. Gulvpatches fordeles over et 2 × 2 logisk tile-grid, så stenene ikke bliver for små.

Prop-matten fjernes ved indlæsning med samme type chroma-normalisering som det eksisterende boss-sæt. Kun prop-cellerne behandles: neutrale lyse pixels med `min(R,G,B) > 145` og `max(R,G,B) - min(R,G,B) < 24` får alfa 0. Motivernes mørke/violette outlines, brune træ og orange/gule flammer bevares. Faktiske gameplay-screenshots er facit for resultatet.

## Prompt 1 — nyt miljøatlas

Use case: stylized-concept. Generate a NEW production environment spritesheet for the IdleCombatz pixel RPG, using the attached image only as a style reference. Save project-bound output. Exact 1024x1024 square atlas, precisely FOUR columns and FOUR rows of equal 256x256 cells with no padding between cells, no labels, no grid lines, no text. The atlas will be sampled into sixteen 32x32 pixel-art cells. Coarse crisp intentional pixel clusters, matching dark desaturated violet stone, heavy outlines, muted highlights, no smooth airbrush. All cells occupy their exact square. Row 1: four different fully filled seamless top-down stone floor patches, subdued purple with tiny cracks, flat lighting. Row 2: four more fully filled floor patches, this time cold moss crypt teal-gray stone with small moss patches at edges. Row 3: four wall block textures each filling its square: violet heavy masonry front face, violet masonry wall top surface, cool mossy masonry front face, cool mossy wall top surface. Row 4: four isolated centered props on genuinely transparent background, each wholly within its cell: closed wooden treasure chest with brass latch (front three-quarter view), same chest open empty, top-down short staircase descending into darkness with stone rim, and wall-mounted orange flame torch. Exact regular four-by-four grid, each prop centered with clear margins. No characters or UI, no fake checkerboard transparency. Pixel scale consistent with reference when reduced to 32px per cell; chunky silhouettes and restrained detail.

Faktisk leveret størrelse: 1254 × 1254, ikke promptens ønskede 1024 × 1024. Runtime-crops er beregnet ud fra den faktiske størrelse.

## Prompt 2 — fjern prop-matte

Edit this exact spritesheet. Preserve the 4x4 cell layout and all pixels of all assets, their colors, scale and positions. ONLY remove the gray-and-white fake checkerboard background behind the four objects in the bottom row and replace it with real alpha transparency. Top three rows remain fully opaque and unchanged. Do not redraw the objects. Output a genuine RGBA PNG with alpha 0 in all empty space around the bottom-row chest closed, chest open, stairs and torch. Do not paint any checkerboard. No other changes.

Resultat: nyt RGB-ark med neutral matte; runtime-normalisering er derfor nødvendig som beskrevet ovenfor. Der er ikke produceret nye hero-, skeleton- eller boss-animationer i dette pivot. Eksisterende figurer, hurt/death og VFX genbruges.
