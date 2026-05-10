/**
 * One-call asset URL resolver.
 *
 * Before this helper, every extension entry point had ~6 lines of
 * boilerplate calling `chrome.runtime.getURL('models/')`,
 * `chrome.runtime.getURL('sprites/')`, etc. The web app entries had
 * similar boilerplate with relative URLs. Both were copy-pasted
 * three-to-six times across popups, fullpages, and the web app.
 *
 * This helper pulls all of that into one call:
 *
 *   const assets = resolveAssetUrls();
 *   <ProxyFaceWithEngine
 *     modelBaseUrl={assets.models}
 *     spritesBaseUrl={assets.sprites}
 *     visionWasmBaseUrl={assets.vision}
 *     visionModelUrl={assets.visionModel}
 *   />
 *
 * Web app → all URLs are relative to `/`. Extensions → all URLs are
 * resolved via `runtime.getURL`. Same call, both work.
 */

import { getURL, isExtensionContext } from './extensionApi';

export interface AssetUrls {
  /** Base URL for the emotion model directory. Trailing slash. */
  models: string;
  /** Base URL for sprite assets. Trailing slash. */
  sprites: string;
  /** Base URL for MediaPipe WASM binaries. Trailing slash. */
  vision: string;
  /** Direct URL for the FaceLandmarker model file (no trailing slash). */
  visionModel: string;
}

export interface ResolveAssetUrlsOptions {
  /**
   * Override the web-app base path. Defaults to "/" (served from root).
   * Useful when the web app is deployed under a subpath like
   * "/proxyface/".
   */
  webBasePath?: string;
}

export function resolveAssetUrls(options: ResolveAssetUrlsOptions = {}): AssetUrls {
  if (isExtensionContext()) {
    return {
      models: getURL('models/'),
      sprites: getURL('sprites/'),
      vision: getURL('vision/'),
      visionModel: getURL('vision/face_landmarker.task'),
    };
  }

  // Web app path. Relative URLs resolved against document.baseURI.
  const base = options.webBasePath ?? '/';
  const normalized = base.endsWith('/') ? base : `${base}/`;
  return {
    models: `${normalized}models/`,
    sprites: `${normalized}sprites/`,
    // Web app leaves MediaPipe on the CDN by default — it doesn't
    // ship the offline-privacy promise that extensions do.
    vision: 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm',
    visionModel:
      'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
  };
}
