import { useState } from 'react';
import { useSettings } from '../hooks/useSettings';
import { CharacterShowroom } from './CharacterShowroom';
import { CookieBar, useCookieBar } from './LegalPages';
import {
  SiteHeader, SiteFooter, EasterEggRain, SiteModal,
  useKonamiCode, useSiteNav,
  type ModalPage,
} from './SiteShell';
import { useEasterEgg, EasterEggModal } from './EasterEgg';

export interface LandingPageProps {
  onEnterDemo: () => void;
  manifestUrl?: string;
  chromeStoreUrl?: string;
  firefoxStoreUrl?: string;
}

export function LandingPage({ onEnterDemo }: LandingPageProps) {
  const { settings, setSettings } = useSettings();
  const [page, setPage] = useSiteNav();
  const { handleLogoClick, triggered, dismiss } = useEasterEgg();
  const [eggActive, setEggActive] = useState(false);
  const [modal, setModal] = useState<ModalPage | null>(null);
  const { visible: cookieVisible, dismiss: cookieDismiss } = useCookieBar();

  useKonamiCode(() => setEggActive(true));

  function handleSelect(id: string) {
    setSettings({ characterId: id });
    onEnterDemo();
  }

  return (
    <div className="relative flex min-h-screen w-screen flex-col overflow-x-hidden bg-crt-950">
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-50"
        style={{ background: 'radial-gradient(ellipse at 50% 25%, rgba(245,185,66,0.08) 0%, rgba(0,0,0,0) 60%)' }} />
      <div className="crt-overlay pointer-events-none absolute inset-0" aria-hidden />

      <SiteHeader
        page={page}
        setPage={setPage}
        onEnterDemo={onEnterDemo}
        logoClickCount={handleLogoClick}
        onModal={setModal}
      />

      <main className="relative z-10 mx-auto flex w-full max-w-[1200px] flex-1 flex-col gap-3 px-4 py-3">
        <div className="rounded-sm border border-crt-700 bg-crt-900/40 p-4 shadow-crt-inset">
          <CharacterShowroom
            onSelect={handleSelect}
            selectedId={settings.characterId}
            onSubmitArt={() => setModal('submit-art')}
          />
        </div>

        <div className="flex-1 rounded-sm border border-crt-700 bg-crt-900/40 px-5 py-4 font-mono">
          <ul className="grid h-full grid-cols-2 gap-x-8 gap-y-2 text-sm text-phosphor">
            <li><span className="text-phosphor-glow">›</span> Learn Languages! — Voice/Mic Chat in Browser, hands-free (HF)</li>
            <li><span className="text-phosphor-glow">›</span> 8 Emotions in a Tiny 4MB Brain — Blazing Local WebGPU Inference</li>
            <li><span className="text-phosphor-glow">›</span> Pinpoint Eye Tracking for Realism — Opt-in Local MediaPipe</li>
            <li><span className="text-phosphor-glow">›</span> Paranoia-Proof Privacy — Zero Data Leaves your PC</li>
            <li><span className="text-phosphor-glow">›</span> Wire ANY LLMs — Cloud Titans or Offline LM Studio, Ollama...</li>
            <li><span className="text-phosphor-glow">›</span> Plug-and-play Characters — Drop Folder, Refresh</li>
            <li><span className="text-phosphor-glow">›</span> 40+ Retro Pixel-art Characters — OR Submit Your Own Art</li>
            <li><span className="text-phosphor-glow">›</span> Free GPL-3.0 — Works in Modern Browers + Windows/Linux Apps</li>
          </ul>
        </div>
      </main>

      <SiteFooter onModal={setModal} />

      {triggered && <EasterEggModal onDismiss={dismiss} />}
      {eggActive && <EasterEggRain active={eggActive} onDismiss={() => setEggActive(false)} />}
      {modal && <SiteModal page={modal} onClose={() => setModal(null)} />}
      {cookieVisible && (
        <CookieBar
          onDismiss={cookieDismiss}
          onTerms={() => setModal('terms')}
          onPrivacy={() => setModal('privacy')}
        />
      )}
    </div>
  );
}
