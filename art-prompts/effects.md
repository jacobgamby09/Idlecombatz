# Combat VFX — alpha repair and loading record

## Selected output

Use `public/assets/effects/combat-alpha.png`. It is **1774 × 887**, verified `Format32bppArgb` with alpha 0 at canvas corner and a blank interior position. An impact core sample had alpha 253. It contains four crescent frames on the top row and four impact-star frames on the bottom row.

The original `combat.png` was supplied by the main asset-production task and has not been overwritten. Initial direct alpha extraction continued to return RGB checkerboard. A two-step built-in image_gen edit succeeded: first replace the checkerboard with plain black, then request an RGBA background extraction from that black intermediate.

All PNGs are unmodified tool outputs copied into the workspace. There was no CLI/API fallback or programmatic pixel editing.

## Files

| File | Purpose |
|---|---|
| `combat.png` | Preserved source, RGB with baked checkerboard |
| `combat-alpha-attempt.png` | Preserved unsuccessful direct extraction, RGB |
| `combat-black.png` | Intermediate, effects on plain black |
| `combat-alpha.png` | Selected genuine RGBA transparent result |
| `loading.json` | Eight source rectangles, pivots and proposed timing |

## Loading

Because 1774 / 4 and 887 / 2 are both 443.5, use explicit integer atlas boundaries instead of a floor-rounded repeated cell width.

- Column boundaries: **0, 444, 887, 1331, 1774**
- Row boundaries: **0, 444, 887**
- Crescent frames: 0–3, strongest crescent at frame 2
- Impact frames: 4–7, strongest impact at frame 6
- Suggested frame-local pivots: crescent (222,244), impact (222,207)
- Proposed timings: crescent 40/50/65/45 ms; impact 30/40/50/60 ms

Use one constant source-to-art scale across all frames and nearest-neighbor sampling. Do not independently enlarge the small anticipation frames. Keep the main crescent around the weapon side with scale checked against `visual.md`; strongest VFX should be approximately 2–2.5 hero body widths. The bright core uses the pixel renderer; any extra glow remains a separate restrained effect.

Alpha extraction introduces fractional alpha along the edges. Verify the selected effect over the dark dungeon at target size; the source has not been destructively thresholded.

## Attempt 1 — direct alpha request (unsuccessful)

```text
Use case: background-extraction. Edit target: the supplied orange combat-effects spritesheet. Change ONLY the background from the present grey and white checkerboard pattern to genuine transparent PNG alpha. Remove every checkerboard square and every decorative background mark; there must be zero visible background pixels. KEEP all eight colorful pixel-art combat effects pixel-identical if possible: identical orange, red, yellow, ivory and magenta colors, crescent sword-swing shapes across the four top frames, impact stars across the four bottom frames, exact poses, sizes and locations. Preserve full canvas dimensions and regular 4-column by 2-row cell layout. Do not redraw the subjects, do not crop, do not add shadows. The output must use an RGBA PNG with 0 alpha outside the orange effect silhouettes and their few colored sparks, not an RGB PNG depicting checkerboard. Transparent background is the sole requested change.
```

## Step 2 — checkerboard to black (successful intermediate)

```text
Edit the supplied spritesheet. REPLACE THE ENTIRE GREY CHECKERBOARD BACKGROUND WITH UNIFORM PURE BLACK #000000. Every pixel that is not one of the eight red/orange/yellow/ivory pixel-art spell effects must become pure black, including the spaces inside the crescents and between sparks. Keep all eight effects exactly as they are in shape, size, position, color and animation arrangement: four crescent frames above four impact-star frames. Preserve the 1774×887 canvas dimensions and 4-column 2-row grid. No checkerboard remains, no grey, no texture, no shadows or gradients. Solid uniform pitch black backdrop only.
```

## Step 3 — black to genuine alpha (successful)

```text
Use case: background-extraction. Make this image TRANSPARENT. The image contains eight isolated luminous pixel-art objects on a plain black background. Remove ALL black background and replace it with actual zero-alpha transparency in an RGBA PNG. Cut out and preserve the eight red/orange/yellow/ivory objects and their small colored sparks exactly, in the same 4-column by 2-row layout. Transparent regions include inside the crescent shapes, gaps between rays and all space between the eight objects. Keep the same 1774×887 canvas. Do not redraw or move the objects. Do not replace black with a grey checkerboard illustration, white, or any other solid color. We need a genuine transparent PNG asset: alpha channel with 0 outside the colored objects.
```

