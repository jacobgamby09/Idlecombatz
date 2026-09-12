# Character assets — production record

Built with **built-in image_gen**, using `references/modern-pixel-reference.png` as the binding appearance target. The reference and local edit targets were inspected before generation. No CLI/API fallback, manual sprite drawing or external asset pack was used.

## Delivered files

| File | Actual PNG | Alpha | Purpose |
|---|---|---|---|
| `public/assets/characters/hero-sheet.png` | 1448 × 1086 | RGBA, corner alpha 0 | Selected knight sheet |
| `public/assets/characters/skeleton-sheet.png` | 1448 × 1086 | RGBA, corner alpha 0 | Selected skeleton sheet |
| `hero-sheet-original.png` | 1448 × 1086 | RGB checkerboard | First unmodified generation; provenance only |
| `skeleton-sheet-original.png` | 1448 × 1086 | RGB checkerboard | First unmodified generation; provenance only |
| `source-metadata.json` | JSON | — | Read-only per-cell alpha/bounds measurements |
| `loading.json` | JSON | — | Source rectangles, registration pivots and timing |

The selected PNGs are **unaltered image_gen outputs copied into the project**. Both initial generations painted checkerboards despite requesting actual alpha. A targeted built-in background-extraction edit produced genuine RGBA PNGs; this was verified through image metadata and corner alpha.

## Grid, registration, scale and playback

Nominal layout is **4 columns × 3 rows**, 362 × 362 source pixels per cell. Frame order is idle 0–3, walk 4–7, attack 8–11. Idle 4 fps; walk 9 fps; attack frame durations 65/55/75/85 ms, contact at frame 10. Contact timing must remain a presentation event controlled by the simulation, not the source of damage.

Do not blindly use an uncorrected 362-pixel Phaser spritesheet. Two measured output imperfections are covered by `loading.json`:

- Hero foot baseline is approximately local y=324; chosen exclusive baseline/pivot y=325 throughout.
- Skeleton baselines are approximately y=352 idle, y=338 walk, and y=326 attack; source pivots 353/339/327 compensate for row drift.
- Frame 10's extended weapon crosses the nominal cell boundary by about 20–25 source pixels. Its source rectangle is x=724, y=724, width=400, height=362. Frame 11 starts at x=1124 with width=324 to exclude that weapon fragment. Its local x pivot is consequently 143 instead of 181.
- Other frame source rectangles are the nominal 362-pixel cells, with local x pivot=181.

Suggested runtime atlas: 48 × 48 **art-pixel** frames, foot pivot=(24,40), sampled nearest-neighbor and displayed at 2 CSS pixels per art pixel. Maintain one scale per character for all animation frames: hero 26/252 art pixels per source pixel gives approximately 26-pixel idle body height; skeleton 24/264 gives approximately 24-pixel body height. Draw each source rect using the corrected pivot, rather than separately normalizing each pose's bounding box.

Selected source PNGs contain fractional alpha pixels around edges (and some materials), so visual QA must inspect them over the actual dark violet dungeon. No destructive thresholding or image edits were applied outside image_gen.

## Visual review

The knight reproduces the reference's large grey helmet, compact steel shoulders, warm exposed face, red/brown waist and boots, and readable small sword. Skeletons use cream skulls, violet sockets/shadows, thin ribs and limbs and a small blade. Both sheets have genuinely different walk/attack silhouettes, particularly raised-weapon anticipation, forward contact and recovery.

The source is generated at a larger resolution than the logical art-grid. Renderer sampling is needed for consistent pixel scale with the dungeon. Skeleton skulls are somewhat more prominent than the very small source reference sprites; final acceptance requires comparison at in-game scale, alongside the dungeon and VFX. These assets are suitable for the first animated visual proof and are not claimed as pixel-identical recreations of the unavailable source sprites.

## Hero generation prompt

```text
Use case: stylized-concept.
Asset type: production-ready transparent pixel-art animation spritesheet for a Phaser mobile RPG.
Reference image: the supplied Modern Pixel presentation is the exact visual target. Recreate the small steel knight visible in the dungeon and in the loose sprite row near the bottom. Match his specific compact silhouette, big grey helmet, small warm exposed face, chunky steel shoulders, reddish brown tunic/belt/boots, little bright steel sword. The subject should look like that knight, not a generic fantasy illustration.
Make ONE PNG spritesheet, preferred canvas 1024×768 pixels, arranged EXACTLY 4 columns by 3 rows, equal 256×256 frame cells, no gaps. Every cell contains one full knight frame. No labels, text, guide lines, grids, other creatures, scenery, floor, or baked contact shadows. Background must be actual transparent alpha, not checkerboard or a flat color.
Pixel-art requirements: logical 32×32 art pixels per cell, enlarged exactly 8× with nearest-neighbor, with clear square 8×8 pixel clusters, stepped outlines, no subpixel antialiasing, no smooth illustration. Knight visible body approximately 24 logical pixels high, including helmet and feet, with 1 art-pixel dark violet outline and 3–5 discrete colors per material. Steel highlight #DAD0CD, desaturated purple-grey steel shadows, brown-red cloth, dark almost-black joints, tiny warm skin. Exactly the same pixel scale in all 12 frames.
COMPOSITION AND REGISTRATION: knight faces three-quarter front toward viewer's right in all frames. In every cell place body centered around x=16 logical pixels and ground/feet baseline at y=29. All body parts and sword remain inside their cell. Leave breathing room, no crop. Hero identity, helmet size, face, outfit and sword remain identical between frames.
ROW 1 (top, four idle frames): restrained breathing loop, barely one art pixel of shoulder rise and lowered shoulders, feet stable. This row must be four different subtle idle frames.
ROW 2 (middle, four walk frames): genuine four-phase walking cycle toward right: left leg forward and right back, passing step, right leg forward and left back, opposite passing step. Arms/sword counter-swing; distinct leg silhouettes. Same body size, same foot baseline.
ROW 3 (bottom, four attack frames): actual sword swing animation: 1 low combat-ready anticipation with sword drawn back, 2 strong windup with sword high over shoulder, 3 contact with sword extending diagonally out to the right and body leaned forward, 4 recovery returning toward ready. Draw the moving sword but NO external slash trail, glow, spell arc, particles or background. Clear poses that work when played sequentially.
All twelve frames must be present and aligned. The reference is a style/identity reference only; do not recreate the presentation panel or UI.
```

## Hero alpha revision

```text
Use case: background-extraction. Edit target: the supplied knight spritesheet. Change ONLY the background from the present grey and white checkerboard pattern to genuine transparent PNG alpha. Remove every checkerboard square and every decorative background mark; there must be zero visible background pixels. KEEP all twelve knight sprites pixel-identical if possible: identical steel-grey armor, red-brown outfit, face, sword, exact poses, sizes and locations. Preserve full canvas dimensions and regular 4-column by 3-row cell layout. Do not redraw the subjects, do not crop, do not add shadows. The output must use an RGBA PNG with 0 alpha outside the knight silhouettes, not an RGB PNG depicting checkerboard. Transparent background is the sole requested change.
```

## Skeleton generation prompt

```text
Use case: stylized-concept.
Asset type: production transparent pixel-art animation spritesheet for a Phaser mobile dungeon RPG.
Reference image 1 is the exact visual target: recreate the small CREAM-COLORED SKELETONS visible in the dungeon and the loose skeleton near the bottom, not the knight. Image 2 is a supporting animation-sheet/layout reference: the generated knight establishes the pixel scale, cell spacing, palette shadow family and perspective of the companion asset. Do NOT draw any knights.
Subject: compact small skeleton enemy, oversized cream/beige skull with round dark sockets and small teeth, thin bony spine and ribs, narrow arms and legs, one little chipped grey dagger, violet-dark outlines and shadows. Match reference skeleton proportions: head around one-third of total height, spindly body, clearly thinner than knight, about same or slightly shorter height. Light bones #DAD0CD / warm cream; shadowed bones muted tan; dark purple-grey joints. Minimal small brown wrap at waist if needed, no armor and no shield.
Make exactly 12 full skeleton frames in ONE PNG, canvas preferred 1024×768, regular4columns×3rows equal square256×256cells with no gaps. Every cell contains precisely one whole skeleton, same identity and size.
Background MUST be genuinely transparent PNG alpha: RGBA channel, all pixels outside skeleton silhouettes have alpha0. Do not depict checkerboards. No background color, no floor, no contact shadow, no gradients, no text, no labels, no gridlines, no presentation graphics.
Pixel-art style: logical32×32pixels per frame enlarged8× nearest-neighbor; deliberate square pixel clusters and stepped 1-art-pixel dark outline, sparse3–5shade ramps. No smooth painting, no anti-aliased high-detail illustration. Foot baseline y29 of32logicalpixels, body center x16; body visible height23–24logicalpixels. All frames face three-quarter front toward viewer's right, sword always held in the same hand. Identical skull size/body scale in every cell; dagger stays within bounds.
Top row=idle4frames: tiny breathing/wavering motion, feet anchored, skull subtly tilts and returns. Distinct but restrained poses.
Middle row=walk4frames: leftfootforward/rightback; passingstep; rightfootforward/leftback; oppositepassingstep. Bony knees and arms clearly counter-swing. Skull bobs only1artpixel, foot baseline consistent.
Bottom row=attack4frames:1drawdaggerback,2raiseitoverrightshoulder,3extenddaggerdiagonallyright in a sharp slash with a smallforwardlean,4recovertoidle. Distinct animation sequence, no slash trails, no particles, no glow, no magic.
Preserve layout rigor and transparency. The reference sprites are the specific art direction to match.
```

## Skeleton alpha revision

```text
Use case: background-extraction. Edit target: the supplied skeleton spritesheet. Change ONLY the background from the present grey and white checkerboard pattern to genuine transparent PNG alpha. Remove every checkerboard square and every decorative background mark; there must be zero visible background pixels. KEEP all twelve skeleton sprites pixel-identical if possible: identical cream bones, dark sockets, brown cloth, dagger, exact poses, sizes and locations. Preserve full canvas dimensions and regular 4-column by 3-row cell layout. Do not redraw the subjects, do not crop, do not add shadows. The output must use an RGBA PNG with 0 alpha outside the skeleton silhouettes, not an RGB PNG depicting checkerboard. Transparent background is the sole requested change.
```

