import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useEyeTracker } from '../hooks/useEyeTracker';
import { useExtensionStreamBridge } from '../hooks/useExtensionStreamBridge';
import { useLocalEmotion } from '../hooks/useLocalEmotion';
import { useMockEmotion } from '../hooks/useMockEmotion';
import { useSettings } from '../hooks/useSettings';
import { useCharacterIndex } from '../hooks/useCharacterIndex';
import { useEasterEgg, EasterEggModal } from './EasterEgg';
import { EyeTrackerControls } from './EyeTrackerControls';
import { LLMChatPanel } from './LLMChatPanel';
import { PerfMonitor } from './PerfMonitor';
import { PixelFrame } from './PixelFrame';
import { ProxyFaceCanvas } from './ProxyFaceCanvas';
import { SettingsPanel } from './SettingsPanel';
import { CookieBar, useCookieBar } from './LegalPages';
import {
  SiteHeader, SiteFooter, SiteModal,
  EasterEggRain, useKonamiCode, useSiteNav,
  type ModalPage,
} from './SiteShell';

export interface ProxyFaceWorkstationProps {
  useMock?: boolean;
  modelBaseUrl?: string;
  manifestUrl?: string;
  spritesBaseUrl?: string;
  visionWasmBaseUrl?: string;
  visionModelUrl?: string;
  pupilTravelPx?: number;
  enableExtensionBridge?: boolean;
  showHeader?: boolean;
  onBack?: () => void;
  extensionMode?: boolean;
  /** Override active character on mount -- used by ?proxyface=id URL param. */
  initialCharacterId?: string;
}

export function ProxyFaceWorkstation({
  useMock = false,
  modelBaseUrl,
  manifestUrl,
  spritesBaseUrl = '/sprites/',
  visionWasmBaseUrl,
  visionModelUrl,
  pupilTravelPx = 10,
  enableExtensionBridge = false,
  showHeader = true,
  onBack,
  extensionMode = false,
  initialCharacterId,
}: ProxyFaceWorkstationProps) {
  // Let the inner shell resolve manifestUrl from live settings.
  // Pre-resolving here bakes stale state into a prop that never updates.
  const shared = {
    manifestUrl,   // raw -- undefined lets inner resolve from settings
    spritesBaseUrl,
    visionWasmBaseUrl,
    visionModelUrl,
    pupilTravelPx,
    enableExtensionBridge: extensionMode || enableExtensionBridge,
    showHeader,
    onBack,
    extensionMode,
    initialCharacterId,
  };

  return useMock
    ? <MockContent {...shared} />
    : <RealContent {...shared} modelBaseUrl={modelBaseUrl} />;
}

interface InnerProps {
  manifestUrl?: string;
  spritesBaseUrl: string;
  visionWasmBaseUrl?: string;
  visionModelUrl?: string;
  pupilTravelPx: number;
  enableExtensionBridge: boolean;
  showHeader: boolean;
  onBack?: () => void;
  extensionMode: boolean;
  initialCharacterId?: string;
}

function RealContent({ modelBaseUrl, ...rest }: InnerProps & { modelBaseUrl?: string }) {
  return <WorkstationShell engine={useLocalEmotion({ modelBaseUrl })} {...rest} />;
}
function MockContent(props: InnerProps) {
  return <WorkstationShell engine={useMockEmotion()} {...props} />;
}

function WorkstationShell({
  engine, manifestUrl, spritesBaseUrl, visionWasmBaseUrl, visionModelUrl,
  pupilTravelPx, enableExtensionBridge, showHeader, onBack, extensionMode,
  initialCharacterId,
}: InnerProps & { engine: ReturnType<typeof useLocalEmotion> }) {

  const { settings, setSettings, toProviderConfig } = useSettings();

  // After mount, initialCharacterId no longer applies -- live settings win.
  const hasMountedRef = useRef(false);

  // Persist URL char to settings on mount (once).
  useEffect(() => {
    if (hasMountedRef.current) return;
    hasMountedRef.current = true;
    if (initialCharacterId && settings.characterId !== initialCharacterId) {
      setSettings({ characterId: initialCharacterId });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // First render: initialCharacterId wins. After mount: live settings only.
  const effectiveCharacterId = hasMountedRef.current
    ? settings.characterId
    : (initialCharacterId ?? settings.characterId);

  // Resolve from live effectiveCharacterId; caller-provided manifestUrl overrides.
  const resolvedManifestUrl = manifestUrl
    ?? `${spritesBaseUrl}art/${effectiveCharacterId || 'placeholder'}/manifest.json`;

  const [settingsOpen, setSettingsOpen] = useState(false);
  const providerConfig = extensionMode ? null : toProviderConfig();

  // When coming from a share link (?proxyface=cat#/demo), clicking Home
  // must strip the query param so the parent router doesn't send us back
  // to the demo view. We mutate the URL silently via replaceState first.
  const handleBack = useCallback(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.has('proxyface')) {
      url.searchParams.delete('proxyface');
      window.history.replaceState(null, '', url.toString());
    }
    onBack?.();
  }, [onBack]);

  const { handleLogoClick, triggered, dismiss } = useEasterEgg();
  const [page, setPage] = useSiteNav();
  const [eggActive, setEggActive] = useState(false);
  const [modal, setModal] = useState<ModalPage | null>(null);
  const { visible: cookieVisible, dismiss: cookieDismiss } = useCookieBar();

  useKonamiCode(() => setEggActive(true));

  const { index: charIndex } = useCharacterIndex();
  const currentChar = charIndex.characters.find(
    c => c.id === (effectiveCharacterId || 'placeholder'),
  );

  const tracker = useEyeTracker({ wasmBaseUrl: visionWasmBaseUrl, modelUrl: visionModelUrl });

  const onBridgeDelta = useCallback((delta: string) => engine.pushText(delta), [engine]);
  const onBridgeStreamStart = useCallback(() => engine.reset(), [engine]);
  useExtensionStreamBridge({
    onDelta: onBridgeDelta,
    onStreamStart: onBridgeStreamStart,
    disabled: !enableExtensionBridge,
  });

  const pupilOffset = useMemo(
    () => ({ x: tracker.position.x * pupilTravelPx, y: tracker.position.y * pupilTravelPx }),
    [tracker.position.x, tracker.position.y, pupilTravelPx],
  );

  const { avatarSize, isNarrow } = useResponsiveLayout();

  return (
    <div className="relative flex min-h-screen w-screen flex-col overflow-x-hidden bg-crt-950">
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-40"
        style={{ background: 'radial-gradient(ellipse at 50% 30%, rgba(245,185,66,0.04) 0%, rgba(0,0,0,0) 55%)' }} />

      {showHeader && (
        <SiteHeader
          page={page}
          setPage={setPage}
          onBack={handleBack}
          isDemo={true}
          logoClickCount={handleLogoClick}
          onModal={setModal}
        />
      )}

      <main className={`relative z-10 grid flex-1 min-h-0 gap-4 overflow-hidden px-5 py-4 ${
        extensionMode ? 'grid-cols-1' : isNarrow ? 'grid-cols-1' : 'grid-cols-[minmax(0,1fr)_420px]'
      }`}>
        <section className="relative flex min-h-0 items-center justify-center overflow-hidden">
          <PixelFrame>
            <ProxyFaceCanvas
              manifestUrl={resolvedManifestUrl}
              emotion={engine.result?.emotion ?? null}
              pupilOffset={pupilOffset}
              size={avatarSize}
              forceEmotionChange={false}
            />
          </PixelFrame>
        </section>

        <section className="flex min-h-0 flex-col gap-3 overflow-y-auto pr-1">
          {extensionMode ? (
            <>
              <div className="rounded-sm border border-crt-700 bg-crt-900/70 p-3 font-mono text-sm text-phosphor shadow-crt-inset">
                <div className="mb-2 text-[9px] uppercase tracking-widest text-phosphor-dim">&#10022; ProxyFace listening &#10022;</div>
                <div className="space-y-1 text-[10px]">
                  <div>
                    <span className="text-phosphor-dim">state </span>
                    <span className={engine.state === 'ready' ? 'text-mood-happy' : engine.state === 'error' ? 'text-mood-error' : 'text-signal'}>
                      {engine.state}
                    </span>
                  </div>
                  <div><span className="text-phosphor-dim">backend </span><span className="text-signal">{engine.backend ?? '--'}</span></div>
                  {engine.result && (
                    <div><span className="text-phosphor-dim">emotion </span><span className="font-bold text-phosphor-glow">{engine.result.emotion}</span></div>
                  )}
                </div>
                {engine.error && (
                  <div className="mt-2 rounded-sm border border-mood-error/50 bg-mood-error/10 p-2 text-[10px] text-mood-error">{engine.error}</div>
                )}
              </div>
              {currentChar && <CharInfo char={currentChar} />}
              <button type="button" onClick={() => setSettingsOpen(true)}
                className="rounded-sm border border-crt-700 bg-crt-900 px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-phosphor-dim hover:border-phosphor hover:text-phosphor">
                &#9881; Change character
              </button>
              <EyeTrackerControls tracker={tracker} />
              {settingsOpen && (
                <SettingsPanel settings={settings} onSave={setSettings} onClose={() => setSettingsOpen(false)} />
              )}
            </>
          ) : (
            <>
              {settingsOpen && (
                <SettingsPanel settings={settings} onSave={setSettings} onClose={() => setSettingsOpen(false)} />
              )}
              <LLMChatPanel
                engine={engine}
                config={providerConfig}
                onOpenSettings={() => setSettingsOpen(true)}
                settings={settings}
                tracker={tracker}
              />
              {currentChar && <CharInfo char={currentChar} />}
            </>
          )}
        </section>
      </main>

      <SiteFooter onModal={setModal} />

      <div className="crt-overlay" aria-hidden />
      <div className="crt-sweep" aria-hidden />
      <PerfMonitor />

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

function CharInfo({ char }: { char: { name: string; description?: string; author?: string } }) {
  return (
    <div className="rounded-sm border border-crt-700 bg-crt-900/60 px-3 py-2 font-mono">
      <div className="text-[9px] uppercase tracking-widest text-phosphor-dim">character</div>
      <div className="text-[13px] font-bold text-phosphor-glow">{char.name}</div>
      {char.description && <div className="mt-0.5 text-[10px] italic text-phosphor-dim">{char.description}</div>}
      {char.author && <div className="mt-0.5 text-[9px] text-phosphor-dim/60">by {char.author}</div>}
    </div>
  );
}

function useResponsiveLayout() {
  const [size, setSize] = useState({ w: 0, h: 0 });
  const mountedRef = useRef(false);

  useEffect(() => {
    const update = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    update();
    mountedRef.current = true;
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const isNarrow = size.w > 0 && size.w < 720;
  const paneWidth = isNarrow ? size.w - 40 : Math.max(0, size.w - 420 - 40);
  const paneHeight = size.h - 100;
  const available = Math.min(paneWidth, paneHeight);
  const avatarSize = Math.max(256, Math.min(640, available - 32));

  return { avatarSize, isNarrow };
}
