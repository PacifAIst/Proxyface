/**
 * Sprite sheet loader.
 *
 * Loads the PNG atlas and its JSON manifest, validates the manifest
 * against the expected shape, and produces a lookup the renderer can
 * consume without further parsing.
 *
 * Invariants enforced at load time:
 *   - Manifest version matches the one this runtime understands.
 *   - Exactly one row per emotion (all 8 classes present).
 *   - Atlas dimensions match frameSize × frameCount × row count.
 *   - Pupil sprite loads if referenced.
 *
 * The loader is platform-neutral: it takes a base URL and uses fetch +
 * ImageBitmap decoding, which works identically in the web app, the
 * extension popup, and the extension full-page tab.
 */

import { EMOTIONS, type Emotion } from '../types';
import type { EmotionSpriteRow, SpriteManifest } from './manifest';

export interface LoadedSpriteSheet {
  manifest: SpriteManifest;
  /** The decoded atlas, ready for drawImage. */
  atlas: ImageBitmap;
  /** Optional pupil sprite (absent → no pupil compositing). */
  pupilSprite: ImageBitmap | null;
  /** Quick lookup: emotion → row definition. */
  rowFor: Record<Emotion, EmotionSpriteRow>;
}

export class SpriteLoadError extends Error {
  constructor(
    message: string,
    public override readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'SpriteLoadError';
  }
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new SpriteLoadError(`Manifest fetch failed: ${res.status} ${res.statusText} (${url})`);
  }
  return (await res.json()) as T;
}

async function fetchImageBitmap(url: string): Promise<ImageBitmap> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new SpriteLoadError(`Image fetch failed: ${res.status} ${res.statusText} (${url})`);
  }
  const blob = await res.blob();
  // `createImageBitmap` decodes off the main thread in modern browsers
  // and returns a GPU-friendly texture handle. Preferred over Image + onload.
  return createImageBitmap(blob);
}

function validateManifest(manifest: SpriteManifest): Record<Emotion, EmotionSpriteRow> {
  if (manifest.version !== 1) {
    throw new SpriteLoadError(
      `Unsupported manifest version: ${manifest.version}. Runtime expects v1.`,
    );
  }
  if (!manifest.frameSize?.width || !manifest.frameSize?.height) {
    throw new SpriteLoadError('Manifest missing frameSize');
  }
  if (!manifest.frameCount || manifest.frameCount < 1) {
    throw new SpriteLoadError('Manifest frameCount must be >= 1');
  }
  if (!Array.isArray(manifest.rows) || manifest.rows.length !== EMOTIONS.length) {
    throw new SpriteLoadError(
      `Manifest must declare exactly ${EMOTIONS.length} rows (got ${manifest.rows?.length ?? 0})`,
    );
  }

  // Build lookup, assert all emotions present, assert unique row indices.
  const byEmotion = {} as Record<Emotion, EmotionSpriteRow>;
  const seenRows = new Set<number>();
  for (const row of manifest.rows) {
    if (!EMOTIONS.includes(row.emotion as Emotion)) {
      throw new SpriteLoadError(`Unknown emotion in manifest row: ${row.emotion}`);
    }
    if (byEmotion[row.emotion as Emotion]) {
      throw new SpriteLoadError(`Duplicate row for emotion ${row.emotion}`);
    }
    if (seenRows.has(row.row)) {
      throw new SpriteLoadError(`Duplicate row index: ${row.row}`);
    }
    seenRows.add(row.row);
    byEmotion[row.emotion as Emotion] = row;
  }

  for (const emotion of EMOTIONS) {
    if (!byEmotion[emotion]) {
      throw new SpriteLoadError(`Manifest missing row for emotion ${emotion}`);
    }
  }

  return byEmotion;
}

function validateAtlasDimensions(atlas: ImageBitmap, manifest: SpriteManifest): void {
  const expectedW = manifest.frameSize.width * manifest.frameCount;
  const expectedH = manifest.frameSize.height * manifest.rows.length;
  if (atlas.width !== expectedW || atlas.height !== expectedH) {
    throw new SpriteLoadError(
      `Atlas dimensions mismatch: expected ${expectedW}×${expectedH}, got ${atlas.width}×${atlas.height}`,
    );
  }
}

/**
 * Load a sprite sheet from a manifest URL.
 *
 * @param manifestUrl Absolute or app-relative URL to the manifest JSON.
 *                    All asset paths in the manifest are resolved
 *                    relative to this URL.
 */
export async function loadSpriteSheet(manifestUrl: string): Promise<LoadedSpriteSheet> {
  // The `URL` constructor's second argument must be absolute. Inputs
  // like "/sprites/placeholder.manifest.json" are perfectly valid
  // fetch targets but throw "Invalid base URL" when handed to `new
  // URL()`. Resolve against the document base first so both relative
  // ("/sprites/...") and absolute ("https://...", "chrome-extension://...")
  // inputs work uniformly.
  const absoluteManifestUrl = new URL(
    manifestUrl,
    typeof document !== 'undefined' ? document.baseURI : 'http://localhost/',
  ).toString();

  const manifest = await fetchJson<SpriteManifest>(absoluteManifestUrl);
  const rowFor = validateManifest(manifest);

  // Resolve asset paths relative to the (now absolute) manifest URL.
  // Plug-and-play convention: when the manifest doesn't declare its
  // atlas/pupil filenames explicitly, use the standard names so users
  // can drop a character folder in without editing the JSON.
  const atlasFilename = manifest.atlas ?? 'atlas.png';
  const atlasUrl = new URL(atlasFilename, absoluteManifestUrl).toString();
  const atlas = await fetchImageBitmap(atlasUrl);
  validateAtlasDimensions(atlas, manifest);

  // pupilSprite is optional. If the manifest doesn't mention it AND
  // eyeCount !== 0, try the conventional "pupil.png" — but tolerate
  // a 404 silently (some characters have eyes painted in the atlas).
  let pupilSprite: ImageBitmap | null = null;
  const eyeCount = manifest.eyeCount ?? 2;
  const pupilFilename =
    manifest.pupilSprite ?? (eyeCount > 0 ? 'pupil.png' : null);
  if (pupilFilename) {
    const pupilUrl = new URL(pupilFilename, absoluteManifestUrl).toString();
    try {
      pupilSprite = await fetchImageBitmap(pupilUrl);
    } catch {
      // Silently treat as 0-eye character if pupil.png is missing.
      pupilSprite = null;
    }
  }

  return { manifest, atlas, pupilSprite, rowFor };
}
