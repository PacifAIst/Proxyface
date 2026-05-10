/**
 * GLM / ChatGLM (Zhipu) adapter.
 *
 * Uses an "answer" or "response" wrapper class for assistant turns.
 *
 * Repair: open chatglm.cn, in DevTools run:
 *
 *   document.querySelectorAll('[class*="answer"], [class*="response"]')
 */

import type { HostAdapter } from './adapter';

const DEFAULT_SELECTOR = '[class*="answer-content"], [class*="message-answer"], [class*="response-content"], [data-role="assistant"]';

export const glmAdapter: HostAdapter = {
  id: 'glm',
  name: 'GLM',
  hostnames: ['chatglm.cn', 'zhipuai.cn'],
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
