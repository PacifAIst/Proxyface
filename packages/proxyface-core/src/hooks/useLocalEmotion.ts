/**
 * useLocalEmotion — the main-thread facade for the emotion inference worker.
 *
 * Lifecycle:
 *   1. Spawn the Web Worker on mount.
 *   2. Send `init` with the resolved modelBaseUrl.
 *   3. Track `state` (idle → loading → ready | error).
 *   4. Accept text via `pushText(chunk)`; the internal debouncer decides
 *      when to actually trigger inference.
 *   5. Expose the latest `result` for consumers (the avatar renderer
 *      in step 4 will drive off this).
 *
 * Concurrency model:
 *   - Only one inference is sent at a time. If a new trigger arrives
 *     while one is in flight, the in-flight request is superseded —
 *     its result is still delivered but overwritten immediately by the
 *     newer one. This is the right behavior for a reactive avatar:
 *     we want the face to reflect the latest text, not a backlog.
 *   - Request correlation is via monotonically-increasing ids so
 *     late-arriving stale results can be dropped.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Emotion } from '../types';
import { EmotionDebouncer } from '../ml/debouncer';
import { pickPreferredBackend, resolveModelBaseUrl } from '../ml/modelConfig';
import type {
  Backend,
  EmotionResult,
  EngineState,
  WorkerRequest,
  WorkerResponse,
} from '../ml/types';
import { getURL, isExtensionContext } from '../platform/extensionApi';

export interface UseLocalEmotionOptions {
  /**
   * Where to load model files from. If omitted, resolved from platform:
   *   - web → "/models/"
   *   - extension → chrome.runtime.getURL("models/")
   */
  modelBaseUrl?: string;

  /** Force WebGPU or Wasm. Default: WebGPU with Wasm fallback. */
  preferredBackend?: Backend;

  /** Debouncer idle timeout. Default: 500ms (per spec). */
  idleMs?: number;

  /** Start the worker immediately on mount. Default: true. */
  autoStart?: boolean;

  /**
   * Skip worker creation entirely and return an inert hook. Useful for
   * tests, SSR, and the popup where you might want to defer loading
   * until the user actually interacts.
   */
  disabled?: boolean;
}

export interface UseLocalEmotionReturn {
  /** Current lifecycle state of the worker. */
  state: EngineState;
  /** Which backend won the init race, once ready. */
  backend: Backend | null;
  /** Most recent inference result, or null before the first one lands. */
  result: EmotionResult | null;
  /** The last error message, if state === 'error'. */
  error: string | null;
  /** Milliseconds the initial model load took (once ready). */
  loadTimeMs: number | null;

  /**
   * Push a chunk of text. May be anything from a single token to a full
   * response. The debouncer decides when to actually classify.
   */
  pushText: (chunk: string) => void;

  /** Force inference on whatever is pending in the debouncer buffer. */
  flush: () => void;

  /** Drop everything pending (e.g. when the LLM stream is cancelled). */
  reset: () => void;

  /**
   * Manually classify a full string, bypassing the debouncer. Returns
   * a Promise that resolves when the corresponding result arrives.
   * Useful for tests and for non-streaming callers.
   */
  classifyNow: (text: string) => Promise<EmotionResult>;
}

/** Internal: resolves the worker URL in a way that works in every bundler + target. */
function createWorker(): Worker {
  // Vite handles `new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })`
  // natively for both the web app and the extension builds — the bundler
  // rewrites this to the emitted worker chunk URL. This is the official
  // Vite pattern and is supported in all our targets.
  return new Worker(new URL('../ml/worker.ts', import.meta.url), {
    type: 'module',
    name: 'proxyface-emotion',
  });
}

/** Fallback resolver when the caller doesn't pass modelBaseUrl. */
function defaultModelBaseUrl(): string {
  // Use the platform abstraction — handles Chrome, Firefox, and the
  // web app uniformly. In an extension context this resolves to
  // chrome.runtime.getURL('models/'); in the web app it returns '/models/'.
  if (isExtensionContext()) {
    return getURL('models/');
  }
  return resolveModelBaseUrl({ platform: 'web' });
}

export function useLocalEmotion(options: UseLocalEmotionOptions = {}): UseLocalEmotionReturn {
  const {
    modelBaseUrl: modelBaseUrlOverride,
    preferredBackend,
    idleMs = 500,
    autoStart = true,
    disabled = false,
  } = options;

  const [state, setState] = useState<EngineState>('idle');
  const [backend, setBackend] = useState<Backend | null>(null);
  const [result, setResult] = useState<EmotionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadTimeMs, setLoadTimeMs] = useState<number | null>(null);

  // Refs — these must not cause re-renders when mutated.
  const workerRef = useRef<Worker | null>(null);
  const debouncerRef = useRef<EmotionDebouncer | null>(null);
  const reqIdRef = useRef(0);
  /** Id of the most-recently-sent request; older results are dropped. */
  const latestReqIdRef = useRef<string | null>(null);
  /** Pending `classifyNow` callers awaiting their specific id. */
  const pendingRef = useRef(new Map<string, {
    resolve: (r: EmotionResult) => void;
    reject: (e: Error) => void;
  }>());

  // Stable model URL — we only want to recompute this if the override changes.
  const modelBaseUrl = useMemo(
    () => modelBaseUrlOverride ?? defaultModelBaseUrl(),
    [modelBaseUrlOverride],
  );

  // ------------------------------------------------------------------
  // Worker lifecycle
  // ------------------------------------------------------------------
  useEffect(() => {
    if (disabled || !autoStart) return;

    let cancelled = false;
    setState('loading');
    setError(null);

    const worker = createWorker();
    workerRef.current = worker;

    const onMessage = (ev: MessageEvent<WorkerResponse>) => {
      if (cancelled) return;
      const msg = ev.data;
      switch (msg.type) {
        case 'ready':
          setBackend(msg.backend);
          setLoadTimeMs(msg.loadTimeMs);
          setState('ready');
          break;
        case 'init-error':
          setError(msg.error);
          setState('error');
          break;
        case 'result': {
          const r: EmotionResult = {
            emotion: msg.emotion,
            confidence: msg.confidence,
            latencyMs: msg.latencyMs,
            receivedAt: Date.now(),
          };
          // Resolve any pending classifyNow caller first.
          const pending = pendingRef.current.get(msg.id);
          if (pending) {
            pending.resolve(r);
            pendingRef.current.delete(msg.id);
          }
          // Only update the shared `result` state if this is the
          // latest request we sent — older results are stale.
          if (msg.id === latestReqIdRef.current) {
            setResult(r);
          }
          break;
        }
        case 'classify-error': {
          const pending = pendingRef.current.get(msg.id);
          if (pending) {
            pending.reject(new Error(msg.error));
            pendingRef.current.delete(msg.id);
          }
          // Otherwise swallow — transient classify errors shouldn't
          // knock the whole engine into the error state.
          console.warn('[ProxyFace] classify error:', msg.error);
          break;
        }
        case 'progress':
          // Stage info — could drive a loading UI. No-op for now.
          break;
      }
    };

    worker.addEventListener('message', onMessage);
    worker.addEventListener('error', (ev) => {
      if (cancelled) return;
      // Worker errors at this level usually mean the worker module
      // itself failed to import (e.g. @huggingface/transformers couldn't
      // resolve, the model file 404'd inside the worker), or a native
      // crash inside ONNX Runtime / WebGPU init. The message is often
      // unhelpful ("Script error.") so we tack on a hint.
      const baseMsg = ev.message || 'Worker crashed';
      const hint =
        baseMsg.toLowerCase().includes('script error') || !ev.message
          ? ' (most often: model files missing — see docs/RUNBOOK.md §5, or use ?mock=1)'
          : '';
      setError(baseMsg + hint);
      setState('error');
    });

    const initMsg: WorkerRequest = {
      type: 'init',
      modelBaseUrl,
      modelDir: 'emotion',
      preferredBackend: preferredBackend ?? pickPreferredBackend(),
    };
    worker.postMessage(initMsg);

    return () => {
      cancelled = true;
      worker.removeEventListener('message', onMessage);
      try {
        worker.postMessage({ type: 'dispose' } satisfies WorkerRequest);
      } catch {
        /* worker may already be gone */
      }
      worker.terminate();
      workerRef.current = null;
      // Reject any pending classifyNow callers.
      for (const pending of pendingRef.current.values()) {
        pending.reject(new Error('Worker disposed'));
      }
      pendingRef.current.clear();
    };
  }, [disabled, autoStart, modelBaseUrl, preferredBackend]);

  // ------------------------------------------------------------------
  // Debouncer (tied to worker readiness)
  // ------------------------------------------------------------------
  const sendClassify = useCallback((text: string) => {
    const worker = workerRef.current;
    if (!worker) return;
    reqIdRef.current += 1;
    const id = String(reqIdRef.current);
    latestReqIdRef.current = id;
    worker.postMessage({ type: 'classify', id, text } satisfies WorkerRequest);
  }, []);

  useEffect(() => {
    debouncerRef.current = new EmotionDebouncer(sendClassify, { idleMs });
    return () => {
      debouncerRef.current?.reset();
      debouncerRef.current = null;
    };
  }, [idleMs, sendClassify]);

  // ------------------------------------------------------------------
  // Public API
  // ------------------------------------------------------------------
  const pushText = useCallback((chunk: string) => {
    debouncerRef.current?.push(chunk);
  }, []);

  const flush = useCallback(() => {
    debouncerRef.current?.flush();
  }, []);

  const reset = useCallback(() => {
    debouncerRef.current?.reset();
    setResult(null);
  }, []);

  const classifyNow = useCallback(
    (text: string): Promise<EmotionResult> => {
      const worker = workerRef.current;
      if (!worker) return Promise.reject(new Error('Worker not running'));
      return new Promise<EmotionResult>((resolve, reject) => {
        reqIdRef.current += 1;
        const id = String(reqIdRef.current);
        latestReqIdRef.current = id;
        pendingRef.current.set(id, { resolve, reject });
        worker.postMessage({ type: 'classify', id, text } satisfies WorkerRequest);
      });
    },
    [],
  );

  return {
    state,
    backend,
    result,
    error,
    loadTimeMs,
    pushText,
    flush,
    reset,
    classifyNow,
  };
}

// Silence the "Emotion unused" warning in strict configs — the type is
// part of the public surface via EmotionResult.
export type { Emotion };
