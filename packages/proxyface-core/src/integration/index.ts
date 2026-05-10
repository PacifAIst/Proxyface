/**
 * Built-in adapter registry.
 *
 * Order matters only for tie-breaking (which never happens in
 * practice — hostnames are mutually exclusive).
 */

import type { HostAdapter } from './adapter';
import { chatgptAdapter } from './chatgpt';
import { claudeAdapter } from './claude';
import { geminiAdapter } from './gemini';

export const BUILTIN_ADAPTERS: readonly HostAdapter[] = [
  chatgptAdapter,
  claudeAdapter,
  geminiAdapter,
] as const;

export { chatgptAdapter, claudeAdapter, geminiAdapter };
export type { HostAdapter } from './adapter';
export { pickAdapter } from './adapter';
export { StreamObserver } from './observer';
export type { StreamObserverOptions } from './observer';
