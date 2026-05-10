# ProxyFace Privacy Policy

*Last updated: 2026-04-24*

ProxyFace is an extension and web application that runs entirely on
your device. This policy exists to explain, specifically and without
weasel words, what happens to data while you use it.

## The short version

**ProxyFace does not collect, transmit, or store any of your data on
any server.** There is no account, no login, no telemetry, no analytics,
no ads. The extension and the web app never make network requests at
runtime for anything other than loading their own code and model
files.

## What ProxyFace can access

To function, ProxyFace reads the following from your browser and
device. All of this stays on your machine.

### Text on supported LLM websites

The extension's content script reads visible text from assistant
responses on the following sites:

- `chat.openai.com`, `chatgpt.com` (ChatGPT)
- `claude.ai` (Claude)
- `gemini.google.com` (Gemini)

The script observes DOM changes via `MutationObserver` and extracts
only the assistant's response text — not your prompts, not your
account details, not any UI chrome. The extracted text is used to
classify the most recent sentence into one of 8 emotion categories
(e.g. HAPPY, THINKING, ERROR). It is **never transmitted off the
device**.

### Microphone (only when you click "Start mic")

Voice input uses your browser's built-in `SpeechRecognition` API.
ProxyFace never accesses your microphone until you explicitly click
the **Start mic** button. Recognition runs through your browser's
native speech engine; on most Chromium-based browsers this is a
cloud service operated by the browser vendor (Google). That data
flow is controlled by your browser, not by ProxyFace. If you want
fully local speech recognition, you can disable voice input.

### Camera (only when you click "Enable Camera")

Eye tracking uses the MediaPipe Face Landmarker model, which runs
entirely in your browser via WebAssembly / WebGPU. ProxyFace never
accesses your camera until you explicitly click the **Enable
Camera** button. Video frames are processed in memory only — they
are never recorded, never saved to disk, and never transmitted.

### Model files (loaded once, cached)

On first use, the extension loads the following files from its own
packaged assets (no network request):

- An 8-class emotion classifier (~5 MB INT8 TinyBERT, trained
  offline — see the Reproducibility section of the README)
- The MediaPipe Face Landmarker model (~4 MB, bundled)
- A pixel art sprite atlas (~100 KB)

The standalone web app at `proxyface.example.com` loads the same
files, either from its own origin or (for MediaPipe only) from the
jsDelivr CDN. You can self-host the web app to eliminate this one
CDN dependency — the extension version never does.

## What ProxyFace does NOT do

- Send any data to ProxyFace servers (we don't operate any).
- Send any data to Anthropic, OpenAI, Google, or any other third
  party, except as noted above for the browser's built-in speech
  recognition (which is a browser feature, not a ProxyFace feature).
- Store any identifying information about you — no user ID, no
  session ID, no device fingerprint.
- Track your browsing history beyond the active LLM tab the
  extension is observing.
- Persist your camera video, microphone audio, or LLM text to
  `localStorage`, `IndexedDB`, or any other storage mechanism.

## What ProxyFace DOES store (locally only)

- Your preferences (e.g. whether you've enabled the camera) in
  `chrome.storage.local` / `browser.storage.local`. This never
  leaves your device.
- The cached ONNX model and MediaPipe WASM files, cached by the
  browser's standard HTTP cache. Clearable via your browser's
  "clear cache" feature.

## Cookies, tracking, ads

None. ProxyFace has no cookies of its own. The web app sets no
cookies. There are no advertising partners, no analytics SDKs, no
tracking pixels.

## Changes to this policy

If this policy ever changes, the updated version will be published
at this URL and the "Last updated" date will be revised. We'll also
note changes in the extension's update notes on the Chrome Web
Store and Firefox Add-ons listings.

## Contact

If you think any claim in this policy is incorrect or misleading,
please open an issue at https://github.com/anthropic/proxyface or
email yes@proxyface.com.
