/**
 * Qwen (Alibaba) adapter.
 *
 * Qwen Chat renders assistant messages with class names containing
 * "response-text" or "assistant-message".
 *
 * Repair: open chat.qwen.ai, in DevTools run:
 *
 *   document.querySelectorAll('[class*="response-text"]')
 */

import type { HostAdapter } from './adapter';

const DEFAULT_SELECTOR = '[class*="response-text"], [class*="assistant-message"], [data-role="assistant"]';

export const qwenAdapter: HostAdapter = {
  id: 'qwen',
  name: 'Qwen',
  hostnames: ['chat.qwen.ai', 'tongyi.aliyun.com'],
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
