/**
 * Canvas2D sprite renderer.
 *
 * Draws the current frame of the current emotion onto a <canvas>,
 * then composites the pupil layer on top. Pupil position is a
 * parameter — step 5's eye-tracking will feed coordinates in here
 * without touching this module's code.
 *
 * Rendering choices:
 *   - Canvas2D, not WebGL. At 256×256 × 60fps we are nowhere near the
 *     limits of Canvas2D, and Canvas has trivial integration with
 *     React + the rest of the DOM. WebGL is the step 8 optimization
 *     target if we ever need it.
 *   - `imageSmoothingEnabled = false` so the atlas is blitted
 *     pixel-perfect at any size. Combined with CSS `image-rendering:
 *     pixelated` this preserves the 16-bit look.
 *   - HiDPI handling: we size the canvas by CSS and scale the
 *     backing store by devicePixelRatio so the face stays crisp on
 *     Retina and 4K displays.
 */

import type { Emotion } from '../types';
import type { LoadedSpriteSheet } from './loader';
import type { Vec2 } from './manifest';

export interface RenderState {
  /** Current emotion row to render. */
  emotion: Emotion;
  /** Current frame within the row's animation cycle. */
  frameIdx: number;
  /** Pupil offset from anchor, in frame pixels. Clamped at draw time. */
  pupilOffset: Vec2;
  /**
   * Optional: fade the frame to a second emotion by this amount (0..1).
   * Used for smooth emotion transitions. 0 = pure current emotion,
   * 1 = pure target emotion.
   */
  blend?: {
    targetEmotion: Emotion;
    targetFrameIdx: number;
    amount: number;
  };
}

export class AvatarRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private sheet: LoadedSpriteSheet;
  private cssSize = 0;

  /** Current rendered CSS size in pixels (set via resize()). */
  get size(): number {
    return this.cssSize;
  }

  constructor(canvas: HTMLCanvasElement, sheet: LoadedSpriteSheet) {
    this.canvas = canvas;
    this.sheet = sheet;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) throw new Error('Canvas2D not supported');
    this.ctx = ctx;
    this.ctx.imageSmoothingEnabled = false;
    this.resize(canvas.clientWidth || sheet.manifest.frameSize.width);
  }

  /**
   * Size the canvas. Call whenever the container resizes.
   * Accepts a CSS pixel size; internal backing store is scaled by DPR.
   */
  resize(cssSize: number): void {
    if (cssSize <= 0) return;
    this.cssSize = cssSize;
    const dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
    this.canvas.width = Math.round(cssSize * dpr);
    this.canvas.height = Math.round(cssSize * dpr);
    this.canvas.style.width = `${cssSize}px`;
    this.canvas.style.height = `${cssSize}px`;
    // Re-disable smoothing after resize (it resets).
    this.ctx.imageSmoothingEnabled = false;
  }

  /** Draw one frame based on the current render state. */
  render(state: RenderState): void {
    const { manifest, atlas, pupilSprite, rowFor } = this.sheet;
    const { width: fw, height: fh } = manifest.frameSize;
    const cw = this.canvas.width;
    const ch = this.canvas.height;

    this.ctx.clearRect(0, 0, cw, ch);

    // Primary frame
    const row = rowFor[state.emotion];
    const sx = state.frameIdx * fw;
    const sy = row.row * fh;
    this.ctx.globalAlpha = state.blend ? 1 - state.blend.amount : 1;
    this.ctx.drawImage(atlas, sx, sy, fw, fh, 0, 0, cw, ch);

    // Blended frame (transition)
    if (state.blend) {
      const targetRow = rowFor[state.blend.targetEmotion];
      const tx = state.blend.targetFrameIdx * fw;
      const ty = targetRow.row * fh;
      this.ctx.globalAlpha = state.blend.amount;
      this.ctx.drawImage(atlas, tx, ty, fw, fh, 0, 0, cw, ch);
    }
    this.ctx.globalAlpha = 1;

    // Pupil compositing — skipped if:
    //   - no pupil sprite in manifest
    //   - pupilRange is zero for this emotion
    //   - we're mid-blink (pupils hidden behind closed eyelids)
    if (!pupilSprite) return;
    if (row.pupilRange.x === 0 && row.pupilRange.y === 0) return;
    const blinkFrames = row.blinkFrames ?? [];
    if (blinkFrames.includes(state.frameIdx)) return;

    const clampedOffset = {
      x: clamp(state.pupilOffset.x, -row.pupilRange.x, row.pupilRange.x),
      y: clamp(state.pupilOffset.y, -row.pupilRange.y, row.pupilRange.y),
    };

    // Both eyes — left anchor from manifest, right mirrored.
    // The manifest's rows[].pupilAnchorRight (if present) takes
    // precedence over mirroring.
    // Respect eyeCount from the manifest:
    //   0 = skip both pupils (atlas has them painted in)
    //   1 = draw only the LEFT pupil
    //   2 = draw both (default)
    const eyeCount = manifest.eyeCount ?? 2;
    if (eyeCount === 0) return;

    const leftAnchor = row.pupilAnchor;
    this.drawPupil(pupilSprite, leftAnchor, clampedOffset, fw, fh, cw, ch);

    if (eyeCount === 2) {
      const rightAnchor =
        (row as unknown as { pupilAnchorRight?: Vec2 }).pupilAnchorRight ??
        { x: fw - row.pupilAnchor.x, y: row.pupilAnchor.y };
      this.drawPupil(pupilSprite, rightAnchor, clampedOffset, fw, fh, cw, ch);
    }
  }

  private drawPupil(
    pupil: ImageBitmap,
    anchor: Vec2,
    offset: Vec2,
    frameW: number,
    frameH: number,
    canvasW: number,
    canvasH: number,
  ): void {
    // Scale factor from frame pixels to canvas pixels
    const scaleX = canvasW / frameW;
    const scaleY = canvasH / frameH;
    // Pupil sprite is drawn at its native size, then scaled
    const cx = (anchor.x + offset.x) * scaleX;
    const cy = (anchor.y + offset.y) * scaleY;
    const pw = pupil.width * scaleX;
    const ph = pupil.height * scaleY;
    this.ctx.drawImage(pupil, cx - pw / 2, cy - ph / 2, pw, ph);
  }
}

function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}
