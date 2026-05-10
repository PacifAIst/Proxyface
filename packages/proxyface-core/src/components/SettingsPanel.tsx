import { useState } from 'react';
import { PROVIDERS } from '../llm/index';
import type { ProviderId } from '../llm/index';
import type { Settings } from '../hooks/useSettings';
import {
  VOICE_API_PROVIDERS,
  getVoiceLanguages,
  type VoiceAPIProviderId,
} from '../hooks/useVoiceAPI';
import { CharacterShowroom } from './CharacterShowroom';

interface Props {
  settings: Settings;
  onSave: (patch: Partial<Settings>) => void;
  onClose: () => void;
}

const PROVIDER_LIST = Object.values(PROVIDERS);

const LANG_OPTIONS = [
  { value: 'en-US', label: 'English (US)' },
  { value: 'en-GB', label: 'English (UK)' },
  { value: 'es-ES', label: 'Spanish (Spain)' },
  { value: 'es-MX', label: 'Spanish (Mexico)' },
  { value: 'fr-FR', label: 'French' },
  { value: 'de-DE', label: 'German' },
  { value: 'it-IT', label: 'Italian' },
  { value: 'pt-BR', label: 'Portuguese (BR)' },
  { value: 'ja-JP', label: 'Japanese' },
  { value: 'zh-CN', label: 'Chinese (Simplified)' },
  { value: 'ko-KR', label: 'Korean' },
  { value: 'ar-SA', label: 'Arabic' },
];

export function SettingsPanel({ settings, onSave, onClose }: Props) {
  const [local, setLocal] = useState<Settings>({ ...settings });

  function set<K extends keyof Settings>(k: K, v: Settings[K]) {
    setLocal(prev => ({ ...prev, [k]: v }));
  }

  function handleProviderChange(id: ProviderId) {
    const desc = PROVIDERS[id];
    set('providerId', id);
    set('endpoint', desc.defaultEndpoint);
    if (desc.suggestedModels.length > 0) set('model', desc.suggestedModels[0]);
  }

  function handleSave() {
    onSave(local);
    onClose();
  }

  const voiceMode = (local as any).voiceMode ?? 'browser';
  const voiceApiProvider = (local as any).voiceApiProvider ?? 'openai';
  const voiceApiKey = (local as any).voiceApiKey ?? '';
  const voiceApiModel = (local as any).voiceApiModel ?? '';
  const voiceApiLanguage = (local as any).voiceApiLanguage ?? 'en';

  const desc = PROVIDERS[local.providerId];
  const needsKey = desc.authHeader !== 'none';
  const isLocal = local.providerId === 'ollama' || local.providerId === 'lmstudio';

  const selectedVoiceProvider = VOICE_API_PROVIDERS.find(p => p.id === voiceApiProvider);
  const voiceLanguages = getVoiceLanguages(voiceApiProvider as VoiceAPIProviderId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-crt-950/90 p-3">
      <div className="relative flex w-full max-w-7xl max-h-[92vh] rounded-sm border border-crt-600 bg-crt-900 font-mono text-xs text-phosphor shadow-crt-inset overflow-hidden">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 z-10 rounded-sm border border-mood-error px-2 py-1 text-[10px] text-mood-error hover:bg-mood-error hover:text-crt-950"
        >
          &#10005;
        </button>

        {/* LEFT COLUMN -- LLM + NAT voice settings */}
        <div className="flex w-128 min-w-128 flex-col overflow-y-auto border-r border-crt-700">

          <div className="flex items-center justify-between border-b border-crt-700 px-3 py-2 shrink-0">
            <span className="text-[10px] uppercase tracking-widest text-phosphor-dim">Settings</span>
            <button onClick={onClose} className="text-phosphor-dim hover:text-phosphor">&#10005;</button>
          </div>

          <div className="space-y-3 p-3">

            {/* Provider */}
            <div>
              <label className="mb-1 block text-[9px] uppercase tracking-widest text-phosphor-dim">Provider</label>
              <select value={local.providerId}
                onChange={e => handleProviderChange(e.target.value as ProviderId)}
                className="w-full rounded-sm border border-crt-700 bg-crt-950 px-2 py-1.5 text-phosphor focus:border-phosphor focus:outline-none">
                {PROVIDER_LIST.map(p => (
                  <option key={p.id} value={p.id}>{p.label}</option>
                ))}
              </select>
              {desc.docsUrl && (
                <a href={desc.docsUrl} target="_blank" rel="noreferrer"
                  className="mt-1 block text-[9px] text-phosphor-dim underline hover:text-phosphor">
                  Get API key
                </a>
              )}
            </div>

            {/* API Key */}
            {needsKey && (
              <div>
                <label className="mb-1 block text-[9px] uppercase tracking-widest text-phosphor-dim">API Key</label>
                <input type="password" value={local.apiKey}
                  onChange={e => set('apiKey', e.target.value)}
                  placeholder={`${desc.label} key`}
                  className="w-full rounded-sm border border-crt-700 bg-crt-950 px-2 py-1.5 text-phosphor-glow placeholder:text-phosphor-dim/50 focus:border-phosphor focus:outline-none" />
              </div>
            )}

            {/* Endpoint */}
            <div>
              <label className="mb-1 block text-[9px] uppercase tracking-widest text-phosphor-dim">
                Endpoint {isLocal && <span className="text-mood-happy">(local)</span>}
              </label>
              <input type="text" value={local.endpoint}
                onChange={e => set('endpoint', e.target.value)}
                placeholder={desc.defaultEndpoint || 'http://localhost:11434'}
                className="w-full rounded-sm border border-crt-700 bg-crt-950 px-2 py-1.5 text-phosphor placeholder:text-phosphor-dim/50 focus:border-phosphor focus:outline-none" />
            </div>

            {/* Model */}
            <div>
              <label className="mb-1 block text-[9px] uppercase tracking-widest text-phosphor-dim">Model</label>
              {desc.suggestedModels.length > 0 ? (
                <div className="flex flex-col gap-1">
                  <select
                    value={desc.suggestedModels.includes(local.model) ? local.model : ''}
                    onChange={e => { if (e.target.value) set('model', e.target.value); }}
                    className="w-full rounded-sm border border-crt-700 bg-crt-950 px-2 py-1.5 text-phosphor focus:border-phosphor focus:outline-none">
                    {!desc.suggestedModels.includes(local.model) && (
                      <option value="">-- {local.model} (custom) --</option>
                    )}
                    {desc.suggestedModels.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                  <input type="text" value={local.model}
                    onChange={e => set('model', e.target.value)}
                    placeholder="custom model name"
                    className="w-full rounded-sm border border-crt-700 bg-crt-950 px-2 py-1.5 text-phosphor placeholder:text-phosphor-dim/50 focus:border-phosphor focus:outline-none" />
                </div>
              ) : (
                <input type="text" value={local.model}
                  onChange={e => set('model', e.target.value)}
                  placeholder={isLocal ? 'e.g. llama3.1' : 'model name'}
                  className="w-full rounded-sm border border-crt-700 bg-crt-950 px-2 py-1.5 text-phosphor placeholder:text-phosphor-dim/50 focus:border-phosphor focus:outline-none" />
              )}
            </div>

            {/* System Prompt */}
            <div>
              <label className="mb-1 block text-[9px] uppercase tracking-widest text-phosphor-dim">System Prompt</label>
              <textarea value={local.systemPrompt}
                onChange={e => set('systemPrompt', e.target.value)}
                rows={2}
                className="w-full resize-none rounded-sm border border-crt-700 bg-crt-950 px-2 py-1.5 text-phosphor focus:border-phosphor focus:outline-none" />
            </div>

            {/* Temp + Max tokens */}
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="mb-1 block text-[9px] uppercase tracking-widest text-phosphor-dim">
                  Temp: {local.temperature.toFixed(1)}
                </label>
                <input type="range" min="0" max="2" step="0.1"
                  value={local.temperature}
                  onChange={e => set('temperature', parseFloat(e.target.value))}
                  className="w-full accent-phosphor" />
              </div>
              <div className="flex-1">
                <label className="mb-1 block text-[9px] uppercase tracking-widest text-phosphor-dim">Max tokens</label>
                <input type="number" min="64" max="4096" step="64"
                  value={local.maxTokens}
                  onChange={e => set('maxTokens', parseInt(e.target.value) || 512)}
                  className="w-full rounded-sm border border-crt-700 bg-crt-950 px-2 py-1.5 text-phosphor focus:border-phosphor focus:outline-none" />
              </div>
            </div>

            {/* ── NAT Type (replaces Flush API Key) ───────────────── */}
            <div className="rounded-sm border border-crt-700 bg-crt-950/40 p-2.5">
              <label className="mb-2 block text-[9px] uppercase tracking-widest text-phosphor-dim">
                Type of natural voice (NAT)
              </label>

              {/* Browser / API toggle */}
              <div className="flex rounded-sm border border-crt-700 overflow-hidden mb-2">
                <button
                  type="button"
                  onClick={() => set('voiceMode' as any, 'browser')}
                  className={`flex-1 px-2 py-1 text-[9px] uppercase tracking-widest transition-colors ${
                    voiceMode === 'browser'
                      ? 'bg-phosphor text-crt-950'
                      : 'bg-crt-900 text-phosphor-dim hover:text-phosphor'
                  }`}>
                  Browser-low quality
                </button>
                <button
                  type="button"
                  onClick={() => set('voiceMode' as any, 'api')}
                  className={`flex-1 px-2 py-1 text-[9px] uppercase tracking-widest transition-colors ${
                    voiceMode === 'api'
                      ? 'bg-phosphor text-crt-950'
                      : 'bg-crt-900 text-phosphor-dim hover:text-phosphor'
                  }`}>
                  API-top quality
                </button>
              </div>

              {/* Browser mode: Voice Language dropdown */}
              {voiceMode === 'browser' && (
                <div className="mt-2">
                  <label className="mb-1 block text-[9px] uppercase tracking-widest text-phosphor-dim">
                    Voice language
                  </label>
                  <select value={local.language ?? 'en-US'}
                    onChange={e => set('language', e.target.value)}
                    className="w-full rounded-sm border border-crt-700 bg-crt-950 px-2 py-1.5 text-phosphor focus:border-phosphor focus:outline-none">
                    {LANG_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <button type="button"
                    onClick={() => {
                      if (!window.speechSynthesis) return;
                      window.speechSynthesis.cancel();
                      const utt = new SpeechSynthesisUtterance('ProxyFace');
                      utt.lang = local.language ?? 'en-US';
                      window.speechSynthesis.speak(utt);
                    }}
                    className="mt-1 rounded-sm border border-crt-700 px-2 py-0.5 text-[9px] text-phosphor-dim hover:border-phosphor hover:text-phosphor">
                    &#9654; preview voice
                  </button>
                </div>
              )}

              {/* API mode: Provider + Key + Model + Language */}
              {voiceMode === 'api' && (
                <div className="mt-2 space-y-2">
                  {/* Provider */}
                  <div>
                    <label className="mb-1 block text-[9px] uppercase tracking-widest text-phosphor-dim">Provider</label>
                    <select
                      value={voiceApiProvider}
                      onChange={e => {
                        const pid = e.target.value as VoiceAPIProviderId;
                        const prov = VOICE_API_PROVIDERS.find(p => p.id === pid);
                        set('voiceApiProvider' as any, pid);
                        if (prov) {
                          set('voiceApiModel' as any, prov.models[0] ?? '');
                        }
                      }}
                      className="w-full rounded-sm border border-crt-700 bg-crt-950 px-2 py-1.5 text-phosphor focus:border-phosphor focus:outline-none">
                      {VOICE_API_PROVIDERS.map(p => (
                        <option key={p.id} value={p.id}>{p.label}</option>
                      ))}
                    </select>
                    {selectedVoiceProvider?.docsUrl && (
                      <a href={selectedVoiceProvider.docsUrl} target="_blank" rel="noreferrer"
                        className="mt-0.5 block text-[9px] text-phosphor-dim underline hover:text-phosphor">
                        Get API key
                      </a>
                    )}
                  </div>

                  {/* API Key */}
                  <div>
                    <label className="mb-1 block text-[9px] uppercase tracking-widest text-phosphor-dim">API Key</label>
                    <input type="password"
                      value={voiceApiKey}
                      onChange={e => set('voiceApiKey' as any, e.target.value)}
                      placeholder={`${selectedVoiceProvider?.label?.split('(')[0].trim() ?? 'Voice'} key`}
                      className="w-full rounded-sm border border-crt-700 bg-crt-950 px-2 py-1.5 text-phosphor-glow placeholder:text-phosphor-dim/50 focus:border-phosphor focus:outline-none" />
                  </div>

                  {/* Model */}
                  {selectedVoiceProvider && selectedVoiceProvider.models.length > 0 && (
                    <div>
                      <label className="mb-1 block text-[9px] uppercase tracking-widest text-phosphor-dim">Model</label>
                      <select
                        value={voiceApiModel}
                        onChange={e => set('voiceApiModel' as any, e.target.value)}
                        className="w-full rounded-sm border border-crt-700 bg-crt-950 px-2 py-1.5 text-phosphor focus:border-phosphor focus:outline-none">
                        {selectedVoiceProvider.models.map(m => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Language */}
                  <div>
                    <label className="mb-1 block text-[9px] uppercase tracking-widest text-phosphor-dim">
                      Language ({voiceLanguages.length} supported)
                    </label>
                    <select
                      value={voiceApiLanguage}
                      onChange={e => set('voiceApiLanguage' as any, e.target.value)}
                      className="w-full rounded-sm border border-crt-700 bg-crt-950 px-2 py-1.5 text-phosphor focus:border-phosphor focus:outline-none">
                      {voiceLanguages.map(l => (
                        <option key={l.code} value={l.code}>{l.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* ── Flush buttons (x2) ─────────────────────────────── */}
            <div className="flex gap-2">
              <button type="button"
                onClick={() => { set('apiKey', ''); set('endpoint', desc.defaultEndpoint); }}
                className="flex-1 rounded-sm border border-crt-700 bg-crt-950 px-2 py-1 text-[9px] uppercase tracking-widest text-phosphor-dim hover:border-mood-error hover:text-mood-error"
                title="Clear LLM API key and reset endpoint">
                Flush LLM Key
              </button>
              <button type="button"
                onClick={() => { set('voiceApiKey' as any, ''); }}
                className="flex-1 rounded-sm border border-crt-700 bg-crt-950 px-2 py-1 text-[9px] uppercase tracking-widest text-phosphor-dim hover:border-mood-error hover:text-mood-error"
                title="Clear voice API key">
                Flush Voice Key
              </button>
            </div>

          </div>

          {/* Footer buttons */}
          <div className="mt-auto flex gap-2 border-t border-crt-700 px-3 py-2 shrink-0">
            <button onClick={handleSave}
              className="flex-1 rounded-sm border border-phosphor bg-crt-900 py-1.5 text-[9px] uppercase tracking-widest text-phosphor transition-colors hover:bg-phosphor hover:text-crt-950">
              Save &amp; Close
            </button>
            <button onClick={onClose}
              className="rounded-sm border border-crt-700 bg-crt-900 px-3 py-1.5 text-[9px] uppercase tracking-widest text-phosphor-dim transition-colors hover:border-phosphor">
              Cancel
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN -- character + audio settings */}
        <div className="flex flex-1 flex-col overflow-y-auto">
          {/* Character section */}
          <div className="border-b border-crt-700 p-4">
            <div className="mb-2 text-[9px] uppercase tracking-widest text-phosphor-dim">Character</div>
            <CharacterShowroom
              compact
              hideSelectButton={false}
              onSelect={(id) => {
                const updated = { ...local, characterId: id };
                onSave(updated);
                onClose();
              }}
              selectedId={local.characterId}
            />
          </div>

                    {/* Audio settings */}
                    <div className="p-4">
                      <div className="mb-3 text-[9px] uppercase tracking-widest text-phosphor-dim">BOT Audio, Hands-Free (HF) Pause &amp; Microphone Input</div>

                      <div className="grid grid-cols-2 gap-3">
                        {/* Left column */}
                        <div className="space-y-3">
                          {/* Typing Sound */}
                          <div>
                            <label className="mb-1 block text-[9px] uppercase tracking-widest text-phosphor-dim">Typing Sound</label>
                            <select value={local.typingSoundUrl}
                              onChange={e => set('typingSoundUrl', e.target.value)}
                              className="w-full rounded-sm border border-crt-700 bg-crt-950 px-2 py-1.5 text-phosphor focus:border-phosphor focus:outline-none">
                              <option value="">disabled</option>
                              {Array.from({ length: 8 }, (_, i) => {
                                const n = String(i + 1).padStart(2, '0');
                                return <option key={n} value={`/sounds/type-${n}.mp3`}>Type {n}</option>;
                              })}
                            </select>
                            <div className="mt-1.5 flex items-center gap-2">
                              {local.typingSoundUrl && (
                                <button type="button"
                                  onClick={() => { const a = new Audio(local.typingSoundUrl); a.volume = local.typingVolume; a.play().catch(() => {}); }}
                                  className="rounded-sm border border-crt-700 px-2 py-0.5 text-[9px] text-phosphor-dim hover:border-phosphor hover:text-phosphor">
                                  play
                                </button>
                              )}
                              <span className="text-[9px] text-phosphor-dim">vol {Math.round(local.typingVolume * 100)}%</span>
                              <input type="range" min="0" max="1" step="0.05"
                                value={local.typingVolume}
                                onChange={e => set('typingVolume', parseFloat(e.target.value))}
                                className="flex-1 accent-phosphor" />
                            </div>
                          </div>

                          {/* Mic language */}
                          <div>
                            <label className="mb-1 block text-[9px] uppercase tracking-widest text-phosphor-dim">
                              Mic language
                            </label>
                            <select value={local.micLanguage ?? local.language ?? 'en-US'}
                              onChange={e => set('micLanguage', e.target.value)}
                              className="w-full rounded-sm border border-crt-700 bg-crt-950 px-2 py-1.5 text-phosphor focus:border-phosphor focus:outline-none">
                              {LANG_OPTIONS.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* Right column */}
                        <div>
                          {/* HF pause duration */}
                          <label className="mb-1 block text-[9px] uppercase tracking-widest text-phosphor-dim">
                            HF pause: {(local as any).hfPauseDuration?.toFixed(2) ?? '3.33'}s
                          </label>
                          <input
                            type="range"
                            min="0.5"
                            max="10"
                            step="0.1"
                            value={(local as any).hfPauseDuration ?? 3.33}
                            onChange={e => set('hfPauseDuration' as any, parseFloat(e.target.value))}
                            className="w-full accent-phosphor"
                          />
                          <div className="flex justify-between text-[8px] text-phosphor-dim/60 mt-0.5">
                            <span>0.5s</span>
                            <span>10s</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            );
          }
