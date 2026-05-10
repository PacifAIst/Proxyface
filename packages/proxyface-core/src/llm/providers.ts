/**
 * LLMProvider -- common interface for streaming text from any LLM backend.
 *
 * Each implementation yields raw text chunks as they arrive. The
 * EmotionDebouncer (in ml/debouncer.ts) consumes these chunks and
 * triggers classification on punctuation or idle timeout.
 *
 * Design note: most modern LLM APIs (OpenAI, OpenRouter, DeepSeek,
 * Qwen/DashScope, Zhipu/GLM, xAI/Grok, Mistral, LM Studio) implement
 * the OpenAI Chat Completions wire format with streaming SSE. We
 * use a single shared OpenAICompatibleProvider for all of them and
 * parameterize the base URL, model, and auth header.
 *
 * Anthropic and Ollama don't fit that pattern, so they stay separate.
 */

export type ProviderId =
  | 'openai'
  | 'anthropic'
  | 'gemini'
  | 'openrouter'
  | 'deepseek'
  | 'qwen'
  | 'glm'
  | 'grok'
  | 'mistral'
  | 'ollama'
  | 'lmstudio'
  | 'custom';

export interface LLMProvider {
  /** Human-readable name shown in the UI. */
  readonly name: string;
  /**
   * Stream a completion for the given prompt. Yields text chunks as
   * they arrive. Caller passes an AbortSignal for cancellation.
   */
  stream(prompt: string, signal?: AbortSignal): AsyncIterable<string>;
}

export interface ProviderConfig {
  provider: ProviderId;
  /** Bearer token; not used for ollama/lmstudio. */
  apiKey?: string;
  /** Endpoint URL override. Each provider has a sensible default. */
  endpoint?: string;
  /** Model identifier (e.g. "gpt-5.5", "deepseek-v4-flash", "llama3.1"). */
  model: string;
  maxTokens?: number;
  systemPrompt?: string;
  temperature?: number;
}

/**
 * Per-provider defaults: base URL, auth-header style, and a few
 * suggested model names that the UI can offer as quick-pick options.
 *
 * `authHeader` distinguishes the two common patterns:
 *   - 'bearer':  Authorization: Bearer <key>      (most providers)
 *   - 'x-api-key': x-api-key: <key>               (Anthropic only)
 *   - 'none':    no auth                          (Ollama, LM Studio)
 */
export interface ProviderDescriptor {
  id: ProviderId;
  label: string;
  defaultEndpoint: string;
  authHeader: 'bearer' | 'x-api-key' | 'none';
  /** True if this provider speaks the OpenAI Chat Completions format. */
  openaiCompatible: boolean;
  /** Suggested models for the quick-pick dropdown. */
  suggestedModels: string[];
  /** Documentation URL for getting an API key. */
  docsUrl?: string;
}

export const PROVIDERS: Record<ProviderId, ProviderDescriptor> = {
  openai: {
    id: 'openai',
    label: 'OpenAI',
    defaultEndpoint: 'https://api.openai.com/v1/chat/completions',
    authHeader: 'bearer',
    openaiCompatible: true,
    suggestedModels: [
      'gpt-5.5',
      'gpt-5.4',
      'gpt-5.4-pro',
      'gpt-5.4-mini',
      'gpt-5.4-nano',
      'gpt-4.1',
      'gpt-4.1-mini',
      'gpt-4.1-nano',
      'gpt-4o',
      'gpt-4o-mini',
      'o4-mini',
      'o3',
    ],
    docsUrl: 'https://platform.openai.com/api-keys',
  },
  anthropic: {
    id: 'anthropic',
    label: 'Anthropic',
    defaultEndpoint: 'https://api.anthropic.com/v1/messages',
    authHeader: 'x-api-key',
    openaiCompatible: false,
    suggestedModels: [
      'claude-opus-4-7',
      'claude-opus-4-6',
      'claude-sonnet-4-6',
      'claude-haiku-4-5',
    ],
    docsUrl: 'https://console.anthropic.com/settings/keys',
  },
  gemini: {
    id: 'gemini',
    label: 'Gemini (Google)',
    defaultEndpoint: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
    authHeader: 'bearer',
    openaiCompatible: true,
    suggestedModels: [
      'gemini-3.1-pro-preview',
      'gemini-3-flash-preview',
      'gemini-3.1-flash-lite',
      'gemini-3.1-flash-lite-preview',
      'gemini-2.5-flash',
    ],
    docsUrl: 'https://aistudio.google.com/app/apikey',
  },
  openrouter: {
    id: 'openrouter',
    label: 'OpenRouter',
    defaultEndpoint: 'https://openrouter.ai/api/v1/chat/completions',
    authHeader: 'bearer',
    openaiCompatible: true,
    suggestedModels: [
      'openrouter/free',
      'openai/gpt-5.5',
      'anthropic/claude-opus-4-7',
      'anthropic/claude-sonnet-4-6',
      'google/gemini-2.5-flash',
      'google/gemini-2.5-pro',
      'meta-llama/llama-4-maverick',
      'meta-llama/llama-4-scout',
      'qwen/qwen3.6-plus',
      'deepseek/deepseek-v4-pro',
      'mistralai/mistral-large-latest',
      'minimax/minimax-m2.5:free',
      'moonshotai/kimi-k2.6',
      'moonshotai/kimi-k2.5',
    ],
    docsUrl: 'https://openrouter.ai/keys',
  },
  deepseek: {
    id: 'deepseek',
    label: 'DeepSeek',
    defaultEndpoint: 'https://api.deepseek.com/v1/chat/completions',
    authHeader: 'bearer',
    openaiCompatible: true,
    suggestedModels: ['deepseek-v4-pro', 'deepseek-v4-flash'],
    docsUrl: 'https://platform.deepseek.com/api_keys',
  },
  qwen: {
    id: 'qwen',
    label: 'Qwen (DashScope)',
    defaultEndpoint:
      'https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions',
    authHeader: 'bearer',
    openaiCompatible: true,
    suggestedModels: [
      'qwen3.6-max-preview',
      'qwen3.6-plus',
      'qwen3.6-flash',
    ],
    docsUrl: 'https://www.alibabacloud.com/help/en/model-studio',
  },
  glm: {
    id: 'glm',
    label: 'GLM (Zhipu)',
    defaultEndpoint: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
    authHeader: 'bearer',
    openaiCompatible: true,
    suggestedModels: ['glm-5.1', 'glm-5', 'glm-4.7', 'glm-4.7-flash'],
    docsUrl: 'https://open.bigmodel.cn/usercenter/apikeys',
  },
  grok: {
    id: 'grok',
    label: 'Grok (xAI)',
    defaultEndpoint: 'https://api.x.ai/v1/chat/completions',
    authHeader: 'bearer',
    openaiCompatible: true,
    suggestedModels: ['grok-4.20', 'grok-4.1', 'grok-4'],
    docsUrl: 'https://console.x.ai',
  },
  mistral: {
    id: 'mistral',
    label: 'Mistral',
    defaultEndpoint: 'https://api.mistral.ai/v1/chat/completions',
    authHeader: 'bearer',
    openaiCompatible: true,
    suggestedModels: [
      'mistral-large-2512',
      'mistral-medium-3-5',
      'mistral-medium-3',
      'mistral-large-latest',
      'devstral-latest',
      'devstral-2512',
      'devstral-medium-latest',
    ],
    docsUrl: 'https://console.mistral.ai/api-keys',
  },
  ollama: {
    id: 'ollama',
    label: 'Ollama (local)',
    defaultEndpoint: '/ollama/api/chat',
    authHeader: 'none',
    openaiCompatible: false,
    suggestedModels: [
      'llama4:scout',
      'llama3.3',
      'llama3.2',
      'qwen2.5',
      'mistral',
      'phi4',
    ],
    docsUrl: 'https://ollama.com/download',
  },
  lmstudio: {
    id: 'lmstudio',
    label: 'LM Studio (local)',
    defaultEndpoint: '/lmstudio/v1/chat/completions',
    authHeader: 'none',
    openaiCompatible: true,
    suggestedModels: [],
    docsUrl: 'https://lmstudio.ai',
  },
  custom: {
    id: 'custom',
    label: 'Custom (OpenAI-compatible)',
    defaultEndpoint: '',
    authHeader: 'bearer',
    openaiCompatible: true,
    suggestedModels: [],
  },
};

/**
 * Reads a Server-Sent Events (SSE) stream from `fetch().body` and
 * yields each `data: ...` payload as a parsed JSON object. Used by
 * every OpenAI-compatible provider plus Anthropic.
 */
export async function* readSSE(
  response: Response,
  signal?: AbortSignal,
): AsyncIterable<unknown> {
  if (!response.body) throw new Error('Response has no body');
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      if (signal?.aborted) throw new DOMException('aborted', 'AbortError');
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let sep = buffer.indexOf('\n\n');
      while (sep !== -1) {
        const event = buffer.slice(0, sep);
        buffer = buffer.slice(sep + 2);
        for (const line of event.split('\n')) {
          if (line.startsWith('data: ')) {
            const payload = line.slice(6).trim();
            if (payload === '[DONE]') return;
            try {
              yield JSON.parse(payload);
            } catch {
              /* skip malformed events rather than aborting the stream */
            }
          }
        }
        sep = buffer.indexOf('\n\n');
      }
    }
  } finally {
    reader.releaseLock();
  }
}
