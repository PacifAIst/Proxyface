import { useEffect, useState } from 'react';

const DISCLAIMER_KEY = 'proxyface_disclaimer_v1';

export function useCookieBar() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    try { if (!localStorage.getItem(DISCLAIMER_KEY)) setVisible(true); } catch { setVisible(true); }
  }, []);
  function dismiss() {
    try { localStorage.setItem(DISCLAIMER_KEY, '1'); } catch {}
    setVisible(false);
  }
  return { visible, dismiss };
}

export function CookieBar({ onDismiss, onTerms, onPrivacy }: {
  onDismiss: () => void; onTerms: () => void; onPrivacy: () => void;
}) {
  return (
    <div className="fixed z-[990] font-mono"
      style={{ bottom: '44px', left: '50%', transform: 'translateX(-50%)', width: 'min(680px, calc(100vw - 32px))' }}>
      <div className="rounded-sm border border-sky-500/40 bg-sky-950/95 px-3 py-1.5 shadow-[0_0_20px_rgba(14,165,233,0.2)] backdrop-blur-sm">
        <div className="flex items-center justify-between gap-3 text-[9px] text-sky-300/80 whitespace-nowrap">
          <span>
            Runs 100% local — zero data collected, zero servers.{' '}
            <button onClick={onTerms} className="underline hover:text-sky-100">Terms</button>
            {' '}·{' '}
            <button onClick={onPrivacy} className="underline hover:text-sky-100">Privacy</button>
            {' '}— your API key is never sent to us.
          </span>
          <button onClick={onDismiss}
            className="shrink-0 rounded-sm border border-sky-500/50 px-2 py-0.5 text-[8px] uppercase tracking-widest text-sky-400/80 hover:border-sky-300 hover:text-sky-200">
            Got it ✕
          </button>
        </div>
      </div>
    </div>
  );
}

function S({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-2">
      <h3 className="mb-0.5 text-[10px] font-bold uppercase tracking-widest text-phosphor">{title}</h3>
      <div className="text-[10px] leading-relaxed text-phosphor">{children}</div>
    </div>
  );
}
function X({ href, children }: { href: string; children: React.ReactNode }) {
  return <a href={href} target="_blank" rel="noreferrer" className="underline hover:text-phosphor-glow">{children}</a>;
}

export function TermsPage() {
  return (
    <article className="font-mono text-phosphor">
      <p className="mb-2 text-[9px] text-phosphor-dim">GPL-3.0 · 2026</p>
      <S title="No warranty">Provided "AS IS". Authors not liable for any damages.</S>
      <S title="Your API key, your bill">ProxyFace never proxies or stores your credentials. Any costs with OpenAI, Anthropic, or other providers are between you and them.</S>
      <S title="Limitation of liability">Not liable for LLM costs, generated content, or emotion classification accuracy.</S>
      <S title="Contact">yes@proxyface.com</S>
    </article>
  );
}

export function PrivacyPage() {
  return (
    <article className="font-mono text-phosphor">
      <p className="mb-2 text-[9px] text-phosphor-dim">2026</p>
      <S title="We collect nothing">No analytics, telemetry, cookies, or servers. Everything runs in your browser.</S>
      <S title="Local storage only">API keys, preferences, history — stored in your browser localStorage only, never transmitted.</S>
      <S title="Third-party providers you choose">
        Prompts go directly to the provider:{' '}
        <X href="https://openai.com/policies/privacy-policy">OpenAI</X>{' · '}
        <X href="https://www.anthropic.com/legal/privacy">Anthropic</X>{' · '}
        <X href="https://policies.google.com/privacy">Google</X>
      </S>
      <S title="Verifiable"><X href="https://github.com/PacifAIst/Proxyface">github.com/PacifAIst/Proxyface</X></S>
    </article>
  );
}

export function SubmitArtPage() {
  return (
    <article className="font-mono text-phosphor space-y-4">
      <div>
        <h2 className="mb-1 text-[13px] uppercase tracking-widest text-phosphor-glow">✦ Submit Your ProxyFace Art ✦</h2>
        <p className="text-[10px] text-phosphor-dim leading-relaxed">
          ProxyFace uses a plug-and-play character system — drop a folder, run the sync script, and your character appears in the showroom. Here's everything you need to know.
        </p>
      </div>

      {/* Technical spec */}
      <div className="rounded-sm border border-crt-700 bg-crt-950 p-3">
        <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-phosphor">Sprite Sheet Specifications</div>
        <div className="grid gap-1 text-[10px] text-phosphor-dim sm:grid-cols-2">
          <div><span className="text-phosphor">File:</span> Single flat PNG, RGB+A, 32-bit, transparent background</div>
          <div><span className="text-phosphor">Size:</span> 4096 × 2048 pixels</div>
          <div><span className="text-phosphor">Grid:</span> 16 columns × 8 rows, each cell exactly 256 × 256 px</div>
          <div><span className="text-phosphor">Padding:</span> Zero padding between cells</div>
          <div><span className="text-phosphor">Style:</span> Classic 1993 pixel art, hard edges, no anti-aliasing</div>
          <div><span className="text-phosphor">Face size:</span> Head 180×200 px centered in each 256×256 cell</div>
          <div><span className="text-phosphor">Eyes:</span> White sclera ONLY — pupils are a separate layer (pupil.png)</div>
          <div><span className="text-phosphor">Lighting:</span> Flat front light, no dynamic shadows between rows</div>
        </div>
        <div className="mt-2 text-[10px] text-phosphor-dim">
          <span className="text-phosphor">Suggested palette:</span>{' '}
          flesh <code className="text-phosphor-glow">#c87941</code> · hair <code className="text-phosphor-glow">#888888</code> · teeth <code className="text-phosphor-glow">#f0e8d0</code>
        </div>
      </div>

      {/* Row order */}
      <div className="rounded-sm border border-crt-700 bg-crt-950 p-3">
        <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-phosphor">Row Order (top to bottom)</div>
        <div className="space-y-1 text-[10px] text-phosphor-dim">
          {[
            ['Row 1 — IDLE', 'Neutral resting face, slight blink cycle'],
            ['Row 2 — THINKING', 'Brow furrowed, eyes narrowed, mouth slightly open, head tilts left frames 8–16'],
            ['Row 3 — HAPPY', 'Wide smile, cheeks raised, eyebrows up, head bobs frames 8–16'],
            ['Row 4 — SAD', 'Brow inner corners raised, mouth corners down, subtle head droop frames 12–16'],
            ['Row 5 — ANGRY', 'Brows hard down and inward, teeth bared, slight forward lean frames 8–16'],
            ['Row 6 — SURPRISED', 'Brows fully raised, mouth wide O, eyes wide, head snaps back frames 1–4'],
            ['Row 7 — EXPLAINING', 'Mouth moves as if talking, shoulder bobs, brows animated'],
            ['Row 8 — ERROR', 'Hand covers forehead (implied), grimace, head shakes frames 8–16'],
          ].map(([label, desc]) => (
            <div key={label} className="flex gap-2">
              <span className="w-40 shrink-0 text-phosphor">{label}</span>
              <span>{desc}</span>
            </div>
          ))}
        </div>
        <div className="mt-2 rounded-sm border border-crt-700/50 bg-crt-900 px-2 py-1.5 text-[9px] text-phosphor-dim">
          <span className="text-phosphor">Animation loop (16 frames):</span> Frames 1–4 intro · 5–12 core loop (12→5 must tile seamlessly) · 13–16 held peak. Include a digital blink (pixel flash) somewhere in the loop — eyes never fully close.
        </div>
      </div>

      {/* AI generation tip */}
      <div className="rounded-sm border border-phosphor/30 bg-crt-900 p-3">
        <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-phosphor-glow">🤖 AI Generation Tip</div>
        <p className="text-[10px] text-phosphor-dim leading-relaxed">
          The only AI tool that has reliably generated correctly-gridded sprite sheets is{' '}
          <span className="font-bold text-phosphor">Kimi 2.6 in agent mode</span> (kimi.com, free tier).
          Use <strong>agent mode</strong> — NOT standard chat. Attach an existing atlas.png as reference, then paste the full technical spec above.
          Iterate emotion row by row until all 8 look correct. Generate pupil.png separately as a matching grid.
        </p>
      </div>

      {/* Two options */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-sm border border-crt-700 bg-crt-950 p-3 flex flex-col gap-2">
          <div className="text-[10px] font-bold uppercase tracking-widest text-phosphor">Option A — Email</div>
          <div className="text-[10px] text-phosphor-dim">
            Attach <span className="text-phosphor">atlas.png + pupil.png + manifest.json</span>:
          </div>
          <div className="text-[12px] font-bold text-phosphor-glow text-center py-1">yes@proxyface.com</div>
          <div className="rounded-sm border border-amber-500/40 bg-amber-500/10 px-2 py-1.5 text-[9px] text-amber-400">
            ⚠ Test all 8 emotions locally first. Pupils must sit correctly inside the eyes (.json file). Untested art or different 3 filenames attached will be auto-rejected (e.g., .ZIP is removed).
          </div>
        </div>
        <div className="rounded-sm border border-crt-700 bg-crt-950 p-3 flex flex-col gap-2">
          <div className="text-[10px] font-bold uppercase tracking-widest text-phosphor">Option B — GitHub PR</div>
          <div className="text-[10px] text-phosphor-dim leading-relaxed">
            Fork → add folder to <span className="text-phosphor">sprites/art/your-name/</span> with atlas.png, pupil.png, manifest.json → run <span className="text-phosphor">node scripts/sync-sprites.mjs</span> → open PR with screenshot of all 8 rows.
          </div>
          <a href="https://github.com/PacifAIst/Proxyface" target="_blank" rel="noreferrer"
            className="text-[10px] underline text-phosphor-dim hover:text-phosphor-glow">
            github.com/PacifAIst/Proxyface
          </a>
        </div>
      </div>
    </article>
  );
}
