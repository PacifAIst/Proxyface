import { useCallback, useRef, useState } from 'react';

// ── Provider definitions ──────────────────────────────────────

export type VoiceAPIProviderId =
  | 'openai'
  | 'openrouter-openai'
  | 'openrouter-gemini'
  | 'openrouter-kokoro'
  | 'openrouter-mistral'
  | 'openrouter-english'
  | 'google'
  | 'elevenlabs';

export interface VoiceAPIProvider {
  id: VoiceAPIProviderId;
  label: string;
  endpoint: string;
  authHeader: 'bearer' | 'xi-api-key';
  models: string[];
  docsUrl: string;
}

export const VOICE_API_PROVIDERS: VoiceAPIProvider[] = [
  {
    id: 'openai',
    label: 'OpenAI Direct (tts-1, tts-1-hd)',
    endpoint: 'https://api.openai.com/v1/audio/speech',
    authHeader: 'bearer',
    models: ['tts-1', 'tts-1-hd'],
    docsUrl: 'https://platform.openai.com/settings/organization/api-keys',
  },
  {
    id: 'openrouter-openai',
    label: 'OpenRouter: OpenAI Proxy (gpt-4o-mini-tts)',
    endpoint: 'https://openrouter.ai/api/v1/audio/speech',
    authHeader: 'bearer',
    models: ['openai/gpt-4o-mini-tts'],
    docsUrl: 'https://openrouter.ai/keys',
  },
  {
    id: 'openrouter-gemini',
    label: 'OpenRouter: Google Gemini 3.1 Flash TTS',
    endpoint: 'https://openrouter.ai/api/v1/audio/speech',
    authHeader: 'bearer',
    models: ['google/gemini-3.1-flash-tts-preview'],
    docsUrl: 'https://openrouter.ai/keys',
  },
  {
    id: 'openrouter-kokoro',
    label: 'OpenRouter: Kokoro 82M',
    endpoint: 'https://openrouter.ai/api/v1/audio/speech',
    authHeader: 'bearer',
    models: ['hexgrad/kokoro-82m'],
    docsUrl: 'https://openrouter.ai/keys',
  },
  {
    id: 'openrouter-mistral',
    label: 'OpenRouter: Mistral Voxtral Mini TTS',
    endpoint: 'https://openrouter.ai/api/v1/audio/speech',
    authHeader: 'bearer',
    models: ['mistralai/voxtral-mini-tts-2603'],
    docsUrl: 'https://openrouter.ai/keys',
  },
  {
    id: 'openrouter-english',
    label: 'OpenRouter: English-only Expressive',
    endpoint: 'https://openrouter.ai/api/v1/audio/speech',
    authHeader: 'bearer',
    models: [
      'canopylabs/orpheus-3b',
      'sesame/csm-1b',
      'zyphra/zonos-v0.1-hybrid',
      'zyphra/zonos-v0.1-transformer',
    ],
    docsUrl: 'https://openrouter.ai/keys',
  },
  {
    id: 'google',
    label: 'Google Gemini Direct',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-tts-preview:streamGenerateContent',
    authHeader: 'bearer',
    models: ['gemini-3.1-flash-tts-preview'],
    docsUrl: 'https://aistudio.google.com/app/apikey',
  },
  {
    id: 'elevenlabs',
    label: 'ElevenLabs Direct (eleven_v3)',
    endpoint: 'https://api.elevenlabs.io/v1/text-to-speech',
    authHeader: 'xi-api-key',
    models: ['eleven_v3', 'eleven_flash_v2_5'],
    docsUrl: 'https://elevenlabs.io/app/settings/api-keys',
  },
];

// ── Language data ─────────────────────────────────────────────

export interface VoiceLanguage {
  code: string;
  label: string;
}

/** 57 languages shared by OpenAI and OpenRouter OpenAI */
export const OPENAI_TTS_LANGUAGES: VoiceLanguage[] = [
  { code: 'af', label: 'Afrikaans' },
  { code: 'ar', label: 'Arabic' },
  { code: 'hy', label: 'Armenian' },
  { code: 'az', label: 'Azerbaijani' },
  { code: 'be', label: 'Belarusian' },
  { code: 'bs', label: 'Bosnian' },
  { code: 'bg', label: 'Bulgarian' },
  { code: 'ca', label: 'Catalan' },
  { code: 'zh', label: 'Chinese' },
  { code: 'hr', label: 'Croatian' },
  { code: 'cs', label: 'Czech' },
  { code: 'da', label: 'Danish' },
  { code: 'nl', label: 'Dutch' },
  { code: 'en', label: 'English' },
  { code: 'et', label: 'Estonian' },
  { code: 'fi', label: 'Finnish' },
  { code: 'fr', label: 'French' },
  { code: 'gl', label: 'Galician' },
  { code: 'de', label: 'German' },
  { code: 'el', label: 'Greek' },
  { code: 'he', label: 'Hebrew' },
  { code: 'hi', label: 'Hindi' },
  { code: 'hu', label: 'Hungarian' },
  { code: 'is', label: 'Icelandic' },
  { code: 'id', label: 'Indonesian' },
  { code: 'it', label: 'Italian' },
  { code: 'ja', label: 'Japanese' },
  { code: 'kn', label: 'Kannada' },
  { code: 'kk', label: 'Kazakh' },
  { code: 'ko', label: 'Korean' },
  { code: 'lv', label: 'Latvian' },
  { code: 'lt', label: 'Lithuanian' },
  { code: 'mk', label: 'Macedonian' },
  { code: 'ms', label: 'Malay' },
  { code: 'mr', label: 'Marathi' },
  { code: 'mi', label: 'Maori' },
  { code: 'ne', label: 'Nepali' },
  { code: 'no', label: 'Norwegian' },
  { code: 'fa', label: 'Persian' },
  { code: 'pl', label: 'Polish' },
  { code: 'pt', label: 'Portuguese' },
  { code: 'ro', label: 'Romanian' },
  { code: 'ru', label: 'Russian' },
  { code: 'sr', label: 'Serbian' },
  { code: 'sk', label: 'Slovak' },
  { code: 'sl', label: 'Slovenian' },
  { code: 'es', label: 'Spanish' },
  { code: 'sw', label: 'Swahili' },
  { code: 'sv', label: 'Swedish' },
  { code: 'tl', label: 'Tagalog' },
  { code: 'ta', label: 'Tamil' },
  { code: 'te', label: 'Telugu' },
  { code: 'th', label: 'Thai' },
  { code: 'tr', label: 'Turkish' },
  { code: 'uk', label: 'Ukrainian' },
  { code: 'ur', label: 'Urdu' },
  { code: 'vi', label: 'Vietnamese' },
  { code: 'cy', label: 'Welsh' },
];

/** 74 languages for Google Gemini and ElevenLabs */
export const GEMINI_TTS_LANGUAGES: VoiceLanguage[] = [
  { code: 'af', label: 'Afrikaans' },
  { code: 'sq', label: 'Albanian' },
  { code: 'am', label: 'Amharic' },
  { code: 'ar', label: 'Arabic' },
  { code: 'hy', label: 'Armenian' },
  { code: 'az', label: 'Azerbaijani' },
  { code: 'eu', label: 'Basque' },
  { code: 'bn', label: 'Bengali' },
  { code: 'bs', label: 'Bosnian' },
  { code: 'bg', label: 'Bulgarian' },
  { code: 'my', label: 'Burmese' },
  { code: 'ca', label: 'Catalan' },
  { code: 'zh', label: 'Chinese' },
  { code: 'hr', label: 'Croatian' },
  { code: 'cs', label: 'Czech' },
  { code: 'da', label: 'Danish' },
  { code: 'nl', label: 'Dutch' },
  { code: 'en', label: 'English' },
  { code: 'et', label: 'Estonian' },
  { code: 'fil', label: 'Filipino' },
  { code: 'fi', label: 'Finnish' },
  { code: 'fr', label: 'French' },
  { code: 'gl', label: 'Galician' },
  { code: 'ka', label: 'Georgian' },
  { code: 'de', label: 'German' },
  { code: 'el', label: 'Greek' },
  { code: 'gu', label: 'Gujarati' },
  { code: 'he', label: 'Hebrew' },
  { code: 'hi', label: 'Hindi' },
  { code: 'hu', label: 'Hungarian' },
  { code: 'is', label: 'Icelandic' },
  { code: 'id', label: 'Indonesian' },
  { code: 'it', label: 'Italian' },
  { code: 'ja', label: 'Japanese' },
  { code: 'jv', label: 'Javanese' },
  { code: 'kn', label: 'Kannada' },
  { code: 'kk', label: 'Kazakh' },
  { code: 'km', label: 'Khmer' },
  { code: 'ko', label: 'Korean' },
  { code: 'lo', label: 'Lao' },
  { code: 'lv', label: 'Latvian' },
  { code: 'lt', label: 'Lithuanian' },
  { code: 'mk', label: 'Macedonian' },
  { code: 'ms', label: 'Malay' },
  { code: 'ml', label: 'Malayalam' },
  { code: 'mr', label: 'Marathi' },
  { code: 'mn', label: 'Mongolian' },
  { code: 'ne', label: 'Nepali' },
  { code: 'no', label: 'Norwegian' },
  { code: 'fa', label: 'Persian' },
  { code: 'pl', label: 'Polish' },
  { code: 'pt', label: 'Portuguese' },
  { code: 'pa', label: 'Punjabi' },
  { code: 'ro', label: 'Romanian' },
  { code: 'ru', label: 'Russian' },
  { code: 'sr', label: 'Serbian' },
  { code: 'si', label: 'Sinhala' },
  { code: 'sk', label: 'Slovak' },
  { code: 'sl', label: 'Slovenian' },
  { code: 'so', label: 'Somali' },
  { code: 'es', label: 'Spanish' },
  { code: 'su', label: 'Sundanese' },
  { code: 'sw', label: 'Swahili' },
  { code: 'sv', label: 'Swedish' },
  { code: 'ta', label: 'Tamil' },
  { code: 'te', label: 'Telugu' },
  { code: 'th', label: 'Thai' },
  { code: 'tr', label: 'Turkish' },
  { code: 'uk', label: 'Ukrainian' },
  { code: 'ur', label: 'Urdu' },
  { code: 'uz', label: 'Uzbek' },
  { code: 'vi', label: 'Vietnamese' },
  { code: 'cy', label: 'Welsh' },
  { code: 'zu', label: 'Zulu' },
];

/** Kokoro 82M languages */
export const KOKORO_LANGUAGES: VoiceLanguage[] = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Spanish' },
  { code: 'fr', label: 'French' },
  { code: 'hi', label: 'Hindi' },
  { code: 'it', label: 'Italian' },
  { code: 'ja', label: 'Japanese' },
  { code: 'pt', label: 'Portuguese' },
  { code: 'zh', label: 'Chinese' },
];

/** Mistral Voxtral languages */
export const MISTRAL_TTS_LANGUAGES: VoiceLanguage[] = [
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'French' },
  { code: 'es', label: 'Spanish' },
  { code: 'de', label: 'German' },
  { code: 'it', label: 'Italian' },
  { code: 'pt', label: 'Portuguese' },
  { code: 'nl', label: 'Dutch' },
  { code: 'ru', label: 'Russian' },
  { code: 'ja', label: 'Japanese' },
  { code: 'ko', label: 'Korean' },
  { code: 'zh', label: 'Chinese' },
];

/** English-only models */
export const ENGLISH_ONLY: VoiceLanguage[] = [
  { code: 'en', label: 'English' },
];

/** Get languages for a provider */
export function getVoiceLanguages(providerId: VoiceAPIProviderId): VoiceLanguage[] {
  switch (providerId) {
    case 'openai':
    case 'openrouter-openai':
      return OPENAI_TTS_LANGUAGES;
    case 'openrouter-gemini':
    case 'google':
    case 'elevenlabs':
      return GEMINI_TTS_LANGUAGES;
    case 'openrouter-kokoro':
      return KOKORO_LANGUAGES;
    case 'openrouter-mistral':
      return MISTRAL_TTS_LANGUAGES;
    case 'openrouter-english':
      return ENGLISH_ONLY;
    default:
      return OPENAI_TTS_LANGUAGES;
  }
}

// ── VoiceAPI config & hook ────────────────────────────────────

export interface VoiceAPIConfig {
  provider: VoiceAPIProviderId;
  apiKey: string;
  model: string;
  language: string;
}

export function useVoiceAPI(config: VoiceAPIConfig | null) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const speak = useCallback(async (text: string) => {
    if (!config || !config.apiKey || !text.trim()) return;
    setError(null);

    // Cancel any previous speech
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();
    const signal = abortRef.current.signal;

    const provider = VOICE_API_PROVIDERS.find(p => p.id === config.provider);
    if (!provider) return;

    try {
      setIsSpeaking(true);

      if (config.provider === 'google') {
        await speakGoogle(text, config, signal);
      } else if (config.provider === 'elevenlabs') {
        await speakElevenLabs(text, config, signal);
      } else {
        await speakOpenAICompatible(text, config, provider, signal);
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setError((err as Error).message);
      }
    } finally {
      setIsSpeaking(false);
    }
  }, [config]);

  const stop = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setIsSpeaking(false);
  }, []);

  return { speak, stop, isSpeaking, error };
}

// ── Provider-specific speak implementations ───────────────────

/** OpenAI-compatible TTS (OpenAI, OpenRouter variants) */
async function speakOpenAICompatible(
  text: string,
  config: VoiceAPIConfig,
  provider: VoiceAPIProvider,
  signal: AbortSignal,
) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (provider.authHeader === 'bearer') {
    headers['Authorization'] = `Bearer ${config.apiKey}`;
  }
  if (provider.id.startsWith('openrouter')) {
    headers['HTTP-Referer'] = 'https://proxyface.example.com';
    headers['X-Title'] = 'ProxyFace';
  }

  // Pick default voice per provider
  const voice = provider.id === 'openrouter-gemini' ? 'charon'
    : provider.id === 'openrouter-kokoro' ? 'af_bella'
    : provider.id === 'openrouter-mistral' ? 'zack'
    : provider.id === 'openrouter-english' ? 'tara'
    : 'alloy';

  const res = await fetch(provider.endpoint, {
    method: 'POST',
    signal,
    headers,
    body: JSON.stringify({
      model: config.model,
      input: text,
      voice,
      response_format: 'mp3',
    }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => '');
    throw new Error(`${provider.label} ${res.status}: ${err.slice(0, 200)}`);
  }

  await playAudioStream(res, signal);
}

/** Google Gemini TTS — uses the generative API */
async function speakGoogle(
  text: string,
  config: VoiceAPIConfig,
  signal: AbortSignal,
) {
  const url = `${config.provider === 'google' ? 'https://generativelanguage.googleapis.com/v1beta/models' : ''}/${config.model}:streamGenerateContent?key=${config.apiKey}`;

  const res = await fetch(url, {
    method: 'POST',
    signal,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text }] }],
      generationConfig: { responseModalities: ['AUDIO'] },
    }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => '');
    throw new Error(`Google TTS ${res.status}: ${err.slice(0, 200)}`);
  }

  // Gemini returns JSON chunks with inline audio data
  const reader = res.body?.getReader();
  if (!reader) throw new Error('No response body');

  const chunks: Uint8Array[] = [];
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      if (signal.aborted) throw new DOMException('aborted', 'AbortError');
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          const json = JSON.parse(trimmed);
          const audioData = json.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
          if (audioData) {
            chunks.push(Uint8Array.from(atob(audioData), c => c.charCodeAt(0)));
          }
        } catch {
          // skip non-JSON lines
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  if (chunks.length === 0) {
    throw new Error('Google TTS returned no audio data');
  }

  // Concatenate and play
  const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
  const combined = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.length;
  }

  const blob = new Blob([combined], { type: 'audio/mp3' });
  const url2 = URL.createObjectURL(blob);
  const audio = new Audio(url2);
  await new Promise<void>((resolve, reject) => {
    audio.onended = () => { URL.revokeObjectURL(url2); resolve(); };
    audio.onerror = () => { URL.revokeObjectURL(url2); reject(new Error('Audio playback failed')); };
    audio.play().catch(reject);
  });
}

/** ElevenLabs TTS */
async function speakElevenLabs(
  text: string,
  config: VoiceAPIConfig,
  signal: AbortSignal,
) {
  // Default voice ID for multilingual
  const voiceId = config.language === 'en' ? 'Xb7hHmjMSfVlzxQPhpKK' // Bella
    : 'Xb7hHmjMSfVlzxQPhpKK'; // Multilingual default

  const res = await fetch(`${config.provider === 'elevenlabs' ? 'https://api.elevenlabs.io/v1/text-to-speech' : ''}/${voiceId}/stream`, {
    method: 'POST',
    signal,
    headers: {
      'Content-Type': 'application/json',
      'xi-api-key': config.apiKey,
    },
    body: JSON.stringify({
      text,
      model_id: config.model === 'eleven_v3' ? 'eleven_multilingual_v3' : 'eleven_flash_v2_5',
      voice_settings: { stability: 0.5, similarity_boost: 0.75 },
    }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => '');
    throw new Error(`ElevenLabs ${res.status}: ${err.slice(0, 200)}`);
  }

  await playAudioStream(res, signal);
}

/** Play audio from a fetch Response */
async function playAudioStream(res: Response, signal: AbortSignal) {
  const blob = await res.blob();
  if (signal.aborted) return;
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);

  return new Promise<void>((resolve, reject) => {
    const onAbort = () => { audio.pause(); URL.revokeObjectURL(url); reject(new DOMException('aborted', 'AbortError')); };
    signal.addEventListener('abort', onAbort);

    audio.onended = () => {
      signal.removeEventListener('abort', onAbort);
      URL.revokeObjectURL(url);
      resolve();
    };
    audio.onerror = () => {
      signal.removeEventListener('abort', onAbort);
      URL.revokeObjectURL(url);
      reject(new Error('Audio playback failed'));
    };
    audio.play().catch(err => {
      signal.removeEventListener('abort', onAbort);
      URL.revokeObjectURL(url);
      reject(err);
    });
  });
}
