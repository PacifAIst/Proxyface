/**
 * Shared Tailwind preset for all ProxyFace targets.
 * Colors now use CSS variables so light/dark theme works at runtime.
 */
/** @type {import('tailwindcss').Config} */
module.exports = {
  theme: {
    extend: {
      colors: {
        crt: {
          950: 'var(--crt-950)',
          900: 'var(--crt-900)',
          800: 'var(--crt-800)',
          700: 'var(--crt-700)',
          600: 'var(--crt-600)',
        },
        phosphor: {
          DEFAULT: 'var(--phosphor)',
          dim: 'var(--phosphor-dim)',
          glow: 'var(--phosphor-glow)',
        },
        signal: {
          DEFAULT: 'var(--signal)',
          dim: 'var(--signal-dim)',
        },
        mood: {
          happy: '#9be15d',
          sad: '#7090d0',
          angry: '#e2554a',
          surprised: '#f5b942',
          error: '#d83a45',
        },
      },
      fontFamily: {
        display: ['"VT323"', 'ui-monospace', 'monospace'],
        pixel: ['"Press Start 2P"', '"VT323"', 'ui-monospace', 'monospace'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      boxShadow: {
        'crt-inset': 'inset 0 0 80px rgba(0,0,0,0.55), inset 0 0 12px rgba(245,185,66,0.06)',
        phosphor: '0 0 12px rgba(245,185,66,0.55), 0 0 32px rgba(245,185,66,0.18)',
      },
      keyframes: {
        scanline: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
        flicker: {
          '0%, 100%': { opacity: '1' },
          '47%': { opacity: '1' },
          '48%': { opacity: '0.85' },
          '49%': { opacity: '1' },
          '74%': { opacity: '1' },
          '75%': { opacity: '0.92' },
          '76%': { opacity: '1' },
        },
        blink: {
          '0%, 92%, 100%': { transform: 'scaleY(1)' },
          '95%': { transform: 'scaleY(0.05)' },
        },
        breathe: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(2px)' },
        },
      },
      animation: {
        scanline: 'scanline 6s linear infinite',
        flicker: 'flicker 4s steps(1, end) infinite',
        blink: 'blink 5s ease-in-out infinite',
        breathe: 'breathe 3.4s ease-in-out infinite',
      },
    },
  },
};
