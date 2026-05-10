import { useEffect, useState } from 'react';

/**
 * PerfMonitor — dev overlay that measures the health of the runtime.
 *
 * Enabled in two ways:
 *   1. ?perf=1 in the URL (any platform).
 *   2. localStorage['proxyface:perf'] === '1' (persists across reloads).
 *
 * Metrics shown:
 *   - Cold start: ms from navigationStart → first rAF paint
 *   - Avatar FPS: rolling 1s window (should hold 60 on modern HW)
 *   - Heap: rough JS heap size via performance.memory (Chromium only)
 *
 * Budget (what step 8 targets — document your measured numbers here
 * after running on target hardware):
 *   - Cold start: < 2000ms (WebGPU), < 3500ms (Wasm fallback)
 *   - Avatar FPS: >= 58 sustained
 *   - Idle CPU (no emotion changes, no eye tracking): < 5%
 *   - Memory: < 150MB total (model + atlas + MediaPipe)
 *
 * Intentionally NOT exposed through main UI chrome. This is a
 * dev/QA tool — end users should never see it.
 */
export function PerfMonitor() {
  const enabled = usePerfEnabled();
  const [fps, setFps] = useState(0);
  const [coldStartMs, setColdStartMs] = useState<number | null>(null);
  const [heapMb, setHeapMb] = useState<number | null>(null);

  useEffect(() => {
    if (!enabled) return;

    // Cold start: how long between navigationStart and our first paint.
    // We measure this once, on mount. `performance.timeOrigin` + first
    // requestAnimationFrame gives a reasonable "time to interactive".
    let coldStartMeasured = false;
    requestAnimationFrame(() => {
      if (coldStartMeasured) return;
      coldStartMeasured = true;
      setColdStartMs(Math.round(performance.now()));
    });

    // FPS: count rAF ticks per second.
    let frames = 0;
    let last = performance.now();
    let raf = 0;
    const tick = () => {
      frames += 1;
      const now = performance.now();
      if (now - last >= 1000) {
        setFps(Math.round((frames * 1000) / (now - last)));
        frames = 0;
        last = now;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    // Heap: Chromium-only. Firefox / Safari return null.
    const memInterval = window.setInterval(() => {
      const mem = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory;
      if (mem) {
        setHeapMb(Math.round(mem.usedJSHeapSize / (1024 * 1024)));
      }
    }, 1000);

    return () => {
      cancelAnimationFrame(raf);
      window.clearInterval(memInterval);
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div className="pointer-events-auto fixed bottom-3 right-3 z-[100] rounded-sm border border-crt-700 bg-crt-950/95 px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-phosphor shadow-crt-inset">
      <div className="text-[9px] text-phosphor-dim">› perf</div>
      <div className="mt-1 grid grid-cols-[auto_auto] gap-x-3 gap-y-0.5">
        <span className="text-phosphor-dim">boot</span>
        <span>{coldStartMs === null ? '…' : `${coldStartMs}ms`}</span>
        <span className="text-phosphor-dim">fps</span>
        <span className={fps < 55 ? 'text-mood-error' : 'text-mood-happy'}>{fps}</span>
        <span className="text-phosphor-dim">heap</span>
        <span>{heapMb === null ? 'n/a' : `${heapMb}MB`}</span>
      </div>
    </div>
  );
}

function usePerfEnabled(): boolean {
  const [enabled, setEnabled] = useState(() => {
    if (typeof window === 'undefined') return false;
    if (new URLSearchParams(window.location.search).has('perf')) return true;
    try {
      return window.localStorage.getItem('proxyface:perf') === '1';
    } catch {
      return false;
    }
  });

  // Hot-toggle via keyboard: Ctrl+Shift+P (avoids Chrome's Ctrl+Shift+P print shortcut conflict)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'P') {
        e.preventDefault();
        setEnabled((v) => {
          const next = !v;
          try {
            window.localStorage.setItem('proxyface:perf', next ? '1' : '0');
          } catch {
            /* ignore */
          }
          return next;
        });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return enabled;
}
