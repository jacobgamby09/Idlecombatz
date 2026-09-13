# Boss and region art prompts

Generated 2026-09-13 with the built-in imagegen tool using the existing PNGs as direct references. Sources are preserved under public/assets. Character exports use a flat magenta key, removed once by the runtime texture loader. Impact contains real alpha. The checkerboard concept source is retained for provenance and is never loaded by the game. An attempted alpha re-export also returned a baked checkerboard and was rejected.

The atlas is manually measured in public/assets/boss/loading.json. Boss source frame 7 contains an unwanted duplicate weapon; the walk sequence uses 6, 10, 8, 9. Frame 11 is unused. No source PNG has been painted over or procedurally redrawn. Hero frame crops were corrected to the actual gaps, preventing fragments from adjacent poses.

## Goblin King concept (source only)

```text
Use case: stylized-concept. Production game sprite, transparent RGBA background.
Reference images: the knight and skeleton sheets are DIRECT pixel-art style references, not edit targets. Create ONE full-body Goblin King boss standing idle, facing slightly right, same three-quarter top-down RPG perspective as the supplied characters. Crown, olive green goblin skin, broad pointed ears, two small ivory tusks, heavy dark iron shoulder armor, burgundy cloth belt and short cape, large iron cleaver held low on the right. Compact bold readable silhouette, 1.8 times the hero's body height at game scale. Match precisely the existing restrained clustered pixel shading, near-black violet stepped outlines, chunky clean art pixels and warm upper-left light. Render as enlarged nearest-neighbor pixel art equivalent to a native approximately 48 by 56 pixel body, plenty of clear margin for the weapon. No scene, no floor, no text, no grid, no shadow baked into background, no checkerboard. One consistent complete character centered, boots resting on same horizontal baseline. Preserve genuine transparent alpha. This is the design anchor for subsequent animation sheets.
```

## Goblin King animation source

```text
Production pixel-art animation sprite sheet for the exact Goblin King in reference 1, style matched to knight in reference 2. Preserve his olive skin, crown with three red gems, huge ears, two tusks, dark steel armor, burgundy cape and iron cleaver. Output a strict regular grid SIX COLUMNS by FOUR ROWS, 24 equal square cells, landscape 3:2. NO grid lines, labels or text. Each cell contains exactly one full character, centered on identical foot anchor at x50%, y88% of that cell. Standing body from crown to feet is 68% of cell height; do not enlarge or shrink character between frames. Leave wide margins for cleaver. Background must be perfectly uniform flat chroma-key MAGENTA #ff00ff (NOT checkerboard, no shadows on background); preserve every dark outline.
Row1: 4 subtle breathing idle frames then 2 hurt recoil frames.
Row2: 4 walking frames then 2 additional quiet idle frames (these two extra cells will be ignored).
Row3: six distinct heavy cleaver attack frames: anticipation, weapon up, overhead peak, downward contact toward right, low followthrough, recover. Both feet anchored, no teleportation.
Row4: six sequential death frames: stagger, kneel, slumping sideways, torso falling, on ground, settled defeated with crown and cleaver beside body. Final frames low on same baseline, not a standing character.
Only this ONE consistent character throughout. Match the reference's clean stepped pixel clusters, near-black violet outlines and warm highlights, no smooth vector edges, no painterly blur.
```

## Moss Crypt environment

```text
Edit target: this existing pixel-art dungeon background. Create the second region of the same game: a deeper moss-grown crypt. Preserve the EXACT overhead perspective, portrait aspect ratio, open arena geometry, side-wall thickness, torch positions at upper left and upper right, barrel at left middle and broken columns at bottom left and bottom right. No characters, UI, text or new obstacles. Replace violet stone with subdued desaturated blue-green stone, moss and thin roots restricted to edge walls and pillars, hints of violet shadows. Keep warm amber torch flames and lighting at precisely the same locations. Same finely clustered pixel art quality, texture density, dark contrast and tile sizes. The central floor must remain calm/readable, not overgrown. The result must feel like the next area in the SAME game, not a filter or unrelated illustration. Full opaque background filling canvas, same 3:4 portrait composition.
```

## Knight hurt / death

```text
Production animation extension sheet for the EXACT knight in reference. Same silver helmet, face, dark shoulder plates, red-brown belt and boots, sword. Do not redesign his identity or pixel scale. SIX equal square cells in a single horizontal row, output very wide 6:1 image. Each sprite stands at x50%, foot baseline y88% in its cell, standing head-to-foot height 68% of cell. Frames 1-2: two short hurt recoil poses. Frames 3-6: death sequence, knee buckles, drops to one knee, collapses sideways, finally lying on side with sword on ground. Frame6 must be clearly prone, low at baseline, not standing. Entire character and weapon inside its cell, identical proportions all frames. Flat solid chroma-key MAGENTA #ff00ff background, no grid lines, text, checkerboard or ground shadow. Crisp chunky pixel-art shading matching reference.
```

## Skeleton hurt / death

```text
Production animation extension sheet for the EXACT skeleton in reference. Preserve cream skull, dark violet eye sockets, ribs, brown tattered shorts and short iron sword. SIX equal square cells in a single horizontal row, output very wide 6:1 image. Each sprite centered x50%, feet baseline y88%, standing body height68% of each cell. Frames1-2 two short hurt recoil poses. Frames3-6 death: knees buckle, bones begin to separate, ribcage and skull collapse, final settled small pile of bones with skull and sword on ground. Final frame low on original baseline, no standing skeleton. No gore. Same head proportions, cluster pixel style and outlines as reference. Entire poses inside cells. Flat solid chroma-key MAGENTA #ff00ff background; no labels, grid, checkerboard or ground shadow.
```

## Boss portrait

```text
Create a compact square pixel-art UI portrait of this exact Goblin King, only head, crown and shoulder tops. Same olive skin, three red crown gems, tusks, ears, burgundy cloth, dark iron shoulder armor. Straightforward three-quarter right view, bold readable at 32 by32 native pixels. Enlarged crisp pixel clusters matching reference. Fill most of square with head but no cropped crown/ears. Dark violet solid background #181827. No frame, writing, symbols, gradient or extra characters.
```

## Boss impact

```text
Game VFX animation sheet, four equal square cells in a single horizontal row. A heavy iron cleaver's warm amber ground impact in chunky pixel art, matching this goblin boss and reference scene. Frames: compact contact spark; expanded jagged golden star with small dust fragments; fading amber fragments and broken dark dust ring; few small fading pixels. Same central pivot, short restrained burst, no huge explosion or fire. Flat uniform pure chroma-key MAGENTA #ff00ff background, no ground, text, grid lines or checkerboard. Individual effects confined to their cells. Palette amber, ivory core, orange, subdued grey-brown dust and near-black violet edges.
```
