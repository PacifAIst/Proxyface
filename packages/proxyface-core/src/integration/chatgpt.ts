/**
 * ChatGPT adapter.
 *
 * Selector strategy (resilient to OpenAI's frequent rebrands):
 *
 *   - Each message is `[data-message-author-role]`. We filter for
 *     `="assistant"`.
 *   - Users can override the selector via the options page if OpenAI
 *     ships a breaking change.
 *
 * Repair: open ChatGPT, send a message, in DevTools run:
 *
 *     document.querySelectorAll('[data-message-author-role="assistant"]')
 *
 * If empty, OpenAI changed the attribute. Fix via options page.
 */

import type { HostAdapter } from './adapter';

const DEFAULT_SELECTOR = '[data-message-author-role="assistant"]';

export const chatgptAdapter: HostAdapter = {
  id: 'chatgpt',
  name: 'ChatGPT',
  hostnames: ['chat.openai.com', 'chatgpt.com'],
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
