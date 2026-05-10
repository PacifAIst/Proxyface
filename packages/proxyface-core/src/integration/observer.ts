/**
 * StreamObserver — observes the document for assistant text deltas.
 *
 * Owned by the content script. Wraps a MutationObserver, dispatches
 * mutations to the active host adapter, and emits clean text deltas
 * via the `onDelta` callback.
 *
 * Per-element text-length tracking:
 *   We track the last-seen text length per streaming element so we
 *   can compute deltas. Without this we'd re-emit the entire
 *   message on every mutation — devastating for downstream
 *   debouncing.
 *
 * Why a class and not a hook:
 *   Content scripts don't run React. The observer needs to work in
 *   plain TypeScript so the same code is callable from the worker
 *   bridge in extensions and from a small standalone test page.
 */

import type { HostAdapter } from './adapter';

export interface StreamObserverOptions {
  adapter: HostAdapter;
  onDelta: (delta: string) => void;
  /**
   * Optional: called when the observer first detects assistant text
   * after a quiet period. Lets the consumer reset upstream state
   * (e.g. flush the debouncer for a fresh classification).
   */
  onStreamStart?: () => void;
  /**
   * How long without any text before we treat the next text as a new
   * stream. Default: 1500ms.
   */
  streamGapMs?: number;
}

export class StreamObserver {
  private adapter: HostAdapter;
  private onDelta: (delta: string) => void;
  private onStreamStart?: () => void;
  private streamGapMs: number;

  private observer: MutationObserver | null = null;
  /** Per-element text-length cursor. WeakMap so detached elements GC. */
  private cursors = new WeakMap<Element, number>();
  private lastDeltaAt = 0;

  constructor(opts: StreamObserverOptions) {
    this.adapter = opts.adapter;
    this.onDelta = opts.onDelta;
    this.onStreamStart = opts.onStreamStart;
    this.streamGapMs = opts.streamGapMs ?? 1500;
  }

  start(root: Document | Element = document): void {
    if (this.observer) return;
    this.observer = new MutationObserver((mutations) => this.handle(mutations));
    this.observer.observe(root, {
      subtree: true,
      childList: true,
      characterData: true,
    });
  }

  stop(): void {
    this.observer?.disconnect();
    this.observer = null;
    this.cursors = new WeakMap();
    this.lastDeltaAt = 0;
  }

  private handle(mutations: MutationRecord[]): void {
    // Coalesce: many mutations land per frame during streaming. We
    // want to find the most-recently-touched assistant element and
    // emit its delta once, not N times.
    const touched = new Set<Element>();

    for (const m of mutations) {
      const target = m.target as Node;
      let el: Element | null;
      if (target.nodeType === Node.TEXT_NODE) {
        el = (target as Text).parentElement;
      } else if (target.nodeType === Node.ELEMENT_NODE) {
        el = target as Element;
      } else {
        continue;
      }
      if (!el) continue;

      // Walk up to the assistant container, if any.
      const sel = this.adapter.assistantContainerSelector;
      if (sel) {
        let cursor: Element | null = el;
        while (cursor && cursor !== document.body && !cursor.matches?.(sel)) {
          cursor = cursor.parentElement;
        }
        if (!cursor || cursor === document.body) continue;
        touched.add(cursor);
      } else {
        touched.add(el);
      }
    }

    if (touched.size === 0) return;

    const now = performance.now();
    if (this.onStreamStart && now - this.lastDeltaAt > this.streamGapMs) {
      this.onStreamStart();
    }

    for (const el of touched) {
      const fullText = (el as HTMLElement).innerText ?? el.textContent ?? '';
      const seen = this.cursors.get(el) ?? 0;
      if (fullText.length <= seen) {
        // Text shrank — likely a re-render or message edit. Reset cursor.
        this.cursors.set(el, fullText.length);
        continue;
      }
      const delta = fullText.slice(seen);
      this.cursors.set(el, fullText.length);
      if (delta.trim()) {
        this.lastDeltaAt = now;
        this.onDelta(delta);
      }
    }
  }
}
