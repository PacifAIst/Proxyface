import { AnthropicProvider } from './anthropic';
import { OllamaProvider } from './ollama';
import { OpenAICompatibleProvider } from './openaiCompatible';
import type { LLMProvider, ProviderConfig } from './providers';

export type {
  LLMProvider,
  ProviderConfig,
  ProviderId,
  ProviderDescriptor,
} from './providers';
export { PROVIDERS } from './providers';

export function makeProvider(cfg: ProviderConfig): LLMProvider {
  switch (cfg.provider) {
    case 'anthropic':
      return new AnthropicProvider(cfg);
    case 'ollama':
      return new OllamaProvider(cfg);
    case 'openai':
    case 'gemini':
    case 'openrouter':
    case 'deepseek':
    case 'qwen':
    case 'glm':
    case 'grok':
    case 'mistral':
    case 'lmstudio':
    case 'custom':
      return new OpenAICompatibleProvider(cfg);
    default: {
      // exhaustiveness check
      const _never: never = cfg.provider;
      throw new Error(`Unknown provider: ${_never}`);
    }
  }
}