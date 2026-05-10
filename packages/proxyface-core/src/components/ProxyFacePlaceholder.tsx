import { PixelFrame } from './PixelFrame';
import { PlaceholderFace } from './PlaceholderFace';
import { usePlatform } from '../hooks/usePlatform';

/**
 * The "Hello ProxyFace" placeholder.
 *
 * Step 1 exit criteria: this exact component must render identically
 * across the Chrome popup, the Chrome full-page tab, the Firefox popup,
 * the Firefox full-page tab, and the standalone web app — proving the
 * monorepo + shared-core wiring works end to end.
 *
 * Replaced in step 4 by <ProxyFaceEngine /> which drives a real
 * sprite-sheet renderer + emotion state machine.
 */
export function ProxyFacePlaceholder() {
  const { label, platform } = usePlatform();

  return (
    <PixelFrame>
      <div className="flex flex-col items-center gap-4 px-4 text-center">
        <PlaceholderFace size={144} />

        <h1 className="font-pixel text-[10px] uppercase tracking-[0.25em] text-phosphor [text-shadow:_0_0_8px_rgba(245,185,66,0.6)]">
          ProxyFace
        </h1>

        <p className="font-display text-2xl leading-none text-phosphor-glow">
          ready · 100% local
        </p>

        <div className="mt-2 flex flex-col items-center gap-1 font-mono text-[10px] uppercase tracking-widest text-signal-dim">
          <span>
            <span className="text-signal">›</span> surface: {label}
          </span>
          <span>
            <span className="text-signal">›</span> build: 0.1.0 · step 1
          </span>
        </div>

        {/* Tiny per-platform debug pill, helpful while validating the scaffold */}
        <span
          className="mt-3 rounded-sm border border-crt-700 bg-crt-900/60 px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest text-phosphor-dim"
          data-platform={platform}
        >
          {platform}
        </span>
      </div>
    </PixelFrame>
  );
}
