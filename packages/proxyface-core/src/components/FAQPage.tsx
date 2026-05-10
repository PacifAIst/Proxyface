/**
 * FAQPage — answers common questions about ProxyFace.
 * Rendered inline below the showroom on the landing page.
 */
import { useState } from 'react';

interface FAQItem {
  q: string;
  a: string;
}

const FAQS: FAQItem[] = [
  {
    q: 'Does ProxyFace send any data to the cloud?',
    a: 'Never. The emotion classifier (a 4 MB TinyBERT model) runs entirely in your browser using WebGPU or WebAssembly. Your text, microphone input, and API keys never leave your machine. ProxyFace has zero telemetry and makes no network calls of its own.',
  },
   {
    q: 'How do I use Hands-Free (HF) mode? Is it really useful for language learning?',
    a: 'Absolutely! Just tap the HF button in your chat panel and start talking—it automatically sends your message whenever you pause. It’s a total game-changer for language practice. Just set your input and output languages (e.g., Spanish in / Japanese out) and dive into a natural, completely hands-free conversation!',
  },
  {
    q: 'What LLMs does it work with?',
    a: 'ProxyFace works with ANY LLM providers with an API: OpenAI, OpenRouter (200+ models), DeepSeek, Qwen, GLM, Grok, Mistral, Ollama, LM Studio server... or ANY custom OpenAI-compatible endpoint.',
  },
  {
    q: 'How to use the FREE OpenRouter LLMs?',
    a: 'Go to your Proxyface Settings, select OpenRouter and the model openrouter/free, paste your API (you need to create a free account at OpenRouter.com) and click SAVE & CLOSE.',
  },
  {
    q: 'How to run it with a local LLM Server — no internet at all?',
    a: 'Install Ollama or LM Studio, downlaod and load any local model (e.g., Llama.GGUF), start the local server, then go to the Proxyface Settings, select e.g., LM Studio and click SAVE & CLOSE.',
  },
  {
    q: 'How does the emotion detection work?',
    a: 'As the LLM streams its reply, each text chunk is fed to a fine-tuned TinyBERT classifier running in a Web Worker. It outputs one of 8 emotions (IDLE, THINKING, HAPPY, SAD, ANGRY, SURPRISED, EXPLAINING, ERROR) with a confidence score and drives the face animation in real time.',
  },
  {
    q: 'How do I add my own character?',
    a: 'Create a folder under sprites/art/ with three files: atlas.png (4096×2048 sprite sheet, 16 columns × 8 rows × 256px cells), pupil.png (your pupil overlay), and manifest.json (copied from the _TEMPLATE folder). Drop the folder in, rerun the sync script, and your character appears automatically.',
  },
  {
    q: 'The face is reacting too fast / too slow. Can I tune it?',
    a: 'Yes — the minimum hold time between emotion switches is 1800ms by default, set in useProxyFaceState.ts as MIN_HOLD_MS. Increase it for calmer transitions, decrease it for snappier reactions. Eye anchor positions per emotion are tunable in each character\'s manifest.json.',
  },
  {
    q: 'Does the microphone work offline?',
    a: 'Yes on Chrome/Edge — they use the browser\'s built-in speech recognition which can work locally. Firefox does not support the Web Speech API. The mic button shows only when supported.',
  },
  {
    q: 'Is there a desktop app?',
    a: 'An Electron wrapper is included for running ProxyFace as a native always-on-top window. Run pnpm install in apps/desktop and start it with NODE_ENV=development npx electron . from that folder (requires the web dev server to be running). A packaged .exe is in the github releases with a .sh for Linux.',
  },
  {
    q: 'Can I use my own API key safely, and how to remove my API key?',
    a: 'API keys are stored in browser localStorage, which is scoped to the site origin and never transmitted by ProxyFace itself. Nonetheless, you can remove your local keys anytime clicking the button "FLUSH KEYS" in the Settings and then click SAVE & CLOSE.',
  },
  {
    q: 'How about your legal policy, cookies and privacy policy?',
    a: '© 2026 Manuel Herrador Muñoz, Spain | yes@proxyface.com | Under LSSI-CE & GDPR: Zero tracking cookies used; Cloudflare logs connections solely for security. We store no user data/APIs. Software is provided "as is" without liability for damages.',
  },
];

export function FAQPage() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section className="w-full font-mono">
      <h2 className="mb-4 text-[12px] uppercase tracking-widest text-phosphor-dim">
        ✦ Frequently Asked Questions ✦
      </h2>
      <div className="divide-y divide-crt-700 rounded-sm border border-crt-700">
        {FAQS.map((item, i) => (
          <div key={i}>
            <button
              type="button"
              onClick={() => setOpen(open === i ? null : i)}
              className="flex w-full items-start justify-between gap-4 px-4 py-3 text-left text-[11px] uppercase tracking-widest text-phosphor transition-colors hover:bg-crt-800/40"
            >
              <span>{item.q}</span>
              <span className={`shrink-0 text-phosphor-dim transition-transform ${open === i ? 'rotate-90' : ''}`}>›</span>
            </button>
            {open === i && (
              <div className="border-t border-crt-700 bg-crt-950/60 px-4 py-3 text-[11px] normal-case leading-relaxed tracking-normal text-phosphor">
                {item.a}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
