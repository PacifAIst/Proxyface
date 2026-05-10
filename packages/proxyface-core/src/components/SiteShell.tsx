import { useCallback, useEffect, useRef, useState } from 'react';
import { TermsPage, PrivacyPage, SubmitArtPage } from './LegalPages';
import { FAQPage } from './FAQPage';
import { useTheme } from '../hooks/useTheme';

export type SitePage = 'home';
export type ModalPage = 'terms' | 'privacy' | 'faq' | 'submit-art';

const GITHUB_URL = 'https://github.com/PacifAIst/Proxyface';
export const RELEASES_URL = 'https://github.com/PacifAIst/Proxyface/releases/latest';

export function useSiteNav(): [SitePage, (p: SitePage) => void] {
  const [page] = useState<SitePage>('home');
  return [page, () => {}];
}

// ── Site modal ───────────────────────────────────────────────────────
export function SiteModal({ page, onClose }: { page: ModalPage; onClose: () => void }) {
  const titles: Record<ModalPage, string> = {
    terms: 'Terms of Use', privacy: 'Privacy Policy',
    faq: 'FAQ', 'submit-art': 'Submit Your ProxyFace Art',
  };
  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/80 p-4" onClick={onClose}>
      <div className="relative w-full max-w-2xl rounded-sm border border-crt-600 bg-crt-900 font-mono shadow-crt-inset"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-crt-700 px-4 py-2">
          <span className="text-[10px] uppercase tracking-widest text-phosphor-dim">✦ {titles[page]} ✦</span>
          <button onClick={onClose} className="text-phosphor-dim hover:text-phosphor">✕</button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto p-4">
          {page === 'terms'      && <TermsPage />}
          {page === 'privacy'    && <PrivacyPage />}
          {page === 'faq'        && <FAQPage />}
          {page === 'submit-art' && <SubmitArtPage />}
        </div>
        <div className="border-t border-crt-700 px-4 py-2">
          <button onClick={onClose}
            className="w-full rounded-sm border border-phosphor bg-crt-900 py-1.5 text-[10px] uppercase tracking-widest text-phosphor transition-colors hover:bg-phosphor hover:text-crt-950">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Konami code ──────────────────────────────────────────────────────
const KONAMI = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
export function useKonamiCode(onSuccess: () => void) {
  const seq = useRef<string[]>([]);
  const cb = useCallback(onSuccess, []);
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      seq.current.push(e.key);
      if (seq.current.length > KONAMI.length) seq.current.shift();
      if (seq.current.length === KONAMI.length &&
          seq.current.every((k, i) => k.toLowerCase() === KONAMI[i].toLowerCase())) {
        seq.current = [];
        cb();
      }
    }
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [cb]);
}

// ── Easter egg rain ──────────────────────────────────────────────────
const SYMBOLS = ['♥','★','⬛','◆','♠','⚡','👾','🎮','♟','⌥','◉','▲'];
export function EasterEggRain({ active, onDismiss }: { active: boolean; onDismiss: () => void }) {
  if (!active) return null;
  const items = Array.from({ length: 30 }, (_, i) => ({
    sym: SYMBOLS[i % SYMBOLS.length], left: (i * 3.4) % 100,
    dur: 3 + (i % 5) * 0.6, delay: i * 0.12, size: 28 + (i % 4) * 14,
  }));
  return (
    <>
      <div className="pointer-events-none fixed inset-0 z-[994] overflow-hidden">
        {items.map((it, i) => (
          <div key={i} style={{ position:'absolute', left:`${it.left}%`, top:'-80px',
            fontSize:`${it.size}px`, animation:`pf-fall ${it.dur}s linear ${it.delay}s 1`,
            textShadow:'0 0 12px rgba(245,185,66,0.8)', filter:'drop-shadow(0 0 6px rgba(245,185,66,0.6))' }}>
            {it.sym}
          </div>
        ))}
        <style>{`@keyframes pf-fall{0%{transform:translateY(0) rotate(0deg);opacity:1}80%{opacity:1}100%{transform:translateY(110vh) rotate(360deg);opacity:0}}`}</style>
      </div>
      <div className="fixed inset-0 z-[995] flex items-center justify-center pointer-events-none">
        <div className="pointer-events-auto animate-bounce rounded-sm border-2 border-phosphor bg-crt-900 px-6 py-4 font-mono shadow-[0_0_40px_rgba(245,185,66,0.4)] text-center max-w-sm mx-4">
          <div className="mb-1 text-2xl">👾 ★ ♥ ★ 👾</div>
          <div className="text-[13px] font-bold uppercase tracking-widest text-phosphor-glow mb-2">Secret Unlocked!</div>
          <div className="text-[10px] leading-relaxed text-phosphor mb-3">
            You found a hidden feature 🎮 Send art for <span className="text-phosphor-glow">priority review</span>:
          </div>
          <div className="mb-3 rounded-sm border border-phosphor/50 bg-crt-950 px-3 py-1.5 text-[11px] font-bold text-phosphor-glow">art@proxyface.com</div>
          <div className="mb-3 text-[9px] text-phosphor-dim">Subject: <span className="text-phosphor">SECRET — [character name]</span></div>
          <button onClick={onDismiss}
            className="w-full rounded-sm border border-phosphor bg-crt-900 py-1.5 text-[10px] uppercase tracking-widest text-phosphor transition-colors hover:bg-phosphor hover:text-crt-950">
            ↑↑↓↓ continue
          </button>
        </div>
      </div>
    </>
  );
}

// ── Tutorial modal ───────────────────────────────────────────────────
// ⚠ UPDATE the YouTube ID below when you upload your tutorial video:
const YOUTUBE_ID = 'A8DV9MGaRuw';

export function TutorialModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[998] flex items-center justify-center bg-black/80 p-4" onClick={onClose}>
          {/* Changed max-w-2xl to w-[280px] to make it ~66% smaller and perfectly phone-sized */}
          <div className="relative w-[280px] rounded-sm border border-crt-600 bg-crt-900 font-mono shadow-crt-inset"
            onClick={e => e.stopPropagation()}>
            
            {/* YOUR TOP FRAME (Intact!) */}
            <div className="flex items-center justify-between border-b border-crt-700 px-4 py-3">
              <span className="text-[11px] uppercase tracking-widest text-phosphor-dim">✦ Quick Tutorial ✦</span>
              <button onClick={onClose} className="text-phosphor-dim hover:text-phosphor">✕</button>
            </div>

            {/* THE VIDEO FIX: 177.77% makes it exactly a 9:16 vertical Short */}
            <div className="relative w-full" style={{ paddingBottom: '177.77%' }}>
              <iframe className="absolute inset-0 h-full w-full"
                src={`https://www.youtube.com/embed/${YOUTUBE_ID}?autoplay=1&rel=0`}
                title="ProxyFace Quick Tutorial"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen />
            </div>

            {/* YOUR BOTTOM FRAME (Intact, but made flex-col so it fits the new tiny width) */}
            <div className="flex flex-col items-center justify-center gap-1 border-t border-crt-700 px-4 py-3 text-[9px] uppercase tracking-widest text-phosphor-dim text-center">
              <span>watch · learn · use your ai with a face</span>
              <a href={`https://www.youtube.com/watch?v=${YOUTUBE_ID}`} target="_blank" rel="noreferrer"
                className="hover:text-phosphor mt-1">open in youtube ↗</a>
            </div>

          </div>
        </div>
  );
}

// ── Shared header ────────────────────────────────────────────────────
interface HeaderProps {
  page: SitePage;
  setPage: (p: SitePage) => void;
  onEnterDemo?: () => void;
  onBack?: () => void;
  isDemo?: boolean;
  logoClickCount?: () => void;
  onModal?: (p: ModalPage) => void;
}

export function SiteHeader({ page: _page, setPage: _setPage, onEnterDemo: _onEnterDemo, onBack, isDemo = false, logoClickCount, onModal }: HeaderProps) {
  const [showTutorial, setShowTutorial] = useState(false);
  const [theme, toggleTheme] = useTheme();

  return (
    <>
      <header className="relative z-10 flex items-center justify-between gap-2 border-b border-crt-700 px-5 py-3 shrink-0">
        {/* Ghost title */}
        <div aria-hidden
          className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 select-none whitespace-nowrap font-mono text-[12vw] font-black uppercase leading-none text-phosphor"
          style={{ opacity: 0.035, textShadow:'0 0 40px rgba(245,185,66,0.2)', marginTop:'-1.5vw' }}>
          PROXYFACE
        </div>

        <div className="relative flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest">
          <button type="button" onClick={logoClickCount}
            className="text-[13px] font-bold text-phosphor-glow transition-colors hover:text-phosphor">
            ProxyFace
          </button>
          {isDemo && <span className="text-phosphor-dim">· Demo</span>}
        </div>

        <nav className="relative flex flex-wrap items-center gap-2 font-mono text-[9px] uppercase tracking-widest">
          <button type="button" onClick={() => setShowTutorial(true)}
            className="rounded-sm border border-amber-500/60 bg-amber-500/10 px-2 py-0.5 text-amber-400 hover:bg-amber-500/20 transition-colors"
            style={{ animation:'pulse 2s ease-in-out infinite' }}>
            ▶ Tutorial
          </button>
          <a href={GITHUB_URL} target="_blank" rel="noreferrer"
            className="rounded-sm border border-yellow-500/50 bg-yellow-500/10 px-2 py-0.5 text-yellow-400 hover:bg-yellow-500/20 transition-colors">
            ★ Star us
          </a>
          <span className="text-crt-700">·</span>
          {!isDemo && (
            <><button type="button" className="text-phosphor">Home</button>
              <span className="text-crt-700">·</span>
            </>
          )}
          <button type="button" onClick={() => onModal?.('faq')}
            className="text-phosphor-dim hover:text-phosphor transition-colors">FAQ</button>
          {isDemo && onBack && (
            <><span className="text-crt-700">·</span>
              <button type="button" onClick={onBack}
                className="rounded-sm border border-crt-700 px-2 py-0.5 text-phosphor-dim hover:border-phosphor hover:text-phosphor transition-colors">
                ‹ Home
              </button>
            </>
          )}
          <span className="text-crt-700">·</span>
          {/* Theme toggle — replaces GitHub button on far right */}
          <button type="button" onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="rounded-sm border border-crt-700 bg-crt-900 px-2 py-0.5 text-[12px] transition-colors hover:border-phosphor hover:text-phosphor">
            {theme === 'dark' ? '☀' : '🌙'}
          </button>
        </nav>
      </header>
      {showTutorial && <TutorialModal onClose={() => setShowTutorial(false)} />}
    </>
  );
}

// ── Shared footer ────────────────────────────────────────────────────
export function SiteFooter({ onModal }: { onModal?: (p: ModalPage) => void }) {
  return (
    <footer className="relative z-10 shrink-0 border-t border-crt-700 px-5 py-2 font-mono">
      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[9px] uppercase tracking-widest text-phosphor-dim">
        <span>ProxyFace · GPL-3.0</span>
        <span className="text-crt-700">·</span>
        <button onClick={() => onModal?.('terms')} className="hover:text-phosphor transition-colors">Terms</button>
        <span className="text-crt-700">·</span>
        <button onClick={() => onModal?.('privacy')} className="hover:text-phosphor transition-colors">Privacy</button>
        <span className="text-crt-700">·</span>
        <button onClick={() => onModal?.('faq')} className="hover:text-phosphor transition-colors">FAQ</button>
        <span className="text-crt-700">·</span>
        <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="hover:text-phosphor transition-colors">
          github.com/PacifAIst/Proxyface
        </a>
        <span className="text-crt-700">·</span>
        <a href="mailto:yes@proxyface.com" target="_blank" rel="noreferrer" className="hover:text-phosphor transition-colors">
          Contact
        </a>
      </div>
    </footer>
  );
}
