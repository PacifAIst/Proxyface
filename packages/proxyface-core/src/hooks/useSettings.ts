/**
 * useSettings — persists LLM provider config to localStorage.
 *
 * Keys are namespaced under 'pf:' to avoid collisions. API keys are
 * stored in plain localStorage — acceptable for a local dev tool, but
 * for any production build you'd want a more secure store.
 */
import { useCallback, useState } from 'react';
import type { ProviderConfig, ProviderId } from '../llm/index';

const NS = 'pf:';

export interface Settings {
  providerId: ProviderId;
  apiKey: string;
  endpoint: string;
  model: string;
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
  /** ID of the character (folder name under sprites/art/). Default: "placeholder". */
  characterId: string;
  // --- NEW ---
  typingSoundUrl: string;   // e.g. "/sounds/type-01.mp3", "" = disabled
  typingVolume: number;     // 0-1
  soundsMuted: boolean;
  language: string;   // in interface, e.g. 'en-US'
  micLanguage?: string;
  hfPauseDuration: number;        // ← ADD (if not already)
  voiceMode: 'browser' | 'api';   // ← ADD
  voiceApiProvider: string;       // ← ADD
  voiceApiKey: string;            // ← ADD
  voiceApiModel: string;          // ← ADD
  voiceApiLanguage: string;       // ← ADD 
}

const DEFAULTS: Settings = {
  providerId: 'openai',
  apiKey: '',
  endpoint: '',
  model: 'gpt-4o-mini',
  systemPrompt: 'You are a helpful assistant. Respond naturally and conversationally.',
  temperature: 0.7,
  maxTokens: 512,
  characterId: 'placeholder',
  // --- NEW ---
  typingSoundUrl: '',
  typingVolume: 0.4,
  soundsMuted: false,
  language: 'en-US',  // in DEFAULTS
  micLanguage: 'en-US',
  hfPauseDuration: 3.33,          // ← ADD (if not already)
  voiceMode: 'browser',           // ← ADD
  voiceApiProvider: 'openai',     // ← ADD
  voiceApiKey: '',                // ← ADD
  voiceApiModel: 'tts-1',         // ← ADD
  voiceApiLanguage: 'en',         // ← ADD
};

function load(): Settings {
  try {
    const raw = localStorage.getItem(NS + 'settings');
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return DEFAULTS;
  }
}

function save(s: Settings) {
  try {
    localStorage.setItem(NS + 'settings', JSON.stringify(s));
  } catch {}
}

export function useSettings() {
  const [settings, setSettingsState] = useState<Settings>(load);

  const setSettings = useCallback((patch: Partial<Settings>) => {
    setSettingsState(prev => {
      const next = { ...prev, ...patch };
      save(next);
      return next;
    });
  }, []);

  const toProviderConfig = useCallback((): ProviderConfig | null => {
    const s = settings;
    if (!s.providerId) return null;
    return {
      provider: s.providerId,
      apiKey: s.apiKey || undefined,
      endpoint: s.endpoint || undefined,
      model: s.model,
      systemPrompt: s.systemPrompt || undefined,
      temperature: s.temperature,
      maxTokens: s.maxTokens,
    };
  }, [settings]);

  return { settings, setSettings, toProviderConfig };
}