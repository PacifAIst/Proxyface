import { useMemo, useState } from 'react';
import type { UseLocalEmotionReturn } from '../hooks/useLocalEmotion';

/**
 * Live debug panel for the emotion engine.
 *
 * Sits underneath the avatar in full-page mode and gives you:
 *   - A text input that streams into the debouncer as you type
 *   - Current engine state (loading / ready / error)
 *   - Which backend won the init race (webgpu / wasm)
 *   - The latest predicted emotion, confidence, and latency
 *
 * This is the primary visual proof that step 3 works. It disappears
 * in step 4 once the avatar itself reflects the emotion directly.
 */
export function EngineDebugPanel({ engine }: { engine: UseLocalEmotionReturn }) {
  const [draft, setDraft] = useState('');

  const stateColor = useMemo(() => {
    switch (engine.state) {
      case 'ready':
        return 'text-mood-happy';
      case 'loading':
        return 'text-signal';
      case 'error':
        return 'text-mood-error';
      default:
        return 'text-phosphor-dim';
    }
  }, [engine.state]);

  const emotionColor = useMemo(() => {
    if (!engine.result) return 'text-phosphor-dim';
    switch (engine.result.emotion) {
      case 'HAPPY':
        return 'text-mood-happy';
      case 'SAD':
        return 'text-mood-sad';
      case 'ANGRY':
        return 'text-mood-error';
      case 'ERROR':
        return 'text-mood-error';
      case 'SURPRISED':
        return 'text-mood-surprised';
      default:
        return 'text-phosphor';
    }
  }, [engine.result]);

  return (
    <div className="w-full max-w-xl space-y-3 rounded-sm border border-crt-700 bg-crt-900/70 p-4 font-mono text-sm text-phosphor shadow-crt-inset">
      {/* Status line */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs uppercase tracking-widest">
        <span>
          <span className="text-phosphor-dim">state</span>{' '}
          <span className={stateColor}>{engine.state}</span>
        </span>
        <span>
          <span className="text-phosphor-dim">backend</span>{' '}
          <span className="text-signal">{engine.backend ?? '—'}</span>
        </span>
        {engine.loadTimeMs !== null && (
          <span>
            <span className="text-phosphor-dim">load</span>{' '}
            <span className="text-signal">{engine.loadTimeMs}ms</span>
          </span>
        )}
      </div>

      {engine.error && (
        <div className="rounded-sm border border-mood-error/50 bg-mood-error/10 p-2 text-xs text-mood-error">
          {engine.error}
        </div>
      )}

      {/* Live text input */}
      <label className="block">
        <span className="mb-1 block text-[10px] uppercase tracking-widest text-phosphor-dim">
          feed text →
        </span>
        <textarea
          value={draft}
          onChange={(e) => {
            const next = e.target.value;
            // Always update the controlled value first — if this throws or
            // is skipped, the textarea will appear unresponsive even when
            // it isn't disabled. Setting state must happen unconditionally.
            setDraft(next);
            // Diff: pipe only the newly-appended characters into the engine.
            // We use a length-based diff because the typical case is
            // append-only (typing or paste-at-end). For middle-edits or
            // deletions we just don't emit — the engine sees the next
            // append.
            if (next.length > draft.length && next.startsWith(draft)) {
              const added = next.slice(draft.length);
              try {
                engine.pushText(added);
              } catch (err) {
                // Defensive: don't let an engine bug freeze the UI.
                console.warn('[ProxyFace] pushText threw:', err);
              }
            }
          }}
          onKeyDown={(e) => {
            // Enter (without Shift) acts as a "send" — flushes the
            // debouncer immediately so users don't have to type a period
            // to see the emotion update. Shift+Enter still inserts a
            // newline for multi-line inputs.
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              if (draft.trim()) {
                try {
                  engine.flush();
                } catch (err) {
                  console.warn('[ProxyFace] flush threw:', err);
                }
                setDraft('');
              }
            }
          }}
          placeholder="Type or paste LLM output here… (Enter to send, Shift+Enter for newline)"
          rows={3}
          className="w-full resize-none rounded-sm border border-crt-700 bg-crt-950 p-2 font-mono text-sm text-phosphor-glow placeholder:text-phosphor-dim/60 focus:border-phosphor focus:outline-none disabled:opacity-50"
          disabled={engine.state !== 'ready'}
        />
      </label>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => {
            if (!draft.trim()) return;
            try {
              engine.flush();
            } catch (err) {
              console.warn('[ProxyFace] flush threw:', err);
            }
            setDraft('');
          }}
          disabled={engine.state !== 'ready' || !draft.trim()}
          className="rounded-sm border border-phosphor bg-crt-900 px-3 py-1 text-[10px] uppercase tracking-widest text-phosphor transition-colors hover:bg-phosphor hover:text-crt-950 disabled:opacity-40 disabled:hover:bg-crt-900 disabled:hover:text-phosphor"
        >
          ▶ Send
        </button>
        <button
          type="button"
          onClick={() => engine.flush()}
          disabled={engine.state !== 'ready'}
          className="rounded-sm border border-crt-700 bg-crt-900 px-2 py-1 text-[10px] uppercase tracking-widest text-phosphor transition-colors hover:border-phosphor disabled:opacity-40"
          title="Force-classify whatever's pending in the buffer"
        >
          Flush
        </button>
        <button
          type="button"
          onClick={() => {
            engine.reset();
            setDraft('');
          }}
          className="rounded-sm border border-crt-700 bg-crt-900 px-2 py-1 text-[10px] uppercase tracking-widest text-phosphor transition-colors hover:border-phosphor"
        >
          Reset
        </button>
      </div>

      {/* Result readout */}
      <div className="grid grid-cols-3 gap-2 border-t border-crt-700 pt-2 text-xs">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-phosphor-dim">
            emotion
          </div>
          <div className={`font-pixel text-xs ${emotionColor}`}>
            {engine.result?.emotion ?? '—'}
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-widest text-phosphor-dim">
            confidence
          </div>
          <div className="text-phosphor">
            {engine.result ? `${(engine.result.confidence * 100).toFixed(1)}%` : '—'}
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-widest text-phosphor-dim">
            latency
          </div>
          <div className="text-phosphor">
            {engine.result ? `${engine.result.latencyMs}ms` : '—'}
          </div>
        </div>
      </div>
    </div>
  );
}
