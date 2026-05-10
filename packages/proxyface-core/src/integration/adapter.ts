/**
 * Host adapter interface.
 *
 * Each LLM host (ChatGPT, Claude, Gemini, ...) has a unique DOM
 * structure for its streaming response. An adapter is a small
 * collection of pure functions that:
 *
 *   - Detects whether the current page is hosted by this LLM.
 *   - Identifies the DOM element(s) where the assistant's streaming
 *     response is being written.
 *   - Extracts new text from a mutation event.
 *
 * Adapters expose their selector via a `selector` field so users can
 * override it at runtime (via the extension options page) when an
 * LLM rebrands and breaks the default. The override is loaded from
 * browser.storage.local at adapter resolution time.
 */

export interface HostAdapter {
  /** Stable id for logging / debug / storage keys. */
  id: string;
  /** Human-readable display name. */
  name: string;
  /** Hostname patterns this adapter handles, matched as `hostname.includes(...)`. */
  hostnames: readonly string[];
  /** The CSS selector for assistant messages. May be overridden by user. */
  selector: string;
  /** The default selector (read-only — what we shipped). */
  defaultSelector: string;
  /**
   * Find all elements that currently contain a streaming assistant
   * response.
   */
  findStreamingElements(root: Document | Element): Element[];
  /**
   * Given a mutation target, return the text that just changed.
   */
  extractDelta(mutation: MutationRecord, lastSeenTextLength: number): string;
  /** Optional: a CSS selector that confirms the element is an assistant message. */
  assistantContainerSelector?: string;
}

/** Pick the adapter that matches the current page's hostname. */
export function pickAdapter(
  adapters: readonly HostAdapter[],
  hostname = window.location.hostname,
): HostAdapter | null {
  const lower = hostname.toLowerCase();
  return adapters.find((a) => a.hostnames.some((h) => lower.includes(h))) ?? null;
}

/**
 * Apply user selector overrides from extension storage.
 *
 * Returns a fresh adapter list with overrides merged in. Call this
 * once at content-script startup before passing adapters to
 * StreamObserver.
 *
 * Uses globalThis casting to look up `browser` (Firefox) and `chrome`
 * (Chrome/Edge) without requiring @types/chrome to be installed. In
 * the web app context where neither global exists, this safely no-ops
 * and returns the adapters unchanged.
 */
export async function applySelectorOverrides(
  adapters: readonly HostAdapter[],
): Promise<readonly HostAdapter[]> {
  type StorageAPI = {
    storage?: { local?: { get: (k: string) => Promise<Record<string, unknown>> } };
  };
  const g = globalThis as unknown as { browser?: StorageAPI; chrome?: StorageAPI };
  const api = g.browser ?? g.chrome;
  if (!api?.storage?.local) return adapters;

  let overrides: Record<string, string> = {};
  try {
    const stored = await api.storage.local.get('proxyface_selector_overrides');
    overrides = (stored?.proxyface_selector_overrides as Record<string, string>) ?? {};
  } catch {
    return adapters;
  }

  return adapters.map((a) => {
    const ov = overrides[a.id];
    if (!ov || ov === a.defaultSelector) return a;
    return { ...a, selector: ov, assistantContainerSelector: ov };
  });
}
