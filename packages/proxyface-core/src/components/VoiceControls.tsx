import type { UseSpeechToTextReturn } from '../hooks/useSpeechToText';
import type { UseTextToSpeechReturn } from '../hooks/useTextToSpeech';

/**
 * Voice I/O controls — microphone (STT) and speaker (TTS).
 *
 * Designed to sit alongside <EyeTrackerControls/> in the full-page
 * surface. Each capability is independently optional:
 *
 *   - If STT is unsupported (Firefox, Safari without flags) the mic
 *     section vanishes silently — no broken UI.
 *   - TTS is essentially universal so its section always renders.
 */
export function VoiceControls({
  stt,
  tts,
}: {
  stt?: UseSpeechToTextReturn;
  tts?: UseTextToSpeechReturn;
}) {
  // Both omitted → render nothing.
  if (!stt && !tts) return null;

  return (
    <div className="flex w-full max-w-xl flex-col gap-2 rounded-sm border border-crt-700 bg-crt-900/70 p-3 font-mono text-sm">
      <div className="text-[10px] uppercase tracking-widest text-phosphor-dim">
        › voice
      </div>

      {stt?.isSupported && (
        <div className="flex items-center gap-2">
          {stt.state === 'listening' ? (
            <button
              type="button"
              onClick={stt.stop}
              className="flex items-center gap-2 rounded-sm border border-mood-error bg-mood-error/10 px-3 py-1 text-[11px] uppercase tracking-widest text-mood-error transition-colors hover:bg-mood-error hover:text-crt-950"
            >
              <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-mood-error" />
              ■ Stop mic
            </button>
          ) : (
            <button
              type="button"
              onClick={stt.start}
              disabled={stt.state === 'requesting' || stt.state === 'denied'}
              className="rounded-sm border border-phosphor bg-crt-900 px-3 py-1 text-[11px] uppercase tracking-widest text-phosphor transition-colors hover:bg-phosphor hover:text-crt-950 disabled:opacity-40"
            >
              🎙 Start mic
            </button>
          )}
          {stt.state === 'denied' && (
            <span className="text-xs text-mood-error">mic permission denied</span>
          )}
          {stt.error && stt.state === 'error' && (
            <span className="text-xs text-mood-error">{stt.error}</span>
          )}
          {stt.currentInterim && (
            <span className="truncate text-xs italic text-signal" title={stt.currentInterim}>
              "{stt.currentInterim}"
            </span>
          )}
        </div>
      )}

      {!stt?.isSupported && stt && (
        <p className="text-xs text-phosphor-dim">
          Speech recognition isn't supported in this browser.
        </p>
      )}

      {tts?.isSupported && (
        <div className="flex items-center gap-2">
          {tts.state === 'speaking' || tts.state === 'paused' ? (
            <button
              type="button"
              onClick={tts.cancel}
              className="rounded-sm border border-crt-700 bg-crt-950 px-2 py-1 text-[10px] uppercase tracking-widest text-phosphor-dim transition-colors hover:border-mood-error hover:text-mood-error"
            >
              ■ Stop voice
            </button>
          ) : (
            <span className="text-[10px] uppercase tracking-widest text-phosphor-dim">
              voice ready · {tts.voices.filter((v) => v.localService).length} local voices
            </span>
          )}
        </div>
      )}
    </div>
  );
}
