import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  LandingPage,
  PlatformProvider,
  ProxyFaceWorkstation,
  resolveAssetUrls,
} from '@proxyface/core';
import '@proxyface/core/styles';

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('#root element missing from index.html');

const assets = resolveAssetUrls();

type Route = 'landing' | 'demo';

function getRoute(): Route {
  if (window.location.hash === '#/demo') return 'demo';
  if (new URLSearchParams(window.location.search).has('mock')) return 'demo';
  if (new URLSearchParams(window.location.search).has('proxyface')) return 'demo';
  return 'landing';
}

function goHome() {
  // Strip ?proxyface= from the URL so getRoute() no longer forces
  // 'demo' after navigating back from a share link.
  const url = new URL(window.location.href);
  let mutated = false;
  if (url.searchParams.has('proxyface')) {
    url.searchParams.delete('proxyface');
    mutated = true;
  }
  if (url.searchParams.has('mock')) {
    url.searchParams.delete('mock');
    mutated = true;
  }
  if (mutated) {
    window.history.replaceState(null, '', url.toString());
  }
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
  const params = new URLSearchParams(window.location.search);
  const forceMock = params.has('mock');
  // Read the ?proxyface= param once at mount — passed as prop, not via localStorage
  const initialCharacterId = params.get('proxyface') ?? undefined;

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
        manifestUrl={`${assets.sprites}placeholder.manifest.json`}
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
