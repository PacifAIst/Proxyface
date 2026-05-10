/**
 * DeepSeek adapter.
 *
 * DeepSeek's chat UI is a React SPA where the body is just
 * <div id="root">, so we have to wait for client-side rendering.
 *
 * Assistant messages are wrapped in elements with class containing
 * "ds-markdown" (their custom markdown renderer). User messages
 * don't get this class — perfect filter.
 *
 * Repair: open chat.deepseek.com, send a message, in DevTools run:
 *
 *   document.querySelectorAll('[class*="ds-markdown"]')
 *
 * If that fails, DeepSeek probably renamed their renderer class.
 * Try inspecting the streaming text and grab whatever class
 * uniquely identifies the assistant bubble.
 */

import type { HostAdapter } from './adapter';

const DEFAULT_SELECTOR = '[class*="ds-markdown"], [class*="message-content"][class*="assistant"], [class*="_assistant_"]';

export const deepseekAdapter: HostAdapter = {
  id: 'deepseek',
  name: 'DeepSeek',
  hostnames: ['chat.deepseek.com', 'deepseek.com'],
  selector: DEFAULT_SELECTOR,
  defaultSelector: DEFAULT_SELECTOR,
  assistantContainerSelector: DEFAULT_SELECTOR,

  findStreamingElements(root) {
    return Array.from(root.querySelectorAll(this.selector));
  },

  extractDelta(mutation, lastSeenTextLength) {
    const target = mutation.target as Element | Text;
    let el: Element | null =
      target.nodeType === Node.TEXT_NODE
        ? (target.parentElement as Element | null)
        : (target as Element);
    while (el && el !== document.body) {
      if (el.matches?.(this.selector)) break;
      el = el.parentElement;
    }
    if (!el || el === document.body) return '';
    const fullText = (el as HTMLElement).innerText ?? el.textContent ?? '';
    if (fullText.length <= lastSeenTextLength) return '';
    return fullText.slice(lastSeenTextLength);
  },
};
