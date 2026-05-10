/**
 * useTypingSound — plays a typewriter click sound as LLM text streams in.
 *
 * Cooldown gate: minimum 80ms between plays regardless of token rate.
 * This prevents machine-gun effect on fast streams while maintaining
 * a natural typewriter rhythm. Characters arriving during cooldown
 * are silently skipped.
 *
 * The selected sound file is passed in from settings. If null/empty,
 * the hook is a no-op (sound disabled).
 */
import { useCallback, useEffect, useRef } from 'react';

export interface UseTypingSoundOptions {
  /** Path to the mp3/wav file e.g. "/sounds/type-01.mp3". Null = disabled. */
  soundUrl: string | null;
  /** Volume 0-1. Default 0.4 */
  volume?: number;
  /** Minimum ms between plays. Default 80. */
  cooldownMs?: number;
}

export function useTypingSound({
  soundUrl,
  volume = 0.4,
  cooldownMs = 80,
}: UseTypingSoundOptions) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastPlayRef = useRef<number>(0);
  const cooldownMsRef = useRef(cooldownMs);
  const volumeRef = useRef(volume);

  // Keep refs in sync without re-creating the audio element
  useEffect(() => { cooldownMsRef.current = cooldownMs; }, [cooldownMs]);
  useEffect(() => { volumeRef.current = volume; }, [volume]);

  // Create/recreate audio element when soundUrl changes
  useEffect(() => {
    if (!soundUrl) {
      audioRef.current = null;
      return;
    }
    const audio = new Audio(soundUrl);
    audio.volume = volumeRef.current;
    audio.preload = 'auto';
    // Load it so first play has no latency
    audio.load();
    audioRef.current = audio;
    return () => {
      audio.src = '';
      audioRef.current = null;
    };
  }, [soundUrl]);

  const tick = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const now = performance.now();
    if (now - lastPlayRef.current < cooldownMsRef.current) return;
    lastPlayRef.current = now;
    audio.volume = volumeRef.current;
    // Clone the audio node so overlapping plays work on slower systems
    const clone = audio.cloneNode() as HTMLAudioElement;
    clone.volume = volumeRef.current;
    clone.play().catch(() => {});
  }, []);

  return { tick };
}