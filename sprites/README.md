# ProxyFace · sprites/

The **asset pipeline**, kept deliberately separate from the runtime engine
in `packages/proxyface-core/`. Everything in this directory is about
*authoring* artwork; nothing here ships to users.

## Visual direction

The target aesthetic is **id Software circa 1993**: chunky, detailed,
expressive pixel work in the spirit of the Doom HUD portrait — heavy
shading, strong brow ridges, distinct emotional reads at a glance. The
current placeholder atlas (round amber blobs) is a **functional
stand-in only**, not a style reference. Real sprites should feel
hand-painted, not procedural.

Concrete style anchors when prompting Scenario.gg / Leonardo:
  - 256×256 portrait, head-and-shoulders framing
  - Indexed palette, ~16 colors max (CRT amber primary; cool shadows;
    warm highlights)
  - Pixel scale: ~3-4px per "feature unit" — eyes are 8-12px wide,
    not single pixels
  - Lighting from above-front (consistent across all 8 emotions)
  - Strong silhouette readability — emotion identifiable at thumbnail
    size, even before you see the face details

## Deliverable

Every run of this pipeline produces three files, dropped into
`packages/proxyface-core/src/assets/sprites/`:

```
placeholder.png               ← 4096×2048 atlas (16 cols × 8 rows × 256px frames)
placeholder.pupil.png         ← 48×48 mobile pupil sprite
placeholder.manifest.json     ← frame coords, pupil anchors, per-emotion FPS
```

The runtime loads them by URL, knows nothing about this directory, and
works identically with hand-drawn, AI-generated, or procedurally-built
sprites.

## Why this directory exists

The **runtime is not an image generator.** It will never call Scenario.gg,
Stable Diffusion, or any cloud art service — that would break the
"100% local, zero telemetry" product promise. Sprites are baked **once**
during development and checked into the repo as static PNGs.

## Directory layout

```
sprites/
├── README.md                                  ← you are here
├── scripts/
│   └── build_placeholder_atlas.py             ← generates the current placeholder
├── source/                                    ← raw AI-generated frames (gitignored)
│   ├── IDLE_neutral_v1.png
│   ├── HAPPY_v1.png
│   └── …
├── aseprite/                                  ← layered cleanup files (gitignored, large)
│   └── proxyface.aseprite
└── exported/                                  ← aseprite → PNG export target
    ├── proxyface.png
    ├── proxyface.pupil.png
    └── proxyface.manifest.json
```

The `source/`, `aseprite/`, and `exported/` directories are listed in
`.gitignore` by default — they can balloon to 100+ MB with work-in-progress
layers. Only the final three files under
`packages/proxyface-core/src/assets/sprites/` are committed.

## Workflow — Scenario.gg → Aseprite → runtime

This is the recommended path per the external guidance docs. Alternatives
(Leonardo.ai, local Stable Diffusion via ControlNet) produce identical
output shapes and plug in the same way.

### 1. Generate a reference frame

In Scenario.gg (or your tool of choice):

- Canvas: 256×256, pixel art style, CRT amber palette.
- Prompt: `16-bit pixel art head, neutral expression, amber phosphor glow, dark navy background, transparent`
- Pick the result you like. **Save the seed**. This is your anchor.

### 2. Generate the other 7 emotions using the anchor as image reference

For each of HAPPY, SAD, ANGRY, SURPRISED, THINKING, EXPLAINING, ERROR:

- Same canvas, same seed (where supported).
- Upload the IDLE anchor as an **Image Reference** (structure influence 70-90%).
- Modify only the prompt's expression word: `…angry expression…`, `…eyes wide open, surprised…`, etc.
- The image reference locks head shape, eye position, palette — only
  the mouth/eyebrows/accessories should vary.

### 3. Animate each emotion (breathing + blink)

For each emotion, generate **16 frames** showing:

- Frames 0–3: calm idle pose
- Frames 4–6: subtle 2–3px vertical breath rise
- Frames 7–8: eyes closed (blink)
- Frames 9–15: return to neutral

Scenario.gg and Leonardo support "frame interpolation" — use it, then
hand-clean.

### 4. Aseprite cleanup (non-negotiable)

AI output always has:

- Semi-transparent "dirty pixels" that break 16-bit logic
- Drift in eye position between frames (breaks pupil compositing)
- Palette contamination (off-brand colors)

Import all frames into Aseprite as layers. For each emotion's 16-frame
strip:

- **Lock the eye-socket pixels.** The LEFT eye's center must be at the
  same (x, y) in every frame of every emotion. Use Aseprite's grid to
  verify. If they don't match, nudge.
- Indexed-color mode with the CRT palette from `tailwind.preset.cjs`:
  `#f5b942`, `#8a661f`, `#ffd97a`, `#06070d`, etc.
- Trim any stray pixels outside the head silhouette.
- For pupil-mobile emotions (IDLE, HAPPY, SAD, SURPRISED, THINKING,
  EXPLAINING): **erase the pupils**. Leave only the dark eye socket.
  The runtime draws mobile pupils on top from a separate sprite.
- For pupil-fixed emotions (ANGRY, ERROR): keep the baked-in eyes
  (slits, X marks).

### 5. Export

Aseprite → File → Export Sprite Sheet:

- Sheet type: By rows
- Columns: 16
- Frame size: Fixed 256×256
- Output: `exported/proxyface.png`
- Also export: `exported/proxyface.manifest.json` (Aseprite's JSON format)

Then run the converter (to be built):

```bash
python sprites/scripts/convert_aseprite_export.py \
  --input sprites/exported/proxyface.png \
  --manifest sprites/exported/proxyface.manifest.json \
  --output packages/proxyface-core/src/assets/sprites/
```

This shells out to produce the three runtime files. The converter
doesn't exist yet — write it when you have real Aseprite exports to
test against. For now, the Python placeholder generator
(`scripts/build_placeholder_atlas.py`) writes the same three files
and serves as a reference for the expected output shape.

## Manifest schema

See `packages/proxyface-core/src/avatar/manifest.ts` for the TypeScript
source of truth. Quick reference:

```jsonc
{
  "version": 1,
  "atlas": "proxyface.png",
  "pupilSprite": "proxyface.pupil.png",
  "frameSize": { "width": 256, "height": 256 },
  "frameCount": 16,
  "defaultFps": 8,
  "rows": [
    {
      "emotion": "IDLE",
      "row": 0,
      "pupilAnchor": { "x": 106, "y": 118 },      // left eye center
      "pupilAnchorRight": { "x": 150, "y": 118 }, // right eye center
      "pupilRange": { "x": 3, "y": 2 },           // max offset before clipping
      "blinkFrames": [7, 8],                       // frames where pupils hide
      "fps": 8
    }
    // …one entry per emotion, exactly 8 total
  ]
}
```

## Regenerating the placeholder

```bash
# Requires: pip install pillow
python3 sprites/scripts/build_placeholder_atlas.py
```

Outputs the placeholder triplet. Useful when iterating on the manifest
shape or the render pipeline itself.

## Seed preservation

**Check all Scenario.gg seeds, Leonardo prompt templates, and Aseprite
palette files into this directory.** Months from now, when you add the
88-emotion pro tier, you'll want to generate new emotions that match
the existing character's geometry exactly. That only works if you can
reproduce the original generations.

Suggested location: `sprites/seeds/` (gitignored by default — add
non-proprietary metadata there manually).
