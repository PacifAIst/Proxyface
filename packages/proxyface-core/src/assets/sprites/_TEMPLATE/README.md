# How to add a new character to ProxyFace

Plug-and-play: drop a folder, refresh, you're done.

## 1. Create a folder

Create a new folder at:

```
packages/proxyface-core/src/assets/sprites/art/<your-character-id>/
```

Use a short lowercase id with hyphens (e.g. `donquixote`,`cyclops-cyan`). 
The folder name becomes the character's id in the URL and the showroom listing.

## 2. Drop three files inside

Three filenames are fixed by convention. The loader assumes them.

| File | What it is |
|---|---|
| `atlas.png`    | The 4096×2048 sprite sheet (16 cols × 8 rows × 256px) |
| `pupil.png`    | The small pupil overlay sprite — usually a circle with shadow. Omit if `eyeCount: 0`. |
| `manifest.json`| Metadata + per-emotion eye coordinates. Copy from `_TEMPLATE/manifest.jsonc` and edit. |

## 3. Edit the manifest

Copy `_TEMPLATE/manifest.jsonc` to your new folder, **rename to
`manifest.json`** (drop the `c`), and remove the comments. Or use the
plain `_TEMPLATE/manifest.json` if you prefer to start from a comment-free
file.

Fill in:
- `name` — display name shown in the showroom
- `description` — one-line funny/flavor description
- `author` — who made the art
- `url` — optional link to portfolio or source
- `eyeCount` — 2 / 1 / 0 (see comments in the template)
- `pupilAnchor` for each of the 8 emotion rows — adjust if your art's eye position
  shifts between expressions

## 4. Rebuild and test

From the repo root:

```powershell
cd apps/web
node scripts/sync-sprites.mjs
```

Then start `pnpm dev:web`, hard refresh, and your character should appear
in the showroom (step b) and settings dropdown (step c).

## Tips for tuning eye positions

If pupils look slightly off-center on a particular emotion:
1. Open the running web app and pick that emotion
2. Note the px offset that looks wrong (e.g. "pupils are 4px too low on SAD")
3. Edit your `manifest.json` row for that emotion: change `pupilAnchor.y` by -4
4. Save — Vite hot-reloads, you see the result instantly

The right eye is mirrored automatically from the left unless you explicitly
set `pupilAnchorRight`. If your art is asymmetric, set both.
