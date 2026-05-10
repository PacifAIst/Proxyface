/**
 * EasterEgg — triggered by 33 clicks on the logo in under 6 seconds.
 * Plays /sounds/easter.mp3 and shows a glitchy hacker popup.
 */
import { useEffect, useRef, useState } from 'react';

const CLICKS_REQUIRED = 33;
const WINDOW_MS = 6000;

export function useEasterEgg() {
  const clicksRef = useRef<number[]>([]);
  const [triggered, setTriggered] = useState(false);

  function handleLogoClick() {
    const now = Date.now();
    clicksRef.current.push(now);
    clicksRef.current = clicksRef.current.filter((t) => now - t < WINDOW_MS);
    if (clicksRef.current.length >= CLICKS_REQUIRED) {
      clicksRef.current = [];
      setTriggered(true);
      try {
        const audio = new Audio('/easter.mp3');
        audio.volume = 0.7;
        audio.play().catch(() => {});
      } catch {}
    }
  }

  function dismiss() {
    setTriggered(false);
  }

  return { handleLogoClick, triggered, dismiss };
}

const GLITCH_CHARS = '!@#$%^&*<>?/|{}[]01';

function glitch(text: string, intensity: number): string {
  return text
    .split('')
    .map((c) =>
      Math.random() < intensity
        ? GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)]
        : c,
    )
    .join('');
}

export function EasterEggModal({ onDismiss }: { onDismiss: () => void }) {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setFrame((f) => f + 1), 80);
    return () => clearInterval(id);
  }, []);

  const intensity = 0.04 + Math.sin(frame * 0.3) * 0.03;
  const glow = 20 + Math.sin(frame * 0.2) * 10;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/90">
      <div
        className="relative mx-4 w-full max-w-lg rounded border border-green-500 bg-black p-8 font-mono"
        style={{ boxShadow: `0 0 ${glow}px rgba(0,255,0,0.4)` }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Scanlines */}
        <div
          className="pointer-events-none absolute inset-0 rounded opacity-10"
          style={{
            background:
              'repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,255,0,0.15) 2px,rgba(0,255,0,0.15) 4px)',
          }}
        />

        {/* Header */}
        <div className="mb-6 text-center">
          <div
            className="text-2xl font-bold text-green-400"
            style={{ textShadow: '0 0 10px #00ff00, 0 0 20px #00ff00' }}
          >
            {glitch('[ EASTER EGG FOUND ]', intensity)}
          </div>
          <div className="mt-1 text-[10px] text-green-600">
            {glitch('ACCESS GRANTED :: LEVEL 99', intensity * 0.5)}
          </div>
        </div>

        {/* Fake terminal lines */}
        <div className="mb-6 space-y-1 text-[11px] text-green-700">
          {['DECRYPTING PAYLOAD...', 'BYPASSING FIREWALL...', 'LOADING SECRET...'].map(
            (line, i) => (
              <div key={i} style={{ opacity: 0.4 + i * 0.2 }}>
                {'> '}{glitch(line, intensity * 0.3)}
              </div>
            ),
          )}
        </div>

        {/* Main message */}
        <div className="space-y-4 text-sm text-green-300">
          <p className="leading-relaxed" style={{ textShadow: '0 0 6px rgba(0,255,0,0.5)' }}>
            {glitch('Easter Egg found!', intensity * 0.2)} Download this zip:
          </p>
          <a
            href="https://manolo.tel/easter.zip"
            target="_blank"
            rel="noreferrer"
            className="block break-all rounded border border-green-700 bg-green-950/40 px-3 py-2 text-green-400 hover:border-green-400 hover:text-green-300"
            style={{ textShadow: '0 0 8px rgba(0,255,0,0.6)' }}
          >
            {glitch('https://manolo.tel/easter.zip', intensity * 0.1)}
          </a>
          <p className="leading-relaxed">
            {glitch('Find the hint at:', intensity * 0.2)}
          </p>
          <a
            href="https://youtu.be/g7w61X5ryIk"
            target="_blank"
            rel="noreferrer"
            className="block break-all rounded border border-green-700 bg-green-950/40 px-3 py-2 text-green-400 hover:border-green-400 hover:text-green-300"
            style={{ textShadow: '0 0 8px rgba(0,255,0,0.6)' }}
          >
            {glitch('https://youtu.be/g7w61X5ryIk', intensity * 0.1)}
          </a>
        </div>

        <button
          type="button"
          onClick={onDismiss}
          className="mt-6 w-full border border-green-700 bg-transparent py-2 text-[10px] uppercase tracking-widest text-green-600 hover:border-green-400 hover:text-green-300"
        >
          {glitch('[ CLOSE TERMINAL ]', intensity * 0.3)}
        </button>
      </div>
    </div>
  );
}
