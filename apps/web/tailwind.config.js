import preset from '@proxyface/core/tailwind-preset';

/** @type {import('tailwindcss').Config} */
export default {
  presets: [preset],
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
    '../../packages/proxyface-core/src/**/*.{ts,tsx}',
  ],
};
