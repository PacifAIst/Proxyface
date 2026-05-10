/**
 * Gemini (gemini.google.com) adapter.
 *
 * Gemini uses Angular Material under the hood. Streaming responses
 * land inside `<message-content>` elements (custom Angular component)
 * inside `<model-response>` containers.
 *
 * Repair path in DevTools:
 *
 *     document.querySelectorAll('model-response message-content')
 *
 * If Google migrates off these element names (they have done this
 * before during Bard → Gemini → Gemini Advanced renames), update
 * DEFAULT_SELECTOR below.
 */

import type { HostAdapter } from './adapter';

const DEFAULT_SELECTOR = 'model-response message-content, [data-test-id="response-element"]';

export const geminiAdapter: HostAdapter = {
  id: 'gemini',
  name: 'Gemini',
  hostnames: ['gemini.google.com'],
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
