/// <reference lib="webworker" />
/**
 * ProxyFace inference Web Worker.
 *
 * Owns the entire model lifecycle:
 *   1. Listens for `init` from the main thread.
 *   2. Configures @huggingface/transformers to load LOCAL model files
 *      only (no remote HF hub fetches — strict privacy guarantee).
 *   3. Tries WebGPU; falls back to Wasm on any failure.
 *      Exception: in Electron, forces Wasm directly because Electron's
 *      Chromium doesn't expose the subgroupMinSize WebGPU property that
 *      transformers.js v3 reads, crashing before the fallback fires.
 *   4. Warms the model with a dummy inference (first run is always slow
 *      because of compilation/JIT).
 *   5. Posts `ready` and waits for `classify` requests.
 *   6. Each `classify` posts back a `result` with the predicted
 *      emotion + confidence + per-request latency.
 */

import { env, pipeline, type TextClassificationPipeline } from '@huggingface/transformers';
import { EMOTIONS, type Emotion } from '../types';
import { EMOTION_MODEL_DIR } from './modelConfig';
import type {
  Backend,
  ClassifyRequest,
  InitRequest,
  ResultMessage,
  WorkerRequest,
  WorkerResponse,
} from './types';

// ---------------------------------------------------------------------------
// State (worker-scoped, single-instance)
// ---------------------------------------------------------------------------
let classifier: TextClassificationPipeline | null = null;
let activeBackend: Backend | null = null;
let disposed = false;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function post(msg: WorkerResponse): void {
  (self as DedicatedWorkerGlobalScope).postMessage(msg);
}

// `_modelBaseUrl` parameter prefixed with underscore to mark it
// intentionally unused — kept in the signature so the InitRequest
// shape stays explicit and we can plumb it back through if we ever
// stop hardcoding EMOTION_MODEL_DIR.
function configureEnv(_modelBaseUrl: string): void {
  env.allowLocalModels = true;
  env.allowRemoteModels = false;
  env.useBrowserCache = false;

  // DEBUG: log every URL the worker fetches so we can see which one returns HTML
  const _fetch = self.fetch.bind(self);
  (self as any).fetch = async (input: any, init?: any) => {
    const url = typeof input === 'string' ? input : input?.url ?? String(input);
    const res = await _fetch(input, init);
    const ct = res.headers.get('content-type') ?? '?';
    console.log(`[worker fetch] ${res.status} ${ct} ${url}`);
    if (ct.includes('text/html')) {
      console.error(`[worker fetch] !!! HTML at ${url}`);
    }
    return res;
  };
}

async function tryInitWithBackend(backend: Backend): Promise<TextClassificationPipeline> {
  return pipeline('text-classification', EMOTION_MODEL_DIR, {
    device: backend,
    dtype: 'q8',
    model_file_name: 'model_int8',
    subfolder: '',
  }) as Promise<TextClassificationPipeline>;
}

async function init(req: InitRequest): Promise<void> {
  const t0 = performance.now();
  configureEnv(req.modelBaseUrl);

  post({ type: 'progress', stage: 'fetching-model' });

  // Electron's Chromium does not expose the full WebGPU subgroup info
  // (specifically subgroupMinSize) that transformers.js v3 reads during
  // adapter capability probing. This crashes BEFORE the wasm fallback
  // logic can fire, leaving the worker dead. Detect Electron via
  // userAgent and skip WebGPU entirely in that context.
  const isElectron = /electron/i.test(navigator.userAgent);

  // Resolve the preferred first backend, respecting the Electron override.
  const first: Backend = isElectron
    ? 'wasm'
    : (req.preferredBackend ?? 'webgpu');

  // Only try the other backend as a fallback when NOT in Electron —
  // in Electron wasm IS the target, no point trying webgpu after.
  const second: Backend | null = isElectron
    ? null
    : (first === 'webgpu' ? 'wasm' : 'webgpu');

  if (isElectron) {
    console.log('[ProxyFace worker] Electron detected — using WASM backend');
  }

  try {
    classifier = await tryInitWithBackend(first);
    activeBackend = first;
  } catch (firstErr) {
    if (!second) {
      // Electron path — wasm failed, nothing to fall back to
      post({
        type: 'init-error',
        error: `wasm: ${(firstErr as Error).message}`,
      });
      return;
    }
    console.warn(`[ProxyFace worker] ${first} init failed, trying ${second}`, firstErr);
    try {
      classifier = await tryInitWithBackend(second);
      activeBackend = second;
    } catch (secondErr) {
      const detail = `${first}: ${(firstErr as Error).message}; ${second}: ${(secondErr as Error).message}`;
      post({ type: 'init-error', error: detail });
      return;
    }
  }

  const loadTimeMs = performance.now() - t0;

  // Warm-up — first inference is always slow due to graph compilation.
  post({ type: 'progress', stage: 'warming-up' });
  const warmStart = performance.now();
  try {
    await classifier!('warmup');
  } catch (e) {
    console.warn('[ProxyFace worker] warmup inference failed:', e);
  }
  const warmupMs = performance.now() - warmStart;

  post({
    type: 'ready',
    backend: activeBackend!,
    loadTimeMs: Math.round(loadTimeMs),
    warmupMs: Math.round(warmupMs),
  });
}

async function classify(req: ClassifyRequest): Promise<void> {
  if (!classifier) {
    post({ type: 'classify-error', id: req.id, error: 'classifier not initialized' });
    return;
  }
  const t0 = performance.now();
  try {
    const out = (await classifier(req.text)) as Array<{ label: string; score: number }>;
    const top = Array.isArray(out) ? out[0] : out;

    const labelStr = top.label as Emotion;
    const labelId = EMOTIONS.indexOf(labelStr);
    if (labelId < 0) {
      post({
        type: 'classify-error',
        id: req.id,
        error: `Unknown label '${labelStr}' returned by model. Did labels.json drift?`,
      });
      return;
    }

    const result: ResultMessage = {
      type: 'result',
      id: req.id,
      emotion: labelStr,
      labelId,
      confidence: top.score,
      latencyMs: Math.round(performance.now() - t0),
    };
    post(result);
  } catch (e) {
    post({
      type: 'classify-error',
      id: req.id,
      error: (e as Error).message ?? String(e),
    });
  }
}

function dispose(): void {
  disposed = true;
  classifier = null;
  activeBackend = null;
}

// ---------------------------------------------------------------------------
// Message dispatch
// ---------------------------------------------------------------------------
self.addEventListener('message', (event: MessageEvent<WorkerRequest>) => {
  if (disposed) return;
  const msg = event.data;
  switch (msg.type) {
    case 'init':
      void init(msg);
      break;
    case 'classify':
      void classify(msg);
      break;
    case 'dispose':
      dispose();
      break;
  }
});
