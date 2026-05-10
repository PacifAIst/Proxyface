/**
 * Voice I/O types.
 *
 * Two independent capabilities, both wrapping the native browser
 * Web Speech API:
 *
 *   - Speech-to-Text (microphone input → text → emotion engine)
 *   - Text-to-Speech (LLM text → spoken voice)
 *
 * Both are 100% browser-native — no models downloaded, no servers
 * contacted. Browser support varies (TTS is universal, STT is
 * Chromium-only as of writing) so the hooks expose `isSupported`
 * flags rather than throwing.
 */

// ---------------------------------------------------------------------------
// Speech recognition (microphone input)
// ---------------------------------------------------------------------------

export type ListenState =
  | 'idle'        // not active
  | 'requesting'  // waiting on mic permission
  | 'listening'   // actively transcribing
  | 'denied'      // user said no, or permissions policy blocked
  | 'error';      // unrecoverable

export interface SpeechSegment {
  /** Stable monotonic id — increments per finalized utterance. */
  id: number;
  /** The recognized text. */
  transcript: string;
  /** True once recognition has finalized this segment. */
  isFinal: boolean;
  /** Recognition confidence (0..1) when available. */
  confidence: number;
  /** Wall-clock ms when this segment was emitted. */
  receivedAt: number;
}

// ---------------------------------------------------------------------------
// Speech synthesis (text-to-speech)
// ---------------------------------------------------------------------------

export type SpeakState = 'idle' | 'speaking' | 'paused';

export interface VoiceOption {
  /** Native browser voice name (e.g. "Samantha"). */
  name: string;
  /** BCP-47 language tag (e.g. "en-US"). */
  lang: string;
  /** True if this is a built-in OS voice (vs cloud). */
  localService: boolean;
  /** True if marked as the system default. */
  default: boolean;
}
