import type { UseEyeTrackerReturn } from '../hooks/useEyeTracker';

/**
 * Camera controls for the eye tracker.
 *
 * Embodies the privacy contract:
 *   - Clear "Enable Camera" button. No permission prompt until clicked.
 *   - A visible indicator when the camera is running ("live dot").
 *   - One-click stop. Stops the stream, releases the camera, drops
 *     the model references.
 *   - Explicit copy ("processed locally, never uploaded") because
 *     this is the one place users will legitimately worry about
 *     what we're doing with their webcam.
 */
export function EyeTrackerControls({ tracker }: { tracker: UseEyeTrackerReturn }) {
  const { state, error, fps, frameCount, start, stop } = tracker;

  if (state === 'idle' || state === 'denied') {
    return (
      <div className="flex w-full max-w-xl flex-col gap-2 rounded-sm border border-crt-700 bg-crt-900/70 p-4 font-mono text-sm">
        <div className="text-[10px] uppercase tracking-widest text-phosphor-dim">
          › eye tracking
        </div>
        <p className="text-phosphor">
          Enable your webcam for gaze tracking.
        </p>
        <p className="text-xs text-phosphor-dim">
          Video is processed locally. No frames are uploaded.
        </p>
        {state === 'denied' && (
          <p className="text-xs text-mood-error">
            Camera permission denied. Re-enable it in your browser's site settings.
          </p>
        )}
        <button
          type="button"
          onClick={() => void start()}
          className="mt-1 self-start rounded-sm border border-phosphor bg-crt-900 px-3 py-1 text-[11px] uppercase tracking-widest text-phosphor transition-colors hover:bg-phosphor hover:text-crt-950 focus:outline-none focus:ring-1 focus:ring-phosphor"
        >
          ▶ Enable Camera
        </button>
      </div>
    );
  }

  if (state === 'requesting' || state === 'loading-model') {
    return (
      <div className="flex w-full max-w-xl items-center gap-2 rounded-sm border border-crt-700 bg-crt-900/70 p-4 font-mono text-sm text-signal">
        <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-signal" />
        <span className="text-[11px] uppercase tracking-widest">
          {state === 'requesting' ? 'requesting camera…' : 'loading face model…'}
        </span>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="flex w-full max-w-xl flex-col gap-2 rounded-sm border border-mood-error/50 bg-mood-error/10 p-4 font-mono text-sm text-mood-error">
        <span className="text-[10px] uppercase tracking-widest">
          › eye tracking error
        </span>
        <span className="text-xs">{error ?? 'Unknown error'}</span>
        <button
          type="button"
          onClick={() => void start()}
          className="mt-1 self-start rounded-sm border border-mood-error px-3 py-1 text-[11px] uppercase tracking-widest transition-colors hover:bg-mood-error hover:text-crt-950"
        >
          Retry
        </button>
      </div>
    );
  }

  // active
  return (
    <div className="flex w-full max-w-xl items-center justify-between gap-2 rounded-sm border border-phosphor/60 bg-crt-900/70 p-3 font-mono text-sm text-phosphor">
      <div className="flex items-center gap-2">
        <span
          className="inline-block h-2 w-2 animate-pulse rounded-full bg-mood-error"
          aria-label="Camera active"
        />
        <span className="text-[11px] uppercase tracking-widest">tracking</span>
        <span className="text-[11px] text-phosphor-dim">
          {fps}fps · {frameCount} frames
        </span>
      </div>
      <button
        type="button"
        onClick={stop}
        className="rounded-sm border border-crt-700 bg-crt-950 px-2 py-1 text-[10px] uppercase tracking-widest text-phosphor-dim transition-colors hover:border-mood-error hover:text-mood-error"
      >
        ■ Stop
      </button>
    </div>
  );
}
