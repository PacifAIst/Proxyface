/**
 * Shared type surface for ProxyFace.
 * Imported by all targets via `@proxyface/core`.
 */

/**
 * The 8 emotion states the TinyBERT classifier outputs.
 * Order matches the integer label index used during training (step 2).
 * DO NOT reorder without retraining the model.
 */
export const EMOTIONS = [
  'IDLE',
  'THINKING',
  'HAPPY',
  'SAD',
  'ANGRY',
  'SURPRISED',
  'EXPLAINING',
  'ERROR',
] as const;

export type Emotion = (typeof EMOTIONS)[number];

/** Maps emotion → integer label (the model's raw output). */
export type EmotionLabel = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

/** The runtime surface the avatar is rendered into. */
export type Platform = 'web' | 'extension-popup' | 'extension-fullpage';

export interface PlatformContext {
  platform: Platform;
  /** True when running inside a browser extension (chrome.* / browser.* APIs available). */
  isExtension: boolean;
  /** True when the camera should be auto-disabled by default (popup mode). */
  cameraOptInRequired: boolean;
  /** Display label, mostly for debug overlays. */
  label: string;
}
