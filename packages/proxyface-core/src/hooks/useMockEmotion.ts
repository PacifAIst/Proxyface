/**
 * useMockEmotion — a drop-in-compatible alternative to useLocalEmotion
 * that uses the pure-regex mock classifier instead of a worker + model.
 *
 * Intended for:
 *   - Development before step 2's model is trained.
 *   - Storybook / design reviews.
 *   - Tests.
 *   - Extremely constrained environments where 5 MB is too much.
 *
 * The return shape is intentionally identical to useLocalEmotion's so
 * the avatar renderer in step 4 can accept either.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { classifyMock } from '../ml/mockClassifier';
import { EmotionDebouncer } from '../ml/debouncer';
import type { Backend, EmotionResult, EngineState } from '../ml/types';
import type { UseLocalEmotionReturn } from './useLocalEmotion';

export interface UseMockEmotionOptions {
  idleMs?: number;
  disabled?: boolean;
}

export function useMockEmotion(options: UseMockEmotionOptions = {}): UseLocalEmotionReturn {
  const { idleMs = 500, disabled = false } = options;

  const [state, setState] = useState<EngineState>(disabled ? 'idle' : 'ready');
  const [result, setResult] = useState<EmotionResult | null>(null);
  const debouncerRef = useRef<EmotionDebouncer | null>(null);

  const trigger = useCallback((text: string) => {
    const t0 = performance.now();
    const mock = classifyMock(text);
    setResult({
      emotion: mock.emotion,
      confidence: mock.confidence,
      latencyMs: Math.round(performance.now() - t0),
      receivedAt: Date.now(),
    });
  }, []);

  useEffect(() => {
    if (disabled) {
      setState('idle');
      return;
    }
    setState('ready');
    debouncerRef.current = new EmotionDebouncer(trigger, { idleMs });
    return () => {
      debouncerRef.current?.reset();
      debouncerRef.current = null;
    };
  }, [disabled, idleMs, trigger]);

  const pushText = useCallback((chunk: string) => debouncerRef.current?.push(chunk), []);
  const flush = useCallback(() => debouncerRef.current?.flush(), []);
  const reset = useCallback(() => {
    debouncerRef.current?.reset();
    setResult(null);
  }, []);
  const classifyNow = useCallback((text: string): Promise<EmotionResult> => {
    const t0 = performance.now();
    const mock = classifyMock(text);
    const r: EmotionResult = {
      emotion: mock.emotion,
      confidence: mock.confidence,
      latencyMs: Math.round(performance.now() - t0),
      receivedAt: Date.now(),
    };
    setResult(r);
    return Promise.resolve(r);
  }, []);

  const backend: Backend | null = disabled ? null : 'wasm'; // nominal

  return {
    state,
    backend,
    result,
    error: null,
    loadTimeMs: disabled ? null : 0,
    pushText,
    flush,
    reset,
    classifyNow,
  };
}
