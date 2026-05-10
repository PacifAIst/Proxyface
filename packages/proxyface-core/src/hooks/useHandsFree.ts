/* eslint-disable @typescript-eslint/no-unused-vars */
declare global {
  interface SpeechRecognition extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
    onstart: ((this: SpeechRecognition, ev: Event) => any) | null;
    onend: ((this: SpeechRecognition, ev: Event) => any) | null;
    onerror: ((this: SpeechRecognition, ev: Event) => any) | null;
    start(): void;
    stop(): void;
  }
  var SpeechRecognition: {
    prototype: SpeechRecognition;
    new (): SpeechRecognition;
  };
  interface SpeechRecognitionEvent extends Event {
    readonly resultIndex: number;
    readonly results: SpeechRecognitionResultList;
  }
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}
/* eslint-enable @typescript-eslint/no-unused-vars */

import { useCallback, useEffect, useRef, useState } from 'react';

type HFState = 'idle' | 'requesting' | 'listening';

interface UseHandsFreeOptions {
  lang: string;
  pauseDurationSec: number;
  onSilence: (text: string) => void;
  disabled?: boolean;
}

export function useHandsFree({ lang, pauseDurationSec, onSilence, disabled }: UseHandsFreeOptions) {
  const [state, setState] = useState<HFState>('idle');
  const recRef = useRef<SpeechRecognition | null>(null);
  const finalRef = useRef('');
  const interimRef = useRef('');
  const lastSpeechRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const runningRef = useRef(false);
  const onSilenceRef = useRef(onSilence);
  onSilenceRef.current = onSilence;

  const cleanup = useCallback(() => {
    runningRef.current = false;
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    try { recRef.current?.stop(); } catch { /* already stopped */ }
    recRef.current = null;
    finalRef.current = '';
    interimRef.current = '';
  }, []);

  const beginListening = useCallback(() => {
    if (disabled) return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    cleanup();
    runningRef.current = true;
    setState('requesting');

    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = lang;

    rec.onresult = (event: SpeechRecognitionEvent) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalRef.current += transcript;
        } else {
          interim += transcript;
        }
      }
      interimRef.current = interim;
      // Any result = speech detected → reset silence timer
      lastSpeechRef.current = Date.now();
    };

    rec.onstart = () => { if (runningRef.current) setState('listening'); };

    rec.onerror = () => {
      if (runningRef.current) {
        // Auto-restart on error after brief delay
        setTimeout(() => { if (runningRef.current) beginListening(); }, 400);
      }
    };

    rec.onend = () => {
      if (runningRef.current) {
        setTimeout(() => { if (runningRef.current) beginListening(); }, 200);
      }
    };

    recRef.current = rec;
    lastSpeechRef.current = Date.now();

    try { rec.start(); } catch {
      setTimeout(() => { if (runningRef.current) beginListening(); }, 500);
      return;
    }

    // Silence detection: check every 200ms
    const pauseMs = Math.max(500, pauseDurationSec * 1000);
    timerRef.current = setInterval(() => {
      if (!runningRef.current) return;
      const elapsed = Date.now() - lastSpeechRef.current;
      if (elapsed > pauseMs) {
        const full = (finalRef.current + ' ' + interimRef.current).trim();
        if (full) {
          finalRef.current = '';
          interimRef.current = '';
          onSilenceRef.current(full);
        }
        lastSpeechRef.current = Date.now(); // reset for next phrase
      }
    }, 200);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang, pauseDurationSec, disabled, cleanup]);

  const start = useCallback(() => {
    if (disabled || state !== 'idle') return;
    beginListening();
  }, [disabled, state, beginListening]);

  const stop = useCallback(() => {
    cleanup();
    setState('idle');
  }, [cleanup]);

  // Auto-cleanup on unmount
  useEffect(() => cleanup, [cleanup]);

  const isListening = state === 'listening' || state === 'requesting';

  return {
    state,
    start,
    stop,
    isListening,
    isSupported: !!(window.SpeechRecognition || window.webkitSpeechRecognition),
  };
}
