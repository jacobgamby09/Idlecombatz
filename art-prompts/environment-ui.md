# Environment and UI asset prompts

Built-in image_gen was used. Original tool outputs are copied into this project; no API/CLI fallback.

## Dungeon

Output: `public/assets/environment/dungeon.png` — 1086×1448 RGB. Runtime samples this artwork to180×244 with nearest-neighbor.

```text
Use case: stylized-concept. Asset type: production game environment background ONLY.
Input image is a binding STYLE AND ROOM COMPOSITION REFERENCE, not the output canvas. Reconstruct ONLY the dark purple dungeon playfield from the game screenshot in the reference, exclude all UI, title, heroes, enemies, damage numbers, spells, icons, palette and poster.
Create a top-down / slightly front-facing 2D pixel-art dungeon arena, portrait 3:4 canvas, 768x1024 if possible, visually conceived as a native 192x256 pixel artwork enlarged 4x with hard nearest-neighbor pixel edges. Dark desaturated violet stone pavers, small irregular rectangular cobblestones with dark seams and cracks. Narrow chunky dungeon walls border left/right and top; open walkable central floor occupies 80% width and most of height. TWO small wall-mounted lit torches, one on each side at 24% height, amber flame and restrained orange glow on nearby bricks, cool purple shadow ambient. A small dark wooden barrel against left wall at 57% height, one modest pillar lower right, dark broken stones at lower corners. Keep decoration edge-bound and centre unobstructed. Flat playable room as reference, no perspective vanishing point, no stairs dominating floor, no central dais/altar.
Palette stone #201932 #30203C #3B2846 #493661, dark outline #12121E, warm torch orange #FF6805 yellow #FFD16C. Carefully clustered pixel detail; sharp discrete pixels, low-res SNES/modern mobile pixel RPG. Reference room's moody dark purple colour and intimate scale are essential. Floor subdued enough to read small silver knight and cream skeletons over it. Keep brightest parts only torch flames. High quality deliberate pixel craftsmanship. No characters, no shadows of characters, no lettering, no UI, no border around image, no watermark. Fill whole image with dungeon environment.
```

## UI atlas

Output: `public/assets/ui/icons.png` — 1448×1086 RGBA. Runtime alpha-bounds normalize its12icons into a4×3atlas; originals remain untouched.

```text
Use case: stylized-concept. Asset type: ONE production pixel RPG UI icon atlas.
Input reference image: binding appearance reference. Recreate its tiny highly legible richly shaded pixel icons and knight portrait. Output a strict regular 4 columns by 3 rows atlas on a UNIFORM solid chroma-key background EXACT #00FF88 (a technical background, not part of any icon). No transparency checkerboard. Aspect ratio4:3, canvas1536x1152 preferred. Exactly12 equally sized square cells. Each icon centred in its cell with generous clear space, occupying 65% cell width/height. No gridlines, lettering, labels, frame borders, or extra items.
Cell order left-to-right top-to-bottom:
ROW1: (1) bust portrait of small silver plate-armored knight, rounded steel helmet with dark visor and beige visible face, brown/red collar; (2) crossed silver swords with brilliant orange-yellow slash on dark red square inset icon background; (3) thick luminous emerald green heal cross on dark green square inset; (4) silver medieval knight helmet icon with blue steel shades.
ROW2: (1) crossed short steel swords, purple handles; (2) three ascending steps made of bright blue stone as Upgrades icon; (3) red/magenta skull with dark eye sockets; (4) small cluster of three shiny warm gold coins.
ROW3: (1) tiny purple dungeon staircase leading up with gold light; (2) small gray-violet mechanical settings cog; (3) chunky closed gray-violet padlock; (4) small gray steel breastplate armor.
Style: actual low-res pixel art icons, each designed on roughly24x24 native pixels enlarged with crisp blocks. Match reference's small detailed modern-pixel mobile RPG. Controlled palette violet shadows #242538 #493661, light steel #DAD0CD, orange #FF6805 yellow#FFD16C, deep red#D20030, greenheal#39CE53. Readable silhouettes, 1nativepixel dark outlines, 3-5 shade levels, no smooth vector look. Chroma key background#00FF88 flat across canvas, NOT inside icons, do not use this exact mint colour inside artwork. No glow leaking broadly into chroma background, sharp clean edges. Keep atlas alignment mathematically regular.
```

### Alpha correction

```text
Edit target: the supplied 4x3 pixel RPG icon atlas. Change ONLY the bright mint chroma-key background surrounding the twelve square icons into actual transparent alpha pixels. Keep every icon, all positions, all dimensions, all colors inside icons, and all sharp pixel edges unchanged. Output RGBA PNG with actual alpha transparency, no simulated checkerboard, no white or colored background. Preserve the twelve icon square backgrounds and their frames; remove only the external mint field.
```

