/**
 * useTextToSpeech — speak text via the native browser voice synth.
 *
 * Wraps `window.speechSynthesis`. Handles two browser quirks:
 *
 *   1. Voices load asynchronously. On most browsers,
 *      `speechSynthesis.getVoices()` returns [] on first call, then
 *      fires a `voiceschanged` event when the OS voice list is ready.
 *      We listen and refresh.
 *
 *   2. Long utterances. Chromium has an undocumented ~15s limit per
 *      `speak()` call after which it silently drops the rest. We
 *      sentence-split inputs and queue them. The chunked utterances
 *      sound natural because we split on punctuation.
 *
 * Privacy note: `speechSynthesis` may use cloud voices (Google, Apple
 * cloud TTS) on some platforms. Our `voices` list flags `localService:
 * true` for OS-local voices — UI should prefer those when the
 * privacy-first promise matters.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { isSpeechSynthesisSupported } from '../voice/webspeech';
import type { SpeakState, VoiceOption } from '../voice/types';

export interface UseTextToSpeechOptions {
  /** Voice name to use (must match a `voices[].name`). */
  voiceName?: string;
  /** Playback rate, 0.1..10. Default: 1. */
  rate?: number;
  /** Pitch, 0..2. Default: 1. */
  pitch?: number;
  /** Volume, 0..1. Default: 1. */
  volume?: number;
}

export interface UseTextToSpeechReturn {
  state: SpeakState;
  isSupported: boolean;
  /** All voices reported by the browser. May be empty for ~100ms after mount. */
  voices: VoiceOption[];
  /** Speak the given text. Long inputs are auto-chunked at sentence boundaries. */
  speak: (text: string) => void;
  /** Stop speaking immediately and clear the queue. */
  cancel: () => void;
  /** Pause without dropping the queue. */
  pause: () => void;
  /** Resume after pause. */
  resume: () => void;
}

export function useTextToSpeech(options: UseTextToSpeechOptions = {}): UseTextToSpeechReturn {
  const { voiceName, rate = 1, pitch = 1, volume = 1 } = options;
  const supported = isSpeechSynthesisSupported();

  const [voices, setVoices] = useState<VoiceOption[]>([]);
  const [state, setState] = useState<SpeakState>('idle');

  // Refs so handlers always see the latest opts.
  const voiceNameRef = useRef(voiceName);
  voiceNameRef.current = voiceName;
  const settingsRef = useRef({ rate, pitch, volume });
  settingsRef.current = { rate, pitch, volume };

  // Keep a count of in-flight utterances so `state` correctly returns
  // to 'idle' only when the LAST one ends.
  const pendingRef = useRef(0);

  // Discover voices.
  useEffect(() => {
    if (!supported) return;
    const synth = window.speechSynthesis;

    const refreshVoices = () => {
      const list = synth.getVoices().map<VoiceOption>((v) => ({
        name: v.name,
        lang: v.lang,
        localService: v.localService,
        default: v.default,
      }));
      setVoices(list);
    };

    refreshVoices();
    synth.addEventListener('voiceschanged', refreshVoices);
    return () => synth.removeEventListener('voiceschanged', refreshVoices);
  }, [supported]);

  const cancel = useCallback(() => {
    if (!supported) return;
    pendingRef.current = 0;
    window.speechSynthesis.cancel();
    setState('idle');
  }, [supported]);

  const speak = useCallback(
    (text: string) => {
      if (!supported || !text.trim()) return;
      const synth = window.speechSynthesis;

      // Resolve the voice. If the requested name isn't loaded yet we
      // fall through to the browser default rather than refusing.
      let resolvedVoice: SpeechSynthesisVoice | null = null;
      if (voiceNameRef.current) {
        const all = synth.getVoices();
        resolvedVoice = all.find((v) => v.name === voiceNameRef.current) ?? null;
      }

      // Sentence-chunk long inputs to avoid Chromium's silent drop.
      // Splits on .!? followed by whitespace, keeping the punctuation.
      const chunks = text
        .split(/(?<=[.!?])\s+/)
        .map((c) => c.trim())
        .filter(Boolean);

      for (const chunk of chunks) {
        const utt = new SpeechSynthesisUtterance(chunk);
        if (resolvedVoice) utt.voice = resolvedVoice;
        utt.rate = settingsRef.current.rate;
        utt.pitch = settingsRef.current.pitch;
        utt.volume = settingsRef.current.volume;

        utt.onstart = () => {
          pendingRef.current += 1;
          setState('speaking');
        };
        utt.onend = utt.onerror = () => {
          pendingRef.current = Math.max(0, pendingRef.current - 1);
          if (pendingRef.current === 0) setState('idle');
        };

        synth.speak(utt);
      }
    },
    [supported],
  );

  const pause = useCallback(() => {
    if (!supported) return;
    window.speechSynthesis.pause();
    setState('paused');
  }, [supported]);

  const resume = useCallback(() => {
    if (!supported) return;
    window.speechSynthesis.resume();
    setState('speaking');
  }, [supported]);

  // Cancel anything pending on unmount.
  useEffect(() => () => cancel(), [cancel]);

  return {
    state,
    isSupported: supported,
    voices,
    speak,
    cancel,
    pause,
    resume,
  };
}
