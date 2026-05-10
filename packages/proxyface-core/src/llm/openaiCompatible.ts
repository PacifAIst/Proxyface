import {
  PROVIDERS,
  readSSE,
  type LLMProvider,
  type ProviderConfig,
} from './providers';

interface ChatChunk {
  choices?: Array<{ delta?: { content?: string }; message?: { content?: string } }>;
}

/**
 * Generic OpenAI-compatible Chat Completions streaming client.
 *
 * Works with any service that implements POST /chat/completions with
 * the standard request schema and SSE response format. That covers:
 *   OpenAI, OpenRouter, DeepSeek, Qwen (DashScope), GLM (Zhipu),
 *   Grok (xAI), Mistral, LM Studio, plus user-defined "custom" endpoints.
 *
 * Provider-specific behavior (endpoint URL, auth header style) comes
 * from the PROVIDERS descriptor table.
 */
export class OpenAICompatibleProvider implements LLMProvider {
  readonly name: string;

  constructor(private readonly cfg: ProviderConfig) {
    const desc = PROVIDERS[cfg.provider];
    if (!desc) throw new Error(`Unknown provider: ${cfg.provider}`);
    if (!desc.openaiCompatible && cfg.provider !== 'custom') {
      throw new Error(
        `Provider ${cfg.provider} is not OpenAI-compatible; use its dedicated class`,
      );
    }
    this.name = desc.label;
  }

  async *stream(prompt: string, signal?: AbortSignal): AsyncIterable<string> {
    const desc = PROVIDERS[this.cfg.provider];
    const url = this.cfg.endpoint || desc.defaultEndpoint;
    if (!url) {
      throw new Error('No endpoint URL configured for this provider');
    }

    // Build auth headers based on provider style.
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (desc.authHeader === 'bearer' && this.cfg.apiKey) {
      headers['Authorization'] = `Bearer ${this.cfg.apiKey}`;
    }
    // OpenRouter recommends these for ranking but they're optional.
    if (this.cfg.provider === 'openrouter') {
      headers['HTTP-Referer'] = 'https://proxyface.example.com';
      headers['X-Title'] = 'ProxyFace';
    }

    const messages: Array<{ role: string; content: string }> = [];
    if (this.cfg.systemPrompt) {
      messages.push({ role: 'system', content: this.cfg.systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    // OpenAI-direct: use max_completion_tokens (works for ALL models including
    // o-series) and omit temperature entirely. Some OpenAI models (o1/o3/o4,
    // gpt-5.5) reject or restrict temperature; the API defaults to 1 internally
    // when omitted. All other providers send both max_tokens + temperature.
    const isOpenAI = this.cfg.provider === 'openai';

    const body: Record<string, unknown> = {
      model: this.cfg.model,
      messages,
      stream: true,
      ...(isOpenAI
        ? { max_completion_tokens: this.cfg.maxTokens ?? 512 }
        : { max_tokens: this.cfg.maxTokens ?? 512, temperature: this.cfg.temperature ?? 0.7 }),
    };

    const res = await fetch(url, {
      method: 'POST',
      signal,
      headers,
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`${this.name} ${res.status}: ${errText.slice(0, 300)}`);
    }

    for await (const event of readSSE(res, signal)) {
      const chunk = event as ChatChunk;
      const delta = chunk.choices?.[0]?.delta?.content
        ?? chunk.choices?.[0]?.message?.content;
      if (delta) yield delta;
    }
  }
}
