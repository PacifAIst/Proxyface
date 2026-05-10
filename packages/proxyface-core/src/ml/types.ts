/**
 * Worker protocol — the message contract between the main thread and the
 * inference Web Worker.
 *
 * Both directions are tagged unions so the consumer can switch on `type`
 * with full type narrowing. The worker is owned and addressed by the
 * `useLocalEmotion` hook; nothing else should send messages to it.
 */

import type { Emotion } from '../types';

/** Which inference backend is active. */
export type Backend = 'webgpu' | 'wasm';

/** Lifecycle state surfaced to React. */
export type EngineState =
  | 'idle' // worker not yet spawned
  | 'loading' // model fetching/compiling
  | 'ready' // model loaded, accepting classify requests
  | 'error'; // fatal init error

// ---------------------------------------------------------------------------
// Main → Worker
// ---------------------------------------------------------------------------

export interface InitRequest {
  type: 'init';
  /** Absolute URL to the directory containing model_int8.onnx and tokenizer files. */
  modelBaseUrl: string;
  /** Subdirectory under modelBaseUrl, used as the HF model id. */
  modelDir: string;
  /** Force a specific backend. Default: try webgpu, fall back to wasm. */
  preferredBackend?: Backend;
}

export interface ClassifyRequest {
  type: 'classify';
  /** Caller-generated unique id; echoed back in the response. */
  id: string;
  text: string;
}

export interface DisposeRequest {
  type: 'dispose';
}

export type WorkerRequest = InitRequest | ClassifyRequest | DisposeRequest;

// ---------------------------------------------------------------------------
// Worker → Main
// ---------------------------------------------------------------------------

export interface ProgressMessage {
  type: 'progress';
  stage: 'fetching-tokenizer' | 'fetching-model' | 'compiling' | 'warming-up';
  ratio?: number; // 0..1 if known
}

export interface ReadyMessage {
  type: 'ready';
  backend: Backend;
  loadTimeMs: number;
  warmupMs: number;
}

export interface InitErrorMessage {
  type: 'init-error';
  error: string;
}

export interface ResultMessage {
  type: 'result';
  id: string;
  emotion: Emotion;
  labelId: number;
  confidence: number;
  /** Full distribution if requested (not the default — see worker.ts). */
  allScores?: Partial<Record<Emotion, number>>;
  latencyMs: number;
}

export interface ClassifyErrorMessage {
  type: 'classify-error';
  id: string;
  error: string;
}

export type WorkerResponse =
  | ProgressMessage
  | ReadyMessage
  | InitErrorMessage
  | ResultMessage
  | ClassifyErrorMessage;

// ---------------------------------------------------------------------------
// Hook-facing result
// ---------------------------------------------------------------------------

export interface EmotionResult {
  emotion: Emotion;
  confidence: number;
  /** Time from text → result, end-to-end. */
  latencyMs: number;
  /** Wall-clock timestamp of when we received the result. */
  receivedAt: number;
}
