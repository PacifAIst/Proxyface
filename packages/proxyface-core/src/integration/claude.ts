/**
 * Claude.ai adapter.
 *
 * Claude's DOM uses `[data-test-render-count]` on streaming
 * paragraphs and tags assistant messages with class names containing
 * "assistant" or with `[data-is-streaming="true"]` during streaming.
 *
 * The most reliable selector across recent Claude.ai versions is
 * `.font-claude-message`. If that breaks, fall back to scanning for
 * paragraphs whose closest ancestor `[data-testid]` mentions
 * "message" and is not the user input.
 *
 * As with the ChatGPT adapter, the in-DevTools repair path is:
 *
 *     document.querySelectorAll('.font-claude-message')
 *
 * Update DEFAULT_SELECTOR if Anthropic changes the class name.
 */

import type { HostAdapter } from './adapter';

const DEFAULT_SELECTOR = '.font-claude-message, [data-is-streaming="true"]';
const FALLBACK_SELECTOR = '[data-testid*="assistant"]';

export const claudeAdapter: HostAdapter = {
  id: 'claude',
  name: 'Claude.ai',
  hostnames: ['claude.ai'],
  selector: DEFAULT_SELECTOR,
  defaultSelector: DEFAULT_SELECTOR,
  assistantContainerSelector: DEFAULT_SELECTOR,

  findStreamingElements(root) {
    const primary = Array.from(root.querySelectorAll(this.selector));
    if (primary.length > 0) return primary;
    return Array.from(root.querySelectorAll(FALLBACK_SELECTOR));
  },

  extractDelta(mutation, lastSeenTextLength) {
    const target = mutation.target as Element | Text;
    let el: Element | null =
      target.nodeType === Node.TEXT_NODE
        ? (target.parentElement as Element | null)
        : (target as Element);
    while (el && el !== document.body) {
      if (
        el.matches?.(this.selector) ||
        el.matches?.(FALLBACK_SELECTOR)
      ) {
        break;
      }
      el = el.parentElement;
    }
    if (!el || el === document.body) return '';
    const fullText = (el as HTMLElement).innerText ?? el.textContent ?? '';
    if (fullText.length <= lastSeenTextLength) return '';
    return fullText.slice(lastSeenTextLength);
  },
};
