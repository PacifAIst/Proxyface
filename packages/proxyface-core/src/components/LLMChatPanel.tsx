import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { UseLocalEmotionReturn } from '../hooks/useLocalEmotion';
import type { UseEyeTrackerReturn } from '../hooks/useEyeTracker';
import { useLLMStream } from '../hooks/useLLMStream';
import { useSpeechToText } from '../hooks/useSpeechToText';
import { useEyeTracker } from '../hooks/useEyeTracker';
import { useFileContext } from '../hooks/useFileContext';
import type { ProviderConfig } from '../llm/index';
import { PROVIDERS } from '../llm/index';
import { useTypingSound } from '../hooks/useTypingSound';
import { useHandsFree } from '../hooks/useHandsFree';
import { useVoiceAPI } from '../hooks/useVoiceAPI';
import type { Settings } from '../hooks/useSettings';

type VoiceMode = 'bot' | 'nat' | 'off';

interface Props {
  engine: UseLocalEmotionReturn;
  config: ProviderConfig | null;
  onOpenSettings: () => void;
  settings?: Settings;
  tracker?: UseEyeTrackerReturn;
  visionWasmBaseUrl?: string;
  visionModelUrl?: string;
}

export function LLMChatPanel({ engine, config, onOpenSettings, settings, tracker: trackerProp, visionWasmBaseUrl, visionModelUrl }: Props) {
  const [prompt, setPrompt] = useState('');
  const historyRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [voiceMode, setVoiceMode] = useState<VoiceMode>('nat');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isAltTRef = useRef(false);
  const promptRef = useRef('');
  const streamingRef = useRef(false);
  const fileContextRef = useRef<string | null>(null);
  const hfTextRef = useRef('');

  const { tick } = useTypingSound({
    soundUrl: voiceMode === 'bot' ? (settings?.typingSoundUrl || null) : null,
    volume: settings?.typingVolume ?? 0.4,
  });

  const { send, abort, newConversation, streaming, output, messages, error } =
    useLLMStream(engine, config, tick);

  const { loadFile, context: fileContext, fileName, fileSizeKb, loading: fileLoading, error: fileError, clear: clearFile } =
    useFileContext();

  const ownTracker = useEyeTracker({
    wasmBaseUrl: visionWasmBaseUrl,
    modelUrl: visionModelUrl,
  });
  const tracker = trackerProp ?? ownTracker;
  const isEyeOn = tracker.state === 'active';
  const isEyeStarting = tracker.state === 'requesting' || tracker.state === 'loading-model';

  const eyeTooltip = isEyeOn
    ? `Eye tracking ON · ${tracker.fps} fps · click to turn OFF`
    : tracker.state === 'denied'
      ? 'Camera permission denied — check browser settings'
      : tracker.state === 'error'
        ? 'Eye tracker error — click to retry'
        : 'Enable webcam for gaze tracking · video processed locally';

  promptRef.current = prompt;
  streamingRef.current = streaming;
  fileContextRef.current = fileContext ?? null;

  // ── Voice API integration ───────────────────────────────────
  const voiceSettings = settings as any;
  const voiceAPIConfig = useMemo(() => {
    if (voiceSettings?.voiceMode !== 'api') return null;
    if (!voiceSettings?.voiceApiProvider || !voiceSettings?.voiceApiKey) return null;
    return {
      provider: voiceSettings.voiceApiProvider,
      apiKey: voiceSettings.voiceApiKey,
      model: voiceSettings.voiceApiModel ?? '',
      language: voiceSettings.voiceApiLanguage ?? 'en',
    };
  }, [voiceSettings?.voiceMode, voiceSettings?.voiceApiProvider, voiceSettings?.voiceApiKey, voiceSettings?.voiceApiModel, voiceSettings?.voiceApiLanguage]);

  const voiceAPI = useVoiceAPI(voiceAPIConfig);

  // ── Hands-free mode ──────────────────────────────────────────
  const hfPauseSec = voiceSettings?.hfPauseDuration ?? 3.33;

  const handleHFSilence = useCallback((text: string) => {
    const combined = (hfTextRef.current + ' ' + text).trim();
    if (!combined || streamingRef.current) return;
    hfTextRef.current = '';
    window.speechSynthesis?.cancel();
    voiceAPI.stop();
    setIsSpeaking(false);
    const fullPrompt = fileContextRef.current
      ? `${fileContextRef.current}\n\n${combined}`
      : combined;
    send(fullPrompt);
  }, [send, voiceAPI]);

  const hf = useHandsFree({
    lang: settings?.micLanguage ?? settings?.language ?? 'en-US',
    pauseDurationSec: hfPauseSec,
    onSilence: handleHFSilence,
    disabled: streaming || !config,
  });

  // ── MIC speech-to-text ──────────────────────────────────────
  const stt = useSpeechToText({
    lang: settings?.micLanguage ?? settings?.language ?? 'en-US',
    continuous: true,
    onSegment: (seg: { transcript: string }) => {
      setPrompt(prev => (prev ? prev + ' ' + seg.transcript : seg.transcript));
    },
    onFinished: () => {
      // No auto-send — send happens only on Alt+T keyup.
    },
  });

  const listening = stt.state === 'listening' || stt.state === 'requesting';

  // ── Semaphore: HF <-> MIC mutual exclusion ──────────────────
  useEffect(() => {
    if (hf.isListening && listening) {
      isAltTRef.current = false;
      stt.stop();
    }
  }, [hf.isListening, listening, stt]);

  useEffect(() => {
    if (listening && hf.isListening) {
      hf.stop();
    }
  }, [listening, hf]);

  // ── Alt+T hold-to-talk ──────────────────────────────────────
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.altKey && (e.key === 't' || e.key === 'T') && !e.repeat && !listening && !streaming && !hf.isListening) {
        e.preventDefault();
        if (hf.isListening) hf.stop();
        isAltTRef.current = true;
        stt.start();
      }
    }
    function onKeyUp(e: KeyboardEvent) {
      if ((e.key === 't' || e.key === 'T') && isAltTRef.current) {
        e.preventDefault();
        isAltTRef.current = false;
        stt.stop();
        setTimeout(() => {
          const p = promptRef.current.trim();
          if (p && !streamingRef.current) {
            const fullPrompt = fileContextRef.current
              ? `${fileContextRef.current}\n\n${p}`
              : p;
            setPrompt('');
            send(fullPrompt);
          }
        }, 120);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [listening, streaming, stt, hf, send]);

  const providerLabel = config ? (PROVIDERS[config.provider]?.label ?? config.provider) : null;
  const modelLabel = config?.model ?? null;
  const hasHistory = messages.length > 0;

  useEffect(() => {
    if (historyRef.current)
      historyRef.current.scrollTop = historyRef.current.scrollHeight;
  }, [messages, output]);

  // ── Voice output (NAT mode) ─────────────────────────────────
  // When streaming ends, speak the assistant's response.
  // Uses API voice if configured and available, else falls back to browser TTS.
  const prevStreamingRef = useRef(false);
  useEffect(() => {
    const wasStreaming = prevStreamingRef.current;
    prevStreamingRef.current = streaming;
    if (!wasStreaming || streaming) return;
    if (voiceMode !== 'nat') return;
    const lastMsg = messages[messages.length - 1];
    if (!lastMsg || lastMsg.role !== 'assistant' || !lastMsg.content) return;

    window.speechSynthesis.cancel();

    if (voiceAPIConfig && !voiceAPI.error) {
      // API-based high-quality voice
      voiceAPI.speak(lastMsg.content).catch(() => {});
    } else {
      // Browser integrated voice
      const utt = new SpeechSynthesisUtterance(lastMsg.content);
      utt.lang   = settings?.language ?? 'en-US';
      utt.pitch  = 1; utt.rate = 1; utt.volume = 0.9;
      utt.onstart = () => setIsSpeaking(true);
      utt.onend   = () => setIsSpeaking(false);
      utt.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utt);
    }
  }, [streaming, messages, voiceMode, settings?.language, voiceAPI, voiceAPIConfig]);

  const cycleVoiceMode = useCallback(() => {
    if (isSpeaking || voiceAPI.isSpeaking) {
      window.speechSynthesis.cancel();
      voiceAPI.stop();
      setIsSpeaking(false);
      return;
    }
    setVoiceMode(v => v === 'nat' ? 'bot' : v === 'bot' ? 'off' : 'nat');
  }, [isSpeaking, voiceAPI]);

  function handleSend() {
    const p = prompt.trim();
    if (!p || streaming) return;
    setPrompt('');
    window.speechSynthesis?.cancel();
    voiceAPI.stop();
    setIsSpeaking(false);
    const fullPrompt = fileContext ? `${fileContext}\n\n${p}` : p;
    send(fullPrompt);
  }

  function handleMicClick() {
    if (hf.isListening) hf.stop();
    isAltTRef.current = false;
    if (listening) { stt.stop(); } else { stt.start(); }
  }

  function handleHFToggle() {
    if (hf.isListening) {
      hf.stop();
    } else {
      if (listening) stt.stop();
      hfTextRef.current = '';
      hf.start();
    }
  }

  function handleCopy() {
    const allText = messages.map(m => `${m.role === 'user' ? 'You' : 'AI'}: ${m.content}`).join('\n\n');
    navigator.clipboard.writeText(allText || output).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const effectiveSpeaking = isSpeaking || voiceAPI.isSpeaking;
  const voiceLabel = effectiveSpeaking ? '◼ stop' : voiceMode === 'bot' ? '🤖 bot' : voiceMode === 'nat' ? '🔈 nat' : '🔇 off';
  const voiceClass = effectiveSpeaking
    ? 'border-mood-happy bg-mood-happy/10 text-mood-happy'
    : voiceMode === 'bot' ? 'border-signal bg-signal/10 text-signal'
    : voiceMode === 'nat' ? 'border-phosphor bg-phosphor/10 text-phosphor'
    : 'border-crt-700 bg-crt-900 text-phosphor-dim hover:border-phosphor hover:text-phosphor';

  return (
    <div className="w-full max-w-xl space-y-2 rounded-sm border border-crt-700 bg-crt-900/70 p-3 font-mono text-sm text-phosphor shadow-crt-inset">

      {/* Status bar */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] uppercase tracking-widest">
        <span>
          <span className="text-phosphor-dim">state </span>
          <span className={engine.state === 'ready' ? 'text-mood-happy' : engine.state === 'error' ? 'text-mood-error' : 'text-signal'}>
            {engine.state}
          </span>
        </span>
        <span><span className="text-phosphor-dim">backend </span><span className="text-signal">{engine.backend ?? '—'}</span></span>
        {engine.loadTimeMs !== null && (
          <span><span className="text-phosphor-dim">load </span><span className="text-signal">{engine.loadTimeMs}ms</span></span>
        )}
        <span className="ml-auto flex items-center gap-2">
          {providerLabel
            ? <span className="text-phosphor-dim">{providerLabel} · <span className="text-phosphor">{modelLabel}</span></span>
            : <span className="text-mood-error">no provider</span>}
          <button onClick={onOpenSettings}
            className="rounded-sm border border-mood-error px-1.5 py-0.5 text-[9px] text-mood-error hover:border-mood-error hover:text-mood-error">
            SETTINGS
          </button>
        </span>
      </div>

      {/* Errors */}
      {engine.error && <div className="rounded-sm border border-mood-error/50 bg-mood-error/10 p-2 text-[10px] text-mood-error">{engine.error}</div>}
      {error && <div className="rounded-sm border border-mood-error/50 bg-mood-error/10 p-2 text-[10px] text-mood-error">{error}</div>}
      {fileError && <div className="rounded-sm border border-mood-error/50 bg-mood-error/10 p-2 text-[10px] text-mood-error">{fileError}</div>}
      {voiceAPI.error && (
        <div className="rounded-sm border border-mood-error/50 bg-mood-error/10 p-2 text-[10px] text-mood-error">
          Voice API: {voiceAPI.error}
        </div>
      )}
      {stt.state === 'denied' && (
        <div className="rounded-sm border border-mood-error/50 bg-mood-error/10 p-2 text-[10px] text-mood-error">
          Mic access denied — check browser permissions
        </div>
      )}

      {/* File context */}
      {(fileContext || fileLoading) && (
        <div className="flex items-center gap-2 rounded-sm border border-crt-700 bg-crt-950 px-2 py-1.5 text-[10px]">
          <span className="text-phosphor-dim">📄</span>
          {fileLoading ? <span className="animate-pulse text-phosphor-dim">reading file…</span> : (
            <><span className="flex-1 truncate text-phosphor">{fileName}</span>
              <span className="text-phosphor-dim">{fileSizeKb}kb</span>
              <button onClick={clearFile} className="text-phosphor-dim hover:text-mood-error">✕</button>
            </>
          )}
        </div>
      )}

      {/* Emotion */}
      {engine.result && (
        <div className="flex gap-3 text-[10px]">
          <span><span className="text-phosphor-dim">emotion </span><span className="font-bold text-phosphor-glow">{engine.result.emotion}</span></span>
          <span><span className="text-phosphor-dim">conf </span>{(engine.result.confidence * 100).toFixed(0)}%</span>
          <span><span className="text-phosphor-dim">latency </span>{engine.result.latencyMs}ms</span>
        </div>
      )}

      {/* History */}
      {hasHistory && (
        <div ref={historyRef} className="max-h-56 overflow-y-auto rounded-sm border border-crt-700 bg-crt-950 p-2 text-[11px] space-y-2">
          {messages.map((msg, i) => (
            <div key={i} className={msg.role === 'user' ? 'text-phosphor-dim' : 'text-phosphor-glow leading-relaxed'}>
              <span className={`mr-1 text-[9px] uppercase ${msg.role === 'user' ? 'text-signal' : 'text-mood-happy'}`}>
                {msg.role === 'user' ? 'you' : 'ai'}
              </span>
              {msg.content}
            </div>
          ))}
          {streaming && output && (
            <div className="text-phosphor-glow leading-relaxed">
              <span className="mr-1 text-[9px] uppercase text-mood-happy">ai</span>
              {output}<span className="animate-pulse text-phosphor-dim">▋</span>
            </div>
          )}
        </div>
      )}

      {/* Prompt textarea */}
      <label className="block">
        <span className="mb-1 block text-[9px] uppercase tracking-widest text-phosphor-dim">
          {config ? (fileContext ? `prompt · context: ${fileName}` : 'prompt') : 'configure a provider in settings first'}
        </span>
        <div className="relative">
          <textarea
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder={
              !config   ? 'open settings first…' :
              listening ? (stt.currentInterim || 'listening…') :
              hf.isListening ? (hfTextRef.current || 'HF listening… speak freely') :
              streaming ? 'streaming…' :
              fileContext ? 'Ask something about the file…' :
              'Type a prompt, use 🎤 mic, or hold Alt+T…'
            }
            rows={3}
            disabled={!config || streaming}
            className="w-full resize-none rounded-sm border border-crt-700 bg-crt-950 p-2 font-mono text-sm text-phosphor-glow placeholder:text-phosphor-dim/60 focus:border-phosphor focus:outline-none disabled:opacity-50"
          />
          {listening && stt.currentInterim && (
            <div className="absolute bottom-2 left-2 right-2 text-[10px] italic text-mood-error/70 pointer-events-none truncate">
              {stt.currentInterim}
            </div>
          )}
          {hf.isListening && (
            <div className="absolute bottom-2 left-2 right-2 text-[10px] italic text-mood-happy/70 pointer-events-none truncate">
              🎧 HF · {hfTextRef.current || 'listening…'}
            </div>
          )}
        </div>
      </label>

      <input ref={fileInputRef} type="file"
        accept=".txt,.md,.csv,.json,.xml,.html,.pdf,.py,.ts,.tsx,.js,.jsx,.yaml,.yml,.sql,.log,.toml"
        className="hidden" onChange={e => loadFile(e.target.files?.[0])} />

      {/* Buttons row */}
      <div className="flex flex-wrap gap-1.5">
        <button onClick={handleSend} disabled={!config || !prompt.trim() || streaming}
          className="rounded-sm border border-phosphor bg-crt-900 px-3 py-1 text-[9px] uppercase tracking-widest text-phosphor hover:bg-phosphor hover:text-crt-950 disabled:opacity-40">
          Send
        </button>

        {streaming && (
          <button onClick={abort}
            className="rounded-sm border border-mood-error/70 bg-crt-900 px-3 py-1 text-[9px] uppercase tracking-widest text-mood-error hover:bg-mood-error hover:text-crt-950">
            Stop
          </button>
        )}

        <button type="button" onClick={() => fileInputRef.current?.click()}
          disabled={streaming || fileLoading}
          title="Attach a file as context (PDF, TXT, CSV, JSON…)"
          className={['rounded-sm border px-2 py-1 text-[9px] uppercase tracking-widest transition-all',
            fileContext ? 'border-signal bg-signal/10 text-signal' : 'border-crt-700 bg-crt-900 text-phosphor-dim hover:border-phosphor hover:text-phosphor',
            (streaming || fileLoading) ? 'opacity-40 pointer-events-none' : '',
          ].join(' ')}>
          {fileLoading ? '…' : fileContext ? '📄 file' : '📎'}
        </button>

        {/* MIC button */}
        {stt.isSupported && (
          <button type="button" onClick={handleMicClick}
            disabled={streaming || hf.isListening}
            title="Click to toggle mic on/off — keeps listening through pauses"
            className={['rounded-sm border px-3 py-1 text-[9px] uppercase tracking-widest transition-all',
              listening ? 'animate-pulse border-mood-error bg-mood-error/20 text-mood-error'
                        : 'border-crt-700 bg-crt-900 text-phosphor-dim hover:border-phosphor hover:text-phosphor',
              (streaming || hf.isListening) ? 'opacity-40 pointer-events-none' : '',
            ].join(' ')}>
            {listening ? '● mic' : '🎤 mic'}
          </button>
        )}

        {/* HF button */}
        {hf.isSupported && (
          <button type="button" onClick={handleHFToggle}
            disabled={streaming || listening}
            title="HF: Hands-free mode enables direct speaking with pauses to receive the AI feedback, you can configure the length of pauses in the settings"
            className={['rounded-sm border px-3 py-1 text-[9px] uppercase tracking-widest transition-all',
              hf.isListening
                ? 'animate-pulse border-mood-happy bg-mood-happy/20 text-mood-happy'
                : 'border-crt-700 bg-crt-900 text-phosphor-dim hover:border-phosphor hover:text-phosphor',
              (streaming || listening) ? 'opacity-40 pointer-events-none' : '',
            ].join(' ')}>
            {hf.isListening ? '🎧 HF' : '🎧 HF'}
          </button>
        )}

        <button type="button" onClick={cycleVoiceMode}
          title={effectiveSpeaking ? 'Stop speaking' : `Voice: ${voiceMode} — click to cycle`}
          className={`rounded-sm border px-2 py-1 text-[9px] uppercase tracking-widest transition-all ${voiceClass}`}>
          {voiceLabel}
        </button>

        {/* Eye tracking */}
        <button type="button"
          onClick={() => {
            if (isEyeOn || isEyeStarting) { tracker.stop(); }
            else { tracker.start().catch(() => {}); }
          }}
          title={eyeTooltip}
          className={['rounded-sm border px-2 py-1 text-[11px] transition-all',
            isEyeOn
              ? 'border-mood-error bg-mood-error/20 text-mood-error animate-pulse'
              : isEyeStarting
                ? 'border-signal bg-signal/10 text-signal animate-pulse'
                : tracker.state === 'denied' || tracker.state === 'error'
                  ? 'border-mood-error/50 text-mood-error/60'
                  : 'border-crt-700 bg-crt-900 text-phosphor-dim hover:border-phosphor hover:text-phosphor',
          ].join(' ')}>
          {isEyeOn ? `👁 ${tracker.fps}fps` : isEyeStarting ? '👁 …' : '👁'}
        </button>

        {hasHistory && (
          <button onClick={newConversation}
            title="Click to create a new conversation."
            className="rounded-sm border border-crt-700 bg-crt-900 px-2 py-1 text-[9px] uppercase tracking-widest text-phosphor-dim hover:border-mood-error hover:text-mood-error">
            New
          </button>
        )}
        {hasHistory && (
          <button onClick={handleCopy}
            title="Click to copy the whole conversation."
            className="rounded-sm border border-crt-700 bg-crt-900 px-2 py-1 text-[9px] uppercase tracking-widest text-phosphor-dim hover:border-phosphor hover:text-phosphor">
            {copied ? 'copied!' : '⎘'}
          </button>
        )}
      </div>
    </div>
  );
}
