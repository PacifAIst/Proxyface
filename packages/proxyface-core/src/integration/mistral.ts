/**
 * Mistral Le Chat adapter.
 *
 * Mistral wraps assistant messages in <article> elements with
 * Tailwind's prose classes for styled markdown.
 *
 * Repair: open chat.mistral.ai, in DevTools run:
 *
 *   document.querySelectorAll('article [class*="prose"]')
 */

import type { HostAdapter } from './adapter';

const DEFAULT_SELECTOR = 'article [class*="prose"], [class*="assistant-message"], [data-role="assistant"]';

export const mistralAdapter: HostAdapter = {
  id: 'mistral',
  name: 'Mistral Le Chat',
  hostnames: ['chat.mistral.ai', 'mistral.ai/chat'],
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
