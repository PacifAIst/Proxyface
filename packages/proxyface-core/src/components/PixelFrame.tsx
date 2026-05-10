import type { ReactNode } from 'react';

/**
 * The visual chassis around the avatar.
 *
 * Renders:
 *   - A deep-navy display surface
 *   - A CRT scanline + vignette overlay (purely cosmetic)
 *   - A sweeping highlight bar
 *
 * Sized to fit any host: the popup mounts it at ~360×440, the full-page
 * web view stretches it to fill the viewport. Aspect ratio is preserved
 * by the inner element, not the frame itself.
 */
export function PixelFrame({ children }: { children: ReactNode }) {
  return (
    <div className="relative h-full w-full overflow-hidden bg-crt-950">
      {/* Subtle radial backlight */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background:
            'radial-gradient(ellipse at 50% 40%, rgba(245,185,66,0.07) 0%, rgba(0,0,0,0) 60%)',
        }}
      />

      {/* Actual content */}
      <div className="relative z-10 flex h-full w-full items-center justify-center animate-flicker">
        {children}
      </div>

      {/* Decorative CRT layers — pointer-events-none, never block interaction */}
      <div className="crt-overlay" aria-hidden />
      <div className="crt-sweep" aria-hidden />
    </div>
  );
}
