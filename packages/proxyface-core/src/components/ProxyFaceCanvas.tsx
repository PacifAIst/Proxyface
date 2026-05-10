/**
 * ProxyFaceCanvas — the React-visible avatar.
 *
 * Owns:
 *   - The <canvas> element.
 *   - The AvatarRenderer instance (lifecycle tied to sheet availability).
 *   - Resize observer for HiDPI-correct sizing.
 *
 * Reads:
 *   - `renderState` from useProxyFaceState on every rAF tick.
 *
 * Does NOT own:
 *   - Emotion classification (that's useLocalEmotion).
 *   - Frame-cycling logic (that's useProxyFaceState).
 *   - Eye-tracking (that's step 5).
 */

import { useEffect, useMemo, useRef } from 'react';
import type { Emotion } from '../types';
import { AvatarRenderer } from '../avatar/renderer';
import { useProxyFaceState } from '../hooks/useProxyFaceState';
import { useSpriteSheet } from '../hooks/useSpriteSheet';

export interface ProxyFaceCanvasProps {
  /** URL of the sprite sheet manifest JSON. */
  manifestUrl: string;
  /** Current target emotion. null → stays in IDLE. */
  emotion: Emotion | null;
  /** Pupil offset (in frame pixels) from the eye-tracker hook. */
  pupilOffset?: { x: number; y: number };
  /** Rendered size in CSS pixels. Defaults to 256. */
  size?: number;
  /** Fallback slot shown while the sheet is loading or errored. */
  fallback?: React.ReactNode;
  /**
   * Bypasses MIN_HOLD_MS — use true for manual/UI-driven emotion
   * changes (showroom buttons, demo face) so they respond instantly.
   * Defaults to false; classifier-driven changes still respect the
   * hold time.
   */
  forceEmotionChange?: boolean;
}

export function ProxyFaceCanvas({
  manifestUrl,
  emotion,
  pupilOffset,
  size = 256,
  fallback,
  forceEmotionChange = false,
}: ProxyFaceCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<AvatarRenderer | null>(null);

  const sheetState = useSpriteSheet(manifestUrl);
  const sheet = sheetState.status === 'ready' ? sheetState.sheet : null;

  // Stable pupilOffset reference — we don't want rAF loop churn on every parent render.
  const stableOffset = useMemo(
    () => pupilOffset ?? { x: 0, y: 0 },
    [pupilOffset?.x, pupilOffset?.y],
  );

  const { renderState } = useProxyFaceState({
    targetEmotion: emotion,
    forceEmotionChange,
    sheet,
    pupilOffset: stableOffset,
  });

  // Instantiate renderer when canvas + sheet are both ready.
  useEffect(() => {
    if (!canvasRef.current || !sheet) return;
    const renderer = new AvatarRenderer(canvasRef.current, sheet);
    renderer.resize(size);
    rendererRef.current = renderer;
    return () => {
      rendererRef.current = null;
    };
  }, [sheet, size]);

  // Draw on each renderState change.
  useEffect(() => {
    if (!rendererRef.current || !renderState) return;
    rendererRef.current.render(renderState);
  }, [renderState]);

  if (sheetState.status === 'error') {
    return (
      <div
        style={{ width: size, height: size }}
        className="flex items-center justify-center rounded-sm border border-mood-error/50 bg-mood-error/10 p-2 text-center font-mono text-xs text-mood-error"
      >
        sprite load failed:
        <br />
        <span className="opacity-70">{sheetState.error}</span>
      </div>
    );
  }

  if (sheetState.status !== 'ready') {
    return (
      <div
        style={{ width: size, height: size }}
        className="flex items-center justify-center font-mono text-xs text-phosphor-dim"
      >
        {fallback ?? 'loading sprites…'}
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      data-pixel
      style={{ width: size, height: size }}
      aria-label="ProxyFace avatar"
      role="img"
    />
  );
}
