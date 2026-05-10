import { readSSE, type LLMProvider, type ProviderConfig } from './providers';

interface AnthropicEvent {
  type: string;
  delta?: { type?: string; text?: string };
}

export class AnthropicProvider implements LLMProvider {
  readonly name = 'Anthropic';

  constructor(private readonly cfg: ProviderConfig) {
    if (!cfg.apiKey) throw new Error('Anthropic requires an API key');
  }

  async *stream(prompt: string, signal?: AbortSignal): AsyncIterable<string> {
    const url = this.cfg.endpoint ?? 'https://api.anthropic.com/v1/messages';
    const res = await fetch(url, {
      method: 'POST',
      signal,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.cfg.apiKey ?? '',
        'anthropic-version': '2023-06-01',
        // Required for browser-side calls; otherwise Anthropic blocks CORS.
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: this.cfg.model,
        max_tokens: this.cfg.maxTokens ?? 512,
        temperature: this.cfg.temperature ?? 0.7,
        system: this.cfg.systemPrompt,
        messages: [{ role: 'user', content: prompt }],
        stream: true,
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`Anthropic ${res.status}: ${errText.slice(0, 300)}`);
    }

    for await (const event of readSSE(res, signal)) {
      const ev = event as AnthropicEvent;
      if (
        ev.type === 'content_block_delta'
        && ev.delta?.type === 'text_delta'
        && ev.delta.text
      ) {
        yield ev.delta.text;
      }
    }
  }
}