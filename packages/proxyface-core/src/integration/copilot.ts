/**
 * Microsoft Copilot adapter.
 *
 * Copilot uses a custom message component. Streaming responses live
 * in elements with data-content="ai-message" or class containing
 * "ai-message-item".
 *
 * Repair: open copilot.microsoft.com, send a message, in DevTools run:
 *
 *   document.querySelectorAll('[data-content="ai-message"]')
 *
 * If that returns nothing, fall back to:
 *
 *   document.querySelectorAll('[class*="ai-message"]')
 */

import type { HostAdapter } from './adapter';

const DEFAULT_SELECTOR = '[data-content="ai-message"], [class*="ai-message-item"], [data-testid="ai-response"]';

export const copilotAdapter: HostAdapter = {
  id: 'copilot',
  name: 'Microsoft Copilot',
  hostnames: ['copilot.microsoft.com', 'bing.com/chat'],
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
