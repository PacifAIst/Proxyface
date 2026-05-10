/**
 * Kimi (Moonshot AI) adapter.
 *
 * Kimi uses a Slate-based editor for input and renders assistant
 * messages with class names containing "message-content" + "assistant".
 *
 * Repair: open kimi.com, in DevTools run:
 *
 *   document.querySelectorAll('[class*="message-content"][class*="assistant"]')
 */

import type { HostAdapter } from './adapter';

const DEFAULT_SELECTOR = '[class*="message-content"][class*="assistant"], [class*="kimi-message-assistant"], [data-role="assistant"]';

export const kimiAdapter: HostAdapter = {
  id: 'kimi',
  name: 'Kimi',
  hostnames: ['kimi.com', 'moonshot.cn'],
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
