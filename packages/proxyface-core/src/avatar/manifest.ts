/**
 * Sprite sheet manifest — the contract between the asset pipeline and the
 * runtime renderer.
 *
 * The pipeline lives outside `packages/` (in the top-level `sprites/`
 * directory) and can use any tool to author artwork: Scenario.gg for
 * initial generation, Aseprite for hand cleanup, etc. Whatever tool
 * you use, the export must produce:
 *
 *   - A single PNG atlas.
 *   - A JSON manifest conforming to `SpriteManifest` below.
 *
 * The runtime never cares how the atlas was authored. It only reads
 * the manifest, loads the PNG, and blits frames.
 *
 * -------------------------------------------------------------------
 * Layout convention (the "8-row atlas")
 * -------------------------------------------------------------------
 *
 * The atlas is a grid:
 *   - Rows: one per emotion, in the order defined by EMOTIONS
 *     (IDLE, THINKING, HAPPY, SAD, ANGRY, SURPRISED, EXPLAINING, ERROR)
 *   - Columns: `frameCount` frames, left-to-right, for the emotion's
 *     idle loop (breathing + blink in one continuous cycle).
 *
 * So for a 256×256 frame × 16 frames × 8 emotions atlas:
 *   atlas.png = 4096 wide × 2048 tall
 *
 * Each frame is sliced at pixel coordinates
 *   x = col * frameWidth, y = row * frameHeight
 *
 * -------------------------------------------------------------------
 * Pupil compositing
 * -------------------------------------------------------------------
 *
 * For step 5 (eye-tracking), pupils must move independently of the
 * face. The manifest declares, per emotion:
 *
 *   - `pupilAnchor`: the (x, y) within the frame where the pupil
 *     layer is centered when looking straight ahead.
 *   - `pupilRange`: the maximum pupil offset in pixels before it
 *     would visibly clip the eye socket. Clamped in both x and y.
 *
 * Some emotions (ANGRY with narrowed eyes, ERROR with X-eyes) may
 * want to disable pupil movement entirely — set `pupilRange` to
 * `{ x: 0, y: 0 }` in those cases and the runtime treats the face
 * sprite as self-contained.
 *
 * The pupil sprite itself is a SEPARATE small image (e.g. 32×32)
 * referenced by `pupilSprite`. Absent → runtime skips pupil
 * compositing entirely and the eyes stay baked into the face frames.
 */

import type { Emotion } from '../types';

export interface FrameSize {
  width: number;
  height: number;
}

export interface Vec2 {
  x: number;
  y: number;
}

export interface EmotionSpriteRow {
  /** Which emotion this row renders. */
  emotion: Emotion;
  /** Row index in the atlas (0-based, from top). */
  row: number;
  /**
   * Center of the pupil layer within a frame, in pixels.
   * If the face sprite has baked-in pupils this is still useful —
   * the renderer can mask them and draw the mobile pupils on top.
   */
  pupilAnchor: Vec2;
  /**
   * Maximum offset the pupil can move from the anchor before it
   * visibly clips. Clamped per axis. `{x:0, y:0}` disables movement.
   */
  pupilRange: Vec2;
  /**
   * Optional: frames at which an eye blink occurs in this row's loop.
   * Used by the runtime to pause pupil compositing during the blink
   * (pupils are hidden behind closed eyelids for 2-3 frames).
   */
  blinkFrames?: number[];
  /**
   * Optional: frames-per-second override. Some emotions (THINKING)
   * loop faster, others (SAD) slower. Default: inherit `defaultFps`.
   */
  fps?: number;
}

export interface SpriteManifest {
  /** Manifest format version — bump on breaking changes. */
  version: 1;
  /** Display name shown in the showroom + settings (e.g. "Don Quixote"). */
  name?: string;
  /** One-line flavor description shown under the name in the showroom. */
  description?: string;
  /** Artist / author credit. */
  author?: string;
  /** Optional URL — author's portfolio, source, or character lore page. */
  url?: string;
  /**
   * How many pupils to render on top of the atlas:
   *   2 (default) — both eyes
   *   1           — only LEFT pupil drawn (e.g. cyclops, character with eyepatch)
   *   0           — no pupils (atlas already has eyes painted in)
   */
  eyeCount?: 0 | 1 | 2;
  /**
   * Atlas filename, relative to this manifest. Optional — defaults to
   * "atlas.png" so plug-and-play character folders don't need to declare it.
   */
  atlas?: string;
  /**
   * Pupil sprite filename. Optional — defaults to "pupil.png".
   */
  pupilSprite?: string;
  /** Per-frame dimensions (uniform across the atlas). */
  frameSize: FrameSize;
  /** Number of frames per emotion (atlas column count). */
  frameCount: number;
  /** Default animation speed (FPS). Individual rows can override. */
  defaultFps: number;
  /**
   * Per-emotion row definitions. Exactly 8 entries, one per emotion,
   * in any order (the `emotion` field identifies them). Validated at
   * load time.
   */
  rows: EmotionSpriteRow[];
  /** Free-form metadata — pipeline tooling can stash anything here. */
  meta?: Record<string, unknown>;
}
