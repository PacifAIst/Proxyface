/**
 * Grok (xAI) adapter.
 *
 * Grok's chat UI uses message-bubble classes for both user and
 * assistant — we filter to assistant via its specific class variant.
 *
 * Repair: open grok.com, in DevTools run:
 *
 *   document.querySelectorAll('[class*="message-bubble"]')
 *
 * Then inspect which class identifies assistant turns.
 */

import type { HostAdapter } from './adapter';

const DEFAULT_SELECTOR = '[class*="message-bubble"][class*="assistant"], [class*="response-text"], [data-role="assistant"]';

export const grokAdapter: HostAdapter = {
  id: 'grok',
  name: 'Grok',
  hostnames: ['grok.com', 'x.ai'],
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
