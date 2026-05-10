/**
 * Model config helpers.
 *
 * The model files (model_int8.onnx, tokenizer.json, labels.json, ...)
 * live under a base URL that varies per platform:
 *
 *   - Web app: served from `/models/`
 *   - Extension: served from `chrome.runtime.getURL('models/')`
 *
 * The hook caller is responsible for resolving the right base URL and
 * passing it to `useLocalEmotion({ modelBaseUrl })`. This module just
 * exposes a sensible default and a feature-detect helper.
 */

import type { Backend } from './types';

/** Subdirectory under the base URL containing the emotion model. */
export const EMOTION_MODEL_DIR = 'emotion';

/** Default base URL — works for the web app's static `public/models/` layout. */
export const DEFAULT_MODEL_BASE_URL = '/models/';

/**
 * Files we expect to find under `${baseUrl}/${EMOTION_MODEL_DIR}/`.
 * Surfaced here so the worker can fail loudly with a useful message
 * if anything's missing (typically because step 2's training hasn't
 * been run yet).
 */
export const REQUIRED_MODEL_FILES = [
  'model_int8.onnx',
  'tokenizer.json',
  'tokenizer_config.json',
  'labels.json',
] as const;

/**
 * Probe whether WebGPU is plausibly available. The actual pipeline init
 * may still fail (driver issues, blocklists, etc.) — the worker handles
 * that with a fallback. This is just a fast pre-check.
 */
export function isWebGPUSupported(): boolean {
  // Worker context: `self.navigator.gpu`. Window context: `navigator.gpu`.
  // We test both because this code may run on either side.
  if (typeof navigator !== 'undefined' && 'gpu' in navigator) return true;
  if (typeof self !== 'undefined' && 'navigator' in self && 'gpu' in (self as { navigator?: { gpu?: unknown } }).navigator!) {
    return true;
  }
  return false;
}

export function pickPreferredBackend(override?: Backend): Backend {
  if (override) return override;
  return isWebGPUSupported() ? 'webgpu' : 'wasm';
}

/**
 * Resolve a base URL for one of the known platforms. Apps can also
 * pass a fully custom URL — this is just sugar for the common cases.
 */
export function resolveModelBaseUrl(opts: {
  /** The current platform. */
  platform: 'web' | 'extension';
  /** Extension-only: provide the runtime.getURL function. */
  extensionGetURL?: (path: string) => string;
}): string {
  if (opts.platform === 'extension') {
    if (!opts.extensionGetURL) {
      throw new Error(
        "extensionGetURL is required for platform='extension'. " +
          "Pass `chrome.runtime.getURL` (or `browser.runtime.getURL`).",
      );
    }
    return opts.extensionGetURL('models/');
  }
  return DEFAULT_MODEL_BASE_URL;
}
