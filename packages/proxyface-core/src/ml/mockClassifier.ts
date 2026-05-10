/**
 * Mock emotion classifier.
 *
 * Pure regex heuristics — no model, no inference, no async. Used by
 * `useMockEmotion` so step 3 can be wired up and visually validated
 * before step 2 (the actual training pipeline) has been run.
 *
 * Accuracy is intentionally rough — this exists for plumbing tests
 * and design review, NOT as a fallback for production. The real
 * inference engine in `worker.ts` always wins when the model files
 * are present.
 */

import type { Emotion } from '../types';

interface Rule {
  emotion: Emotion;
  /** Higher = checked first; first match wins. */
  weight: number;
  pattern: RegExp;
}

// Order matters within a weight bucket — first match wins.
const RULES: Rule[] = [
  // ERROR — strongest signals (status codes, tracebacks)
  { emotion: 'ERROR', weight: 100, pattern: /\b(error|exception|traceback|panic|fatal)\b/i },
  { emotion: 'ERROR', weight: 100, pattern: /\b(404|500|502|503|timeout|refused)\b/i },
  { emotion: 'ERROR', weight: 100, pattern: /(typeerror|referenceerror|syntaxerror|valueerror|importerror)/i },
  { emotion: 'ERROR', weight: 100, pattern: /\bat\s+\w+\s+\([^)]+:\d+:\d+\)/ }, // stack frame

  // ANGRY — refusals
  { emotion: 'ANGRY', weight: 90, pattern: /\b(absolutely not|will not|refuse|cannot and will not)\b/i },
  { emotion: 'ANGRY', weight: 90, pattern: /\bhard\s+no\b/i },
  { emotion: 'ANGRY', weight: 90, pattern: /\bnot\s+going\s+to\s+do\s+that\b/i },

  // SAD — apologies
  { emotion: 'SAD', weight: 80, pattern: /\b(apologi[sz]e|sorry|unfortunately|regret|afraid)\b/i },
  { emotion: 'SAD', weight: 80, pattern: /\b(cannot|cannot help|don't have)\b/i },

  // HAPPY — success / affirmation
  { emotion: 'HAPPY', weight: 70, pattern: /\b(done|success|perfect|great|awesome|excellent|wonderful)\b/i },
  { emotion: 'HAPPY', weight: 70, pattern: /\b(here you go|all set|ready)\b/i },
  { emotion: 'HAPPY', weight: 70, pattern: /[!]{1,}\s*🎉?$/ },

  // SURPRISED — discoveries
  { emotion: 'SURPRISED', weight: 60, pattern: /\b(oh|wow|whoa|huh|wait)\b[!,.]?\s/i },
  { emotion: 'SURPRISED', weight: 60, pattern: /\b(surprising|unexpected|interesting|fascinating)\b/i },

  // EXPLAINING — didactic markers
  { emotion: 'EXPLAINING', weight: 50, pattern: /\b(firstly|secondly|thirdly|first|second|third)[,.\s]/i },
  { emotion: 'EXPLAINING', weight: 50, pattern: /\b(therefore|hence|thus|consequently|in essence)\b/i },
  { emotion: 'EXPLAINING', weight: 50, pattern: /\b(let me explain|the reason|the key concept|consider)\b/i },
  { emotion: 'EXPLAINING', weight: 50, pattern: /^[\s]*[-*]\s|\n[\s]*[-*]\s/ }, // bullet points
  { emotion: 'EXPLAINING', weight: 50, pattern: /^[\s]*\d+[.)]\s|\n[\s]*\d+[.)]\s/ }, // numbered

  // THINKING — hedges
  { emotion: 'THINKING', weight: 40, pattern: /\b(hmm|let me think|let me consider|one moment)\b/i },
  { emotion: 'THINKING', weight: 40, pattern: /\b(thinking|considering|working through|pondering)\b/i },
  { emotion: 'THINKING', weight: 40, pattern: /\.{3}|…/ },
];

export interface MockResult {
  emotion: Emotion;
  /** Always 0.6 for matched rules, 0.4 for the IDLE default. */
  confidence: number;
}

/** Synchronous regex-based classifier. Sub-millisecond. */
export function classifyMock(text: string): MockResult {
  const sorted = [...RULES].sort((a, b) => b.weight - a.weight);
  for (const rule of sorted) {
    if (rule.pattern.test(text)) {
      return { emotion: rule.emotion, confidence: 0.6 };
    }
  }
  return { emotion: 'IDLE', confidence: 0.4 };
}
