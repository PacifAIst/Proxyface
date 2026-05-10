<p align="center">
██████╗ ██████╗  ██████╗ ██╗  ██╗██╗   ██╗███████╗ █████╗  ██████╗███████╗
██╔══██╗██╔══██╗██╔═══██╗╚██╗██╔╝╚██╗ ██╔╝██╔════╝██╔══██╗██╔════╝██╔════╝
██████╔╝██████╔╝██║   ██║ ╚███╔╝  ╚████╔╝ █████╗  ███████║██║     █████╗  
██╔═══╝ ██╔══██╗██║   ██║ ██╔██╗   ╚██╔╝  ██╔══╝  ██╔══██║██║     ██╔══╝  
██║     ██║  ██║╚██████╔╝██╔╝ ██╗   ██║   ██║     ██║  ██║╚██████╗███████╗
╚═╝     ╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═╝   ╚═╝   ╚═╝     ╚═╝  ╚═╝ ╚═════╝╚══════╝
</p>

> **Your AI now has a face, emotions, ears, voice, eyes — and a soul.**  
> 100% local inference. Zero telemetry. Zero cloud. Just vibes.

![ProxyFace Landing Page — dark mode with Preteen character selected](docs/screenshots/1_landing_dark.png)

ProxyFace renders a pixel-art avatar that reacts in **real time** to LLM output via a 4 MB TinyBERT emotion model running entirely on your GPU (WebGPU) or CPU (WASM). It listens, speaks, watches your eyes, and never sends a single byte of your conversation anywhere.

---

## ✨ What makes it special

### 🎧 Hands-Free (HF) — learn languages while you talk
Hold **Alt+T** to speak. Release to send. The AI replies in your target language with its face reacting to every word — embarrassed, curious, delighted. No typing. No clicking. Just conversation.

> *"I use it to practice Japanese. The pumpkin face going SURPRISED every time I say something wrong is weirdly motivating."*

### 🧠 4 MB emotion brain — runs at 60 ms on your GPU
TinyBERT INT8 ONNX, trained on 3 200 sentences across 8 emotions. Runs via WebGPU in Chrome — no Python, no server, no API key for inference. The face reacts to the AI's output, not yours.

### 🎨 40+ pixel-art characters — or submit your own
![Character gallery — Dev, Daruma, Console, Terminator](docs/screenshots/3_characters.png)

Drop a sprite sheet in `sprites/art/yourname/` and run one sync script. Your character appears instantly. [Submit it to us](#submit-your-art) for priority review and a place in the official gallery.

### 👁️ Eye tracking — opt-in, on-device
MediaPipe face landmarker runs locally. The pupils follow your gaze. No video ever leaves your machine.

### 🔊 Voice I/O — bot mode, natural mode, or silent
- **Bot mode**: typewriter sound while the AI streams
- **Natural mode**: browser TTS reads the reply aloud
- **HF mode**: hold Alt+T → speak → auto-send → AI replies

### 🔒 Privacy-proof
Zero network calls for inference. Your API key lives in `localStorage`, never transmitted to us. GPL-3.0 — read every line.

---

## Screenshots

| Dark mode | Light mode |
|-----------|------------|
| ![Landing dark](docs/screenshots/1_landing_dark.png) | ![Landing light](docs/screenshots/2_landing_light.png) |

![Demo — Pumpkin character, HF listening mode active, emotion IDLE](docs/screenshots/4_demo_pumpkin.png)

---

## 🚀 Quickstart

### Web (browser, any OS)
```bash
git clone https://github.com/PacifAIst/Proxyface.git
cd Proxyface
pnpm install
cd apps/web && pnpm dev
# open http://localhost:5173
```

### Windows desktop app
Download **[ProxyFace Setup 0.1.0.exe](https://github.com/PacifAIst/Proxyface/releases/latest)** from Releases.  
> Windows SmartScreen may appear — click **More info → Run anyway**. This is expected for unsigned indie apps.

### Mock mode (no API key needed)
Visit `http://localhost:5173/?mock=1` — uses a regex classifier instead of the neural model. Good for UI testing.

---

## 🎮 Secret easter eggs

There are hidden features. 

---

## 🎨 Submit your art

Want your character in the official gallery?

**Specs:** 4096×2048 PNG · 16 columns × 8 rows · 256×256 px per cell · 8 emotion rows · transparent background · 1993 pixel-art style

**Best AI tool for generation:** [Kimi 2.6 in agent mode](https://kimi.com) (free tier) — attach an existing atlas as reference.

- **Email:** `art@proxyface.com` — subject: `[CHARACTER NAME]`
- **GitHub PR:** fork → add `sprites/art/yourname/` → open PR with screenshot of all 8 emotion rows

---

## ⚙️ Tech stack

| Concern | Choice |
|---|---|
| Monorepo | pnpm workspaces + Turborepo |
| Framework | React 18 + TypeScript 5 |
| Bundler | Vite 5 |
| Styling | Tailwind CSS 3 (shared CRT preset) |
| Emotion model | TinyBERT INT8 ONNX via `@huggingface/transformers` |
| ML runtime | ONNX Runtime Web (WebGPU + WASM fallback) |
| Vision | `@mediapipe/tasks-vision` (on-device) |
| Voice | Web Speech API + browser TTS |
| Desktop | Electron 30 |

---

## 🔧 Development

```bash
pnpm install          # install everything
cd apps/web
pnpm dev              # http://localhost:5173

# Sync sprites + models into public/ before building
pnpm sync-assets

# Production build
pnpm build
```

### Retrain the emotion model
Open `proxyface_train_v9.ipynb` in Google Colab (T4 GPU).  
Upload `proxyface_emotions.jsonl` → Run All → download zip → drop into `packages/proxyface-core/src/assets/models/emotion/`.

---

## 📁 Repository layout

```
proxyface/
├── apps/
│   ├── desktop/             # Electron wrapper
│   └── web/                 # Standalone web app (also embedded in desktop)
└── packages/
    └── proxyface-core/      # Shared React components, hooks, ML worker, design tokens
        └── src/
            ├── assets/models/emotion/   # TinyBERT INT8 ONNX + tokenizer
            └── assets/sprites/art/      # Character sprite sheets
```

---

## 📄 License

**GPL-3.0** — free to use, fork, and modify. Derivative works must remain open source.  
Training data and notebook are not included in the repository (proprietary dataset).

---

## ⭐ Star us

If ProxyFace made your AI feel alive, [give us a star](https://github.com/PacifAIst/Proxyface) — it helps more than you think.

Contact: [yes@proxyface.com](mailto:yes@proxyface.com)
