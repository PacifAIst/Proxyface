/**
 * useExtensionStreamBridge — surface-side companion to the background
 * message bridge.
 *
 * Subscribes to runtime message broadcasts and invokes `onDelta` for
 * every delta broadcast from the background. On mount it also asks
 * the background for the latest known delta so a freshly-opened
 * popup catches up to in-flight streams.
 *
 * No-ops when no WebExtension namespace is available (web app, tests).
 */

import { useEffect } from 'react';
import { onMessage, sendMessage } from '../platform/extensionApi';

interface BroadcastMessage {
  type: string;
  delta?: string;
  adapterId?: string;
  latestDelta?: { delta: string; adapterId: string; receivedAt: number } | null;
}

export interface UseExtensionStreamBridgeOptions {
  onDelta: (delta: string, adapterId: string) => void;
  /** Optional handler for stream-start events (use to reset debouncers). */
  onStreamStart?: () => void;
  /** Disable the bridge (no listeners attached). */
  disabled?: boolean;
}

export function useExtensionStreamBridge(opts: UseExtensionStreamBridgeOptions): void {
  const { onDelta, onStreamStart, disabled = false } = opts;

  useEffect(() => {
    if (disabled) return;

    const unsubscribe = onMessage((rawMessage) => {
      const message = rawMessage as BroadcastMessage;
      if (!message?.type) return undefined;
      switch (message.type) {
        case 'proxyface/delta-broadcast':
          if (message.delta) onDelta(message.delta, message.adapterId ?? 'unknown');
          break;
        case 'proxyface/stream-start-broadcast':
          onStreamStart?.();
          break;
      }
      return undefined;
    });

    // Catch up on the latest delta if the surface opened mid-stream.
    void sendMessage<BroadcastMessage>({ type: 'proxyface/get-latest' }).then((resp) => {
      if (resp?.latestDelta?.delta) {
        onDelta(resp.latestDelta.delta, resp.latestDelta.adapterId ?? 'unknown');
      }
    });

    return unsubscribe;
  }, [disabled, onDelta, onStreamStart]);
}
