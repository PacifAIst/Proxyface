import type { LLMProvider, ProviderConfig } from './providers';

interface OllamaChunk {
  message?: { content?: string };
  response?: string;
  done?: boolean;
}

/**
 * Ollama's native /api/chat endpoint streams NDJSON (one JSON object
 * per line) rather than SSE. We support that format here.
 *
 * If you prefer to use Ollama's OpenAI-compatible endpoint at
 * /v1/chat/completions, configure it as a 'custom' provider with that
 * URL instead — both work, but the native API exposes more options
 * (temperature, top_p, stop sequences) on a per-request basis.
 */
export class OllamaProvider implements LLMProvider {
  readonly name = 'Ollama';
  constructor(private readonly cfg: ProviderConfig) {}

  async *stream(prompt: string, signal?: AbortSignal): AsyncIterable<string> {
    const base = this.cfg.endpoint ?? 'http://localhost:11434/api/chat';
    const url = base.endsWith('/api/chat') ? base : `${base.replace(/\/$/, '')}/api/chat`;

    const messages: Array<{ role: string; content: string }> = [];
    if (this.cfg.systemPrompt) {
      messages.push({ role: 'system', content: this.cfg.systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    const res = await fetch(url, {
      method: 'POST',
      signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.cfg.model,
        messages,
        stream: true,
        options: { temperature: this.cfg.temperature ?? 0.7 },
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`Ollama ${res.status}: ${errText.slice(0, 300)}`);
    }
    if (!res.body) throw new Error('Ollama: no response body');

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    try {
      while (true) {
        if (signal?.aborted) throw new DOMException('aborted', 'AbortError');
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let nl = buffer.indexOf('\n');
        while (nl !== -1) {
          const line = buffer.slice(0, nl).trim();
          buffer = buffer.slice(nl + 1);
          if (line) {
            try {
              const obj = JSON.parse(line) as OllamaChunk;
              const text = obj.message?.content ?? obj.response;
              if (text) yield text;
              if (obj.done) return;
            } catch {
              /* skip malformed line */
            }
          }
          nl = buffer.indexOf('\n');
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}