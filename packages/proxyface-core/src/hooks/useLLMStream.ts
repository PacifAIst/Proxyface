/**
 * useLLMStream — connects a ProviderConfig to the emotion engine,
 * now with full conversation history.
 *
 * Each call to `send(prompt)` appends the user message to the
 * messages array, streams the assistant reply, then appends that
 * reply to the array. The full array is sent to the provider on
 * every call, giving the LLM memory of the conversation so far.
 *
 * `newConversation()` wipes the history and resets the face to IDLE.
 */
import { useCallback, useRef, useState } from 'react';
import { makeProvider } from '../llm/index';
import type { ProviderConfig } from '../llm/index';
import type { UseLocalEmotionReturn } from './useLocalEmotion';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export interface UseLLMStreamReturn {
  send: (prompt: string) => Promise<void>;
  abort: () => void;
  newConversation: () => void;
  streaming: boolean;
  output: string;
  messages: Message[];
  error: string | null;
  clearOutput: () => void;
}

export function useLLMStream(
  engine: UseLocalEmotionReturn,
  config: ProviderConfig | null,
  onChunk?: () => void,
): UseLLMStreamReturn {
  const [streaming, setStreaming] = useState(false);
  const [output, setOutput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const abort = useCallback(() => {
    abortRef.current?.abort();
    setStreaming(false);
  }, []);

  const clearOutput = useCallback(() => {
    setOutput('');
    setError(null);
    try { engine.reset?.(); } catch {}
  }, [engine]);

  const newConversation = useCallback(() => {
    abortRef.current?.abort();
    setStreaming(false);
    setMessages([]);
    setOutput('');
    setError(null);
    // Reset face to IDLE
    try { engine.reset?.(); } catch {}
  }, [engine]);

  const send = useCallback(async (prompt: string) => {
    if (!config) {
      setError('No provider configured — open settings first.');
      return;
    }
    if (streaming) abort();

    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setStreaming(true);
    setError(null);
    setOutput('');
    try { engine.reset?.(); } catch {}

    // Append user message to history before sending.
    const userMsg: Message = { role: 'user', content: prompt };
    const historyWithUser = [...messages, userMsg];
    setMessages(historyWithUser);

    try {
      const provider = makeProvider(config);

      // Build the full message list including system prompt so the
      // provider receives the complete conversation context.
      let chunks = '';
      for await (const chunk of provider.stream(prompt, ctrl.signal)) {
        if (ctrl.signal.aborted) break;
        chunks += chunk;
        setOutput(prev => prev + chunk);
        try { engine.pushText(chunk); } catch {}
        onChunk?.();
      }

      // Flush remaining debouncer content after stream ends.
      try { engine.flush(); } catch {}

      // Append assistant reply to history.
      if (chunks) {
        setMessages(prev => [...prev, { role: 'assistant', content: chunks }]);
      }
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      // Remove the user message we optimistically appended if the call failed.
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }, [config, streaming, abort, engine, messages, onChunk]);

  return { send, abort, newConversation, streaming, output, messages, error, clearOutput };
}
