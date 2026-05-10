/**
 * Cross-browser extension API abstraction.
 *
 * Chrome exposes the `chrome.*` namespace with CALLBACK-style APIs
 * (with async/Promise-returning wrappers added in newer versions).
 * Firefox exposes the `browser.*` namespace with PROMISE-style APIs
 * natively, and also ships `chrome.*` as a compatibility alias with
 * callbacks.
 *
 * Historically this led to extensions hard-coding one or the other
 * and breaking on the "wrong" browser. We unify here:
 *
 *   - Prefer `browser.*` if it exists (Firefox native path).
 *   - Otherwise fall back to `chrome.*` (Chrome, plus Firefox's alias).
 *   - If neither exists (web app, SSR, tests) every method no-ops
 *     or returns a safe default so callers don't need to
 *     `typeof chrome !== 'undefined'` everywhere.
 *
 * The abstraction is intentionally narrow — we only expose the
 * methods ProxyFace actually uses. Adding more is a one-line change.
 */

type Callback<T> = (result: T) => void;

interface RawRuntime {
  getURL(path: string): string;
  sendMessage(
    message: unknown,
    callback?: Callback<unknown>,
  ): Promise<unknown> | undefined;
  onMessage: {
    addListener(listener: (...args: unknown[]) => unknown): void;
    removeListener(listener: (...args: unknown[]) => unknown): void;
  };
}

interface RawTabs {
  create(options: { url: string }): Promise<unknown> | undefined;
}

interface RawExtensionNamespace {
  runtime?: RawRuntime;
  tabs?: RawTabs;
}

function detectNamespace(): RawExtensionNamespace | null {
  // Firefox native: `browser` with promise-returning APIs.
  const maybeBrowser = (globalThis as { browser?: RawExtensionNamespace }).browser;
  if (maybeBrowser?.runtime?.getURL) return maybeBrowser;
  // Chrome + Firefox alias.
  const maybeChrome = (globalThis as { chrome?: RawExtensionNamespace }).chrome;
  if (maybeChrome?.runtime?.getURL) return maybeChrome;
  return null;
}

/**
 * True if we're running inside a WebExtension context (popup,
 * fullpage, content script, background worker).
 */
export function isExtensionContext(): boolean {
  return detectNamespace() !== null;
}

/**
 * Resolve an extension-packaged URL (e.g. "models/", "sprites/...").
 * Returns the original path unchanged in non-extension contexts so
 * relative URL resolution still works on the web.
 */
export function getURL(path: string): string {
  return detectNamespace()?.runtime?.getURL(path) ?? path;
}

/**
 * Send a message to the background worker / other extension contexts.
 * Handles the Chrome callback-vs-Firefox-promise split.
 * Rejects quietly (returns `null`) if no receiver is listening — a
 * common transient condition during navigation.
 */
export function sendMessage<TResponse = unknown>(message: unknown): Promise<TResponse | null> {
  const ns = detectNamespace();
  if (!ns?.runtime?.sendMessage) return Promise.resolve(null);

  return new Promise<TResponse | null>((resolve) => {
    try {
      const maybePromise = ns.runtime!.sendMessage(message, (response) => {
        // Chrome callback path. lastError read elides the unhandled
        // "Could not establish connection" runtime warning.
        const lastErr = (globalThis as { chrome?: { runtime?: { lastError?: unknown } } }).chrome
          ?.runtime?.lastError;
        if (lastErr) {
          resolve(null);
          return;
        }
        resolve(response as TResponse);
      });
      // Firefox native: sendMessage returns a promise directly.
      if (maybePromise && typeof (maybePromise as Promise<unknown>).then === 'function') {
        (maybePromise as Promise<unknown>)
          .then((r) => resolve(r as TResponse))
          .catch(() => resolve(null));
      }
    } catch {
      resolve(null);
    }
  });
}

/**
 * Add a runtime.onMessage listener.
 *
 * The listener may return:
 *   - `undefined` / any non-Promise value → no response sent.
 *   - A `Promise<T>` → the background keeps the channel open and
 *     sends the resolved value back to the sender. This mirrors
 *     Firefox's native Promise-returning semantics and translates
 *     automatically to Chrome's callback-style API.
 *
 * Returns an unsubscribe function.
 */
export function onMessage(
  listener: (message: unknown, sender?: unknown) => unknown | Promise<unknown>,
): () => void {
  const ns = detectNamespace();
  if (!ns?.runtime?.onMessage) return () => undefined;

  // Chrome expects `return true` from the listener to signal that
  // sendResponse will be called asynchronously. Firefox (and newer
  // Chrome) accepts returning a Promise directly. We support both
  // by checking the return type and dispatching appropriately.
  //
  // The signature is variadic to satisfy the RawRuntime type, but
  // we always destructure the WebExtension's standard 3-arg shape:
  // (message, sender, sendResponse).
  const wrapped = (...args: unknown[]) => {
    const message = args[0];
    const sender = args[1];
    const sendResponse = args[2] as ((response: unknown) => void) | undefined;

    const result = listener(message, sender);
    if (result && typeof (result as Promise<unknown>).then === 'function') {
      if (sendResponse) {
        (result as Promise<unknown>)
          .then((r) => {
            try {
              sendResponse(r);
            } catch {
              /* channel closed */
            }
          })
          .catch(() => {
            try {
              sendResponse(undefined);
            } catch {
              /* channel closed */
            }
          });
        // Tell Chrome we'll respond asynchronously.
        return true;
      }
      // Firefox: returning the Promise is sufficient.
      return result;
    }
    return undefined;
  };

  ns.runtime.onMessage.addListener(wrapped);
  return () => {
    try {
      ns.runtime!.onMessage.removeListener(wrapped);
    } catch {
      /* ignore during teardown */
    }
  };
}

/** Open a URL in a new tab. No-op outside extensions. */
export function openTab(url: string): void {
  const ns = detectNamespace();
  if (!ns?.tabs?.create) {
    // Fallback for the web app: best-effort `window.open`.
    if (typeof window !== 'undefined') window.open(url, '_blank', 'noopener');
    return;
  }
  try {
    ns.tabs.create({ url });
  } catch {
    /* ignore — user may have popup blocker on */
  }
}
