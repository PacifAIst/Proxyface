/**
 * LMSys Arena adapter.
 *
 * Arena.ai (chatbot arena) shows TWO model responses side-by-side
 * for blind comparison. We watch both columns — the StreamObserver
 * naturally handles multiple streaming elements.
 *
 * Repair: open arena.ai, in DevTools run:
 *
 *   document.querySelectorAll('[class*="response"]')
 */

import type { HostAdapter } from './adapter';

const DEFAULT_SELECTOR = '[class*="response-content"], [class*="model-response"], [data-role="assistant"]';

export const arenaAdapter: HostAdapter = {
  id: 'arena',
  name: 'Chatbot Arena',
  hostnames: ['arena.ai', 'lmarena.ai', 'chat.lmsys.org'],
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
