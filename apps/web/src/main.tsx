import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  LandingPage,
  PlatformProvider,
  ProxyFaceWorkstation,
  resolveAssetUrls,
  type AssetUrls,
} from '@proxyface/core';
import '@proxyface/core/styles';

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('#root element missing from index.html');

// Detect Electron via userAgent — works without preload, always reliable
const isElectron = /electron/i.test(navigator.userAgent);

function getAssets(): AssetUrls {
  if (isElectron) {
    // Main process registers app:// protocol → resources/dist/
    return {
      models:  'app://dist/models/',
      sprites: 'app://dist/sprites/',
      vision:  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm',
      visionModel: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
    };
  }
  return resolveAssetUrls();
}

const assets = getAssets();

type Route = 'landing' | 'demo';

function getRoute(): Route {
  if (window.location.hash === '#/demo') return 'demo';
  if (new URLSearchParams(window.location.search).has('mock')) return 'demo';
  if (new URLSearchParams(window.location.search).has('proxyface')) return 'demo';
  return 'landing';
}

function goHome() {
  window.location.hash = '';
  window.dispatchEvent(new HashChangeEvent('hashchange'));
}

async function probeModelAvailable(modelBaseUrl: string): Promise<boolean> {
  try {
    const res = await fetch(`${modelBaseUrl}emotion/labels.json`, { cache: 'no-store' });
    if (!res.ok) return false;
    const json = (await res.json()) as { labels?: unknown };
    return Array.isArray(json.labels) && json.labels.length === 8;
  } catch {
    return false;
  }
}

function App() {
  const [route, setRoute] = useState<Route>(getRoute());
  const forceMock = new URLSearchParams(window.location.search).has('mock');
  const initialCharacterId = new URLSearchParams(window.location.search).get('proxyface') ?? undefined;
  const [autoMock, setAutoMock] = useState<boolean | null>(forceMock ? true : null);

  useEffect(() => {
    const onHash = () => setRoute(getRoute());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    if (forceMock || autoMock !== null || route !== 'demo') return;
    let cancelled = false;
    void probeModelAvailable(assets.models).then((ok) => {
      if (!cancelled) setAutoMock(!ok);
    });
    return () => { cancelled = true; };
  }, [forceMock, autoMock, route]);

  if (route === 'landing') {
    return (
      <LandingPage
        manifestUrl={`${assets.sprites}placeholder/manifest.json`}
        onEnterDemo={() => { window.location.hash = '#/demo'; }}
        chromeStoreUrl="https://chromewebstore.google.com/"
        firefoxStoreUrl="https://addons.mozilla.org/"
      />
    );
  }

  if (autoMock === null) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-crt-950 font-mono text-sm uppercase tracking-widest text-phosphor-dim">
        › checking model…
      </div>
    );
  }

  return (
    <>
      {autoMock && !forceMock && <MissingModelBanner />}
      <ProxyFaceWorkstation
        useMock={autoMock}
        modelBaseUrl={assets.models}
        spritesBaseUrl={assets.sprites}
        visionWasmBaseUrl={assets.vision}
        visionModelUrl={assets.visionModel}
        onBack={goHome}
        initialCharacterId={initialCharacterId}
      />
    </>
  );
}

function MissingModelBanner() {
  return (
    <div className="fixed inset-x-0 top-0 z-[200] border-b border-mood-error/60 bg-crt-950 px-4 py-2 font-mono text-xs text-mood-error shadow-crt-inset">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2">
        <span>
          <span className="font-pixel mr-2 text-[10px] uppercase tracking-widest">mock mode</span>
          Trained model not found — using regex classifier.
        </span>
      </div>
    </div>
  );
}

createRoot(rootEl).render(
  <StrictMode>
    <PlatformProvider platform="web">
      <App />
    </PlatformProvider>
  </StrictMode>,
);
