# ProxyFace

> A privacy-first, edge-computed visual AI companion. 100% local. No telemetry, no cloud inference.

ProxyFace renders a 16-bit pixel-art avatar that reacts in real time to LLM
output (ChatGPT, Claude, Gemini) and follows your eyes via webcam — all
running locally in the browser via WebAssembly and WebGPU.

It ships as **three targets from one codebase**:

- 🟢 **Chrome extension** — toolbar popup + full-page mode (Manifest V3)
- 🦊 **Firefox extension** — toolbar popup + full-page mode (Manifest V3)
- 🌐 **Standalone web app** — full-page experience at any URL

---

## Status

This is **step 1 of an 8-step build plan**: the monorepo foundation. A shared
"Hello ProxyFace" placeholder renders identically across all three targets,
proving the build pipeline end-to-end. Steps 2–8 layer in the TinyBERT
emotion model, the avatar engine, eye-tracking, voice I/O, LLM integration,
and store-ready packaging.

| Step | Scope | Status |
|------|-------|--------|
| 1 | Monorepo + shared core + placeholder | ✅ |
| 2 | TinyBERT training → INT8 ONNX | ✅ |
| 3 | Local emotion inference engine | ✅ |
| 4 | Pixel art avatar + 8-state machine | ✅ |
| 5 | Eye-tracking via MediaPipe | ✅ |
| 6 | Voice I/O + LLM page integration | ✅ |
| 7 | Cross-browser shell + full-screen web | ✅ |
| 8 | Performance hardening + store release | ✅ |

---

## Where to go next

- **Running it end-to-end for the first time** → `docs/RUNBOOK.md`
  (the detailed non-expert-friendly guide)
- **Reproducibility / paper submission** → `docs/MODEL_CARD.md` and
  `docs/RUNBOOK.md` Section 12
- **Submitting to the stores** → `store/SUBMISSION_CHECKLIST.md`
- **Privacy story** → `docs/PRIVACY.md`
- **Re-authoring the sprite atlas** → `sprites/README.md`

---

## Repository layout

```
proxyface/
├── apps/
│   ├── chrome-ext/          # Chrome MV3 extension
│   ├── firefox-ext/         # Firefox MV3 extension
│   └── web/                 # Standalone web app
└── packages/
    └── proxyface-core/      # Shared React, hooks, types, design tokens
```

All three apps depend on `@proxyface/core` via pnpm workspaces. Anything that
should look or behave the same across targets (the avatar, the emotion
state machine, the design tokens, the eye-tracking hook) lives in
`proxyface-core`. Anything target-specific (manifests, popup chrome,
service workers, content scripts) lives in `apps/*`.

---

## Prerequisites

- **Node.js 20.10+**
- **pnpm 9+** — install with `corepack enable && corepack prepare pnpm@latest --activate`
- For Firefox dev: **`web-ext`** (optional) — `npm i -g web-ext`

---

## Quickstart

```bash
# 1. Install everything (all three apps + shared core)
pnpm install

# 2. (Optional) Train the emotion model — step 2.
#    You can skip this and run everything in mock mode.
cd training
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python scripts/make_dataset.py
python scripts/train_model.py
python scripts/export_to_onnx.py
cd ..

# 3. Run any of the three targets.
#    Each target's `predev` hook auto-copies the trained model
#    into public/models/ first (or writes a placeholder if step 2
#    hasn't been run).
pnpm dev:web        # → http://localhost:5173
pnpm dev:chrome     # → builds to apps/chrome-ext/dist/ in watch mode
pnpm dev:firefox    # → builds to apps/firefox-ext/dist/ in watch mode

# Or run all three in parallel (uses Turborepo)
pnpm dev
```

### Mock mode (no training required)

If you haven't trained the model yet but want to see step 3 working:

- **Web:** visit `http://localhost:5173/?mock=1` — uses the regex
  classifier instead of the worker.
- **Extensions:** flip `useMock={true}` in the fullpage entry
  (`apps/*/src/fullpage/main.tsx`) temporarily.

The mock hits 8/8 on canonical probes but is strictly for development —
the real TinyBERT model does the heavy lifting in production.

### Loading the Chrome extension

1. `pnpm dev:chrome` (keeps rebuilding on file changes)
2. Open `chrome://extensions`
3. Toggle **Developer mode** on (top right)
4. Click **Load unpacked** → select `apps/chrome-ext/dist/`
5. Pin ProxyFace to your toolbar and click the icon

### Loading the Firefox extension

1. `pnpm dev:firefox`
2. Open `about:debugging#/runtime/this-firefox`
3. Click **Load Temporary Add-on…**
4. Select `apps/firefox-ext/dist/manifest.json`
5. Click the ProxyFace icon in the toolbar

> **Tip:** for a smoother Firefox loop, install `web-ext` and run
> `web-ext run --source-dir=apps/firefox-ext/dist` — it auto-reloads on
> rebuild and launches a clean profile.

### Running the standalone web app

```bash
pnpm dev:web
# open http://localhost:5173
```

---

## Production builds

```bash
pnpm build              # Builds all three targets in parallel
pnpm build:web          # → apps/web/dist/
pnpm build:chrome       # → apps/chrome-ext/dist/
pnpm build:firefox      # → apps/firefox-ext/dist/

# Package the extensions for store submission
pnpm --filter @proxyface/chrome-ext run package    # → proxyface-chrome.zip
pnpm --filter @proxyface/firefox-ext run package   # → proxyface-firefox.xpi
```

---

## Verifying step 1

You'll know the scaffold is working when **the same pixel-art ProxyFace
placeholder renders in all five surfaces** with the only visible
difference being the small `surface:` debug pill at the bottom:

- `surface: Web App` — http://localhost:5173
- `surface: Extension Popup` — Chrome toolbar click
- `surface: Extension Full Page` — Chrome popup → ⤢ Max button
- `surface: Extension Popup` — Firefox toolbar click
- `surface: Extension Full Page` — Firefox popup → ⤢ Max button

The face should breathe, blink, and sit inside a flickering CRT bezel
with a sweeping scanline. That confirms:

1. The shared `@proxyface/core` package resolves correctly from every app
2. The Tailwind preset (and its CRT design tokens) is active everywhere
3. The shared CSS/animations load
4. The platform context wiring works

---

## Tech stack

| Concern | Choice |
|---|---|
| Monorepo | pnpm workspaces + Turborepo |
| Framework | React 18 + TypeScript 5 |
| Bundler | Vite 5 |
| Styling | Tailwind CSS 3 (shared preset) |
| Extension format | Manifest V3 (Chrome + Firefox) |
| ML runtime *(step 3)* | `@xenova/transformers` on ONNX Runtime Web |
| Vision *(step 5)* | `@mediapipe/tasks-vision` |
| Voice *(step 6)* | Native Web Speech API |

---

## Privacy

No data ever leaves your device. ProxyFace makes zero network requests
for inference. The only outbound traffic on first install is fetching
the quantized ML model (~5 MB) from the extension/web bundle itself,
after which it's cached in IndexedDB. The full privacy policy lives
alongside the store listings (step 8).

---

## License

MIT.
