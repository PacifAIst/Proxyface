/**
 * useProxyFaceState — the avatar's animation state machine.
 */

import { useEffect, useRef, useState } from 'react';
import type { Emotion } from '../types';
import type { RenderState } from '../avatar/renderer';
import type { LoadedSpriteSheet } from '../avatar/loader';
import type { EmotionSpriteRow } from '../avatar/manifest';

/** Cross-fade duration when transitioning between emotions. */
const TRANSITION_MS = 350;

/**
 * Minimum ms to hold a classifier-driven emotion before allowing another
 * switch. Prevents rapid-fire changes during long streaming responses.
 * Bypassed when forceEmotionChange=true (manual UI button clicks).
 */
const MIN_HOLD_MS = 1800;

export interface UseProxyFaceStateOptions {
  /** Current target emotion. null stays in IDLE. */
  targetEmotion: Emotion | null;
  /** When true, bypasses MIN_HOLD_MS. Use for manual/UI-driven changes. */
  forceEmotionChange?: boolean;
  /** The loaded sprite sheet (frame counts, FPS, etc.). */
  sheet: LoadedSpriteSheet | null;
  /**
   * Auto-decay: if the target emotion hasn't been updated in this many
   * ms, fade back to IDLE. Default: 8000. Set to Infinity to disable.
   */
  decayMs?: number;
  /** Pupil offset driven externally by the eye tracker. */
  pupilOffset?: { x: number; y: number };
}

export interface UseProxyFaceStateReturn {
  renderState: RenderState | null;
  currentTarget: Emotion;
  isTransitioning: boolean;
}

function rowFpsFor(row: EmotionSpriteRow, defaultFps: number): number {
  return row.fps ?? defaultFps;
}

function frameAtTime(
  now: number,
  emotionEnteredAt: number,
  row: EmotionSpriteRow,
  frameCount: number,
  defaultFps: number,
): number {
  const fps = rowFpsFor(row, defaultFps);
  const elapsed = Math.max(0, now - emotionEnteredAt);
  return Math.floor((elapsed / 1000) * fps) % frameCount;
}

export function useProxyFaceState(options: UseProxyFaceStateOptions): UseProxyFaceStateReturn {
  const { targetEmotion, sheet, decayMs = 8000, pupilOffset = { x: 0, y: 0 } } = options;

  const currentRef = useRef<Emotion>('IDLE');
  const previousRef = useRef<Emotion | null>(null);
  const currentEnteredAtRef = useRef<number>(performance.now());
  const previousEnteredAtRef = useRef<number>(performance.now());
  const transitionStartRef = useRef<number | null>(null);
  const lastExternalUpdateRef = useRef<number>(performance.now());

  const [renderState, setRenderState] = useState<RenderState | null>(null);
  const [currentTarget, setCurrentTarget] = useState<Emotion>('IDLE');
  const [isTransitioning, setIsTransitioning] = useState(false);

  // React to target emotion changes.
  useEffect(() => {
    if (!targetEmotion) return;
    lastExternalUpdateRef.current = performance.now();
    if (targetEmotion === currentRef.current) return;

    // Guard: don't switch unless we've held the current emotion long enough.
    // Bypassed for manual/UI-driven changes (forceEmotionChange=true).
    const heldMs = performance.now() - currentEnteredAtRef.current;
    if (!options.forceEmotionChange && heldMs < MIN_HOLD_MS && targetEmotion !== 'IDLE') return;

    previousRef.current = currentRef.current;
    previousEnteredAtRef.current = currentEnteredAtRef.current;
    currentRef.current = targetEmotion;
    currentEnteredAtRef.current = performance.now();
    transitionStartRef.current = performance.now();
    setCurrentTarget(targetEmotion);
    setIsTransitioning(true);
  }, [targetEmotion, options.forceEmotionChange]);

  // Animation loop.
  useEffect(() => {
    if (!sheet) {
      setRenderState(null);
      return;
    }

    let rafId = 0;
    const { manifest, rowFor } = sheet;

    const tick = () => {
      const now = performance.now();

      // Decay back to IDLE if external input has gone quiet.
      if (
        currentRef.current !== 'IDLE' &&
        now - lastExternalUpdateRef.current > decayMs &&
        !transitionStartRef.current
      ) {
        previousRef.current = currentRef.current;
        previousEnteredAtRef.current = currentEnteredAtRef.current;
        currentRef.current = 'IDLE';
        currentEnteredAtRef.current = now;
        transitionStartRef.current = now;
        setCurrentTarget('IDLE');
        setIsTransitioning(true);
      }

      const currentRow = rowFor[currentRef.current];
      const currentFrame = frameAtTime(
        now,
        currentEnteredAtRef.current,
        currentRow,
        manifest.frameCount,
        manifest.defaultFps,
      );

      let blend: RenderState['blend'] | undefined;
      if (transitionStartRef.current !== null && previousRef.current) {
        const t = (now - transitionStartRef.current) / TRANSITION_MS;
        if (t >= 1) {
          transitionStartRef.current = null;
          previousRef.current = null;
          setIsTransitioning(false);
        } else {
          blend = {
            targetEmotion: currentRef.current,
            targetFrameIdx: currentFrame,
            amount: easeInOutCubic(t),
          };
        }
      }

      const state: RenderState = blend
        ? {
            emotion: previousRef.current!,
            frameIdx: frameAtTime(
              now,
              previousEnteredAtRef.current,
              rowFor[previousRef.current!],
              manifest.frameCount,
              manifest.defaultFps,
            ),
            pupilOffset,
            blend,
          }
        : {
            emotion: currentRef.current,
            frameIdx: currentFrame,
            pupilOffset,
          };

      setRenderState(state);
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [sheet, decayMs, pupilOffset]);

  return { renderState, currentTarget, isTransitioning };
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
