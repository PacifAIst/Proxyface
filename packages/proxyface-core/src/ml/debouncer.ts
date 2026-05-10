/**
 * EmotionDebouncer — gates how often the inference worker is invoked.
 *
 * Spec (from the master prompt, step 3):
 *   "Implement a debounce logic that only triggers the TinyBERT inference
 *    on punctuation marks (.,!?) or after 500ms of inactivity to prevent
 *    freezing the browser thread."
 *
 * Behavioral contract:
 *
 *   - Text is fed in one chunk at a time via `push(chunk)`. Chunks may
 *     be tokens, words, sentences, or arbitrary spans.
 *   - When a chunk extends the buffer past terminal punctuation
 *     (`.`, `!`, `?`), the current sentence is sliced off and emitted
 *     IMMEDIATELY. Comma is treated as a soft boundary (not emitted alone)
 *     because comma-only fragments rarely have a stable emotional reading.
 *   - When no terminal punctuation has arrived for `idleMs` milliseconds,
 *     whatever remains in the buffer is emitted.
 *   - The trailing buffer (incomplete next sentence) is preserved across
 *     calls — only the *completed* sentence is sliced off. This means a
 *     stream like "Hello world" → "!" emits only after the "!" arrives.
 *   - The class deliberately does NOT track in-flight inference. That's
 *     the worker's responsibility — it serializes naturally.
 */

const TERMINATORS = ['.', '!', '?'] as const;

export interface DebouncerOptions {
  /** Idle timeout in milliseconds. Default: 500. */
  idleMs?: number;
  /**
   * Minimum text length to consider for emission. Avoids classifying
   * single characters. Default: 3.
   */
  minLength?: number;
  /**
   * `setTimeout`/`clearTimeout` injection point — useful for tests so
   * we don't need to spin up a real event loop.
   */
  setTimeoutFn?: typeof setTimeout;
  clearTimeoutFn?: typeof clearTimeout;
}

export type DebouncerListener = (text: string) => void;

export class EmotionDebouncer {
  private buffer = '';
  private idleTimer: ReturnType<typeof setTimeout> | null = null;

  private readonly idleMs: number;
  private readonly minLength: number;
  private readonly setTimeoutFn: typeof setTimeout;
  private readonly clearTimeoutFn: typeof clearTimeout;

  constructor(
    private readonly onTrigger: DebouncerListener,
    options: DebouncerOptions = {},
  ) {
    this.idleMs = options.idleMs ?? 500;
    this.minLength = options.minLength ?? 3;
    this.setTimeoutFn = options.setTimeoutFn ?? setTimeout;
    this.clearTimeoutFn = options.clearTimeoutFn ?? clearTimeout;
  }

  /**
   * Feed a chunk of text in. May trigger 0 or 1 emissions synchronously
   * (sentence boundary case) and may schedule one for later (idle case).
   */
  push(chunk: string): void {
    if (!chunk) return;
    this.buffer += chunk;

    // Find the LAST terminal punctuation in the buffer.
    let lastTerminator = -1;
    for (const t of TERMINATORS) {
      const idx = this.buffer.lastIndexOf(t);
      if (idx > lastTerminator) lastTerminator = idx;
    }

    if (lastTerminator >= 0) {
      // Slice off everything up to and including the terminator.
      const completed = this.buffer.slice(0, lastTerminator + 1).trim();
      this.buffer = this.buffer.slice(lastTerminator + 1);
      this.cancelIdleTimer();

      if (completed.length >= this.minLength) {
        this.onTrigger(completed);
      }

      // If the trailing buffer has content, start an idle timer for it.
      if (this.buffer.trim().length >= this.minLength) {
        this.armIdleTimer();
      }
    } else {
      // No terminator yet — (re)arm the idle timer.
      this.armIdleTimer();
    }
  }

  /**
   * Force-emit whatever's in the buffer. Useful when the upstream stream
   * closes (LLM finishes responding mid-sentence, for example).
   */
  flush(): void {
    this.cancelIdleTimer();
    const text = this.buffer.trim();
    this.buffer = '';
    if (text.length >= this.minLength) {
      this.onTrigger(text);
    }
  }

  /** Drop pending state without emitting. */
  reset(): void {
    this.cancelIdleTimer();
    this.buffer = '';
  }

  private armIdleTimer(): void {
    this.cancelIdleTimer();
    this.idleTimer = this.setTimeoutFn.call(globalThis, () => {
      this.idleTimer = null;
      const text = this.buffer.trim();
      this.buffer = '';
      if (text.length >= this.minLength) {
        this.onTrigger(text);
      }
    }, this.idleMs);
  }

  private cancelIdleTimer(): void {
  if (this.idleTimer !== null) {
    this.clearTimeoutFn.call(globalThis, this.idleTimer);
      this.idleTimer = null;
    }
  }
}
