/**
 * useSpeechToText — microphone input → text segments.
 * Fixed: recRef cleared after each use (continuous:false dead-recognizer bug).
 * Added: onAutoSend callback for Alt+T release auto-send.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getSpeechRecognitionCtor,
  isSpeechRecognitionSupported,
  type SpeechRecognitionInstance,
} from '../voice/webspeech';
import type { ListenState, SpeechSegment } from '../voice/types';

export interface UseSpeechToTextOptions {
  lang?: string;
  continuous?: boolean;
  onSegment?: (segment: SpeechSegment) => void;
  /** Called when recognition ends naturally (used for Alt+T auto-send). */
  onFinished?: () => void;
}

export interface UseSpeechToTextReturn {
  state: ListenState;
  isSupported: boolean;
  lastSegment: SpeechSegment | null;
  currentInterim: string;
  error: string | null;
  start: () => void;
  stop: () => void;
}

export function useSpeechToText(options: UseSpeechToTextOptions = {}): UseSpeechToTextReturn {
  const { lang, continuous = true, onSegment, onFinished } = options;

  const supported = isSpeechRecognitionSupported();

  const [state, setState] = useState<ListenState>('idle');
  const [lastSegment, setLastSegment] = useState<SpeechSegment | null>(null);
  const [currentInterim, setCurrentInterim] = useState('');
  const [error, setError] = useState<string | null>(null);

  const recRef = useRef<SpeechRecognitionInstance | null>(null);
  const segmentIdRef = useRef(0);
  const wantActiveRef = useRef(false);
  const onSegmentRef = useRef(onSegment);
  onSegmentRef.current = onSegment;
  const onFinishedRef = useRef(onFinished);
  onFinishedRef.current = onFinished;

  // When lang changes, destroy cached recognizer so next start() uses new lang
  const prevLangRef = useRef(lang);
  useEffect(() => {
    if (prevLangRef.current !== lang) {
      prevLangRef.current = lang;
      if (recRef.current) {
        try { recRef.current.abort(); } catch {}
        recRef.current = null;
        setState('idle');
        setCurrentInterim('');
        wantActiveRef.current = false;
      }
    }
  }, [lang]);

  const ensureRec = useCallback((): SpeechRecognitionInstance | null => {
    if (recRef.current) return recRef.current;
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) return null;
    const rec = new Ctor();
    rec.continuous = continuous;
    rec.interimResults = true;
    if (lang) rec.lang = lang;
    rec.maxAlternatives = 1;

    rec.onstart = () => { setState('listening'); setError(null); };

    rec.onresult = (ev) => {
      let interim = '';
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const result = ev.results[i];
        const alt = result[0];
        if (result.isFinal) {
          const text = alt.transcript.trim();
          if (text) {
            const segment: SpeechSegment = {
              id: ++segmentIdRef.current,
              transcript: text,
              isFinal: true,
              confidence: alt.confidence ?? 1,
              receivedAt: Date.now(),
            };
            setLastSegment(segment);
            onSegmentRef.current?.(segment);
          }
        } else {
          interim += alt.transcript;
        }
      }
      setCurrentInterim(interim);
    };

    rec.onerror = (ev) => {
      if (ev.error === 'no-speech' || ev.error === 'aborted') return;
      if (ev.error === 'not-allowed' || ev.error === 'service-not-allowed') {
        wantActiveRef.current = false;
        setState('denied');
        return;
      }
      setError(ev.error || ev.message || 'recognition error');
      setState('error');
    };

    rec.onend = () => {
      setCurrentInterim('');

      if (!continuous) {
        // In push-to-talk mode (continuous:false): ALWAYS clear the ref so
        // the next start() creates a fresh recognizer. This fixes the
        // "dead recognizer" bug where Chrome caches a stopped instance.
        recRef.current = null;
        setState('idle');
        // Fire onFinished so Alt+T can auto-send
        onFinishedRef.current?.();
        return;
      }

      // Continuous mode: auto-restart if user hasn't stopped us
      if (wantActiveRef.current && state !== 'denied' && state !== 'error') {
        try {
          rec.start();
        } catch {
          setTimeout(() => {
            if (wantActiveRef.current) {
              try { rec.start(); } catch { setState('idle'); }
            }
          }, 200);
        }
      } else {
        recRef.current = null;
        setState('idle');
      }
    };

    recRef.current = rec;
    return rec;
  }, [continuous, lang, state]);

  const start = useCallback(() => {
    if (!supported) return;
    if (state === 'listening' || state === 'requesting') return;
    setState('requesting');
    wantActiveRef.current = true;
    // In non-continuous mode, always create a fresh recognizer
    if (!continuous && recRef.current) {
      try { recRef.current.abort(); } catch {}
      recRef.current = null;
    }
    const rec = ensureRec();
    if (!rec) { setState('error'); setError('SpeechRecognition unavailable'); return; }
    try {
      rec.start();
    } catch (err) {
      const msg = (err as Error).message ?? '';
      if (msg.includes('already started')) {
        setState('listening');
      } else {
        setError(msg);
        setState('error');
      }
    }
  }, [supported, state, continuous, ensureRec]);

  const stop = useCallback(() => {
    wantActiveRef.current = false;
    setCurrentInterim('');
    const rec = recRef.current;
    if (!rec) { setState('idle'); return; }
    try { rec.stop(); } catch {}
    // onend will fire and clean up recRef + call onFinished
  }, []);

  useEffect(() => {
    return () => {
      wantActiveRef.current = false;
      const rec = recRef.current;
      if (rec) { try { rec.abort(); } catch {} }
      recRef.current = null;
    };
  }, []);

  return { state, isSupported: supported, lastSegment, currentInterim, error, start, stop };
}
