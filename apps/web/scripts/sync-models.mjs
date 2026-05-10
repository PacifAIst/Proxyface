#!/usr/bin/env node
/**
 * sync-models.mjs
 *
 * Copies the trained emotion model from the shared asset directory into
 * this app's public/models/ so the Vite build serves it at /models/emotion/…
 *
 * Run:
 *   node scripts/sync-models.mjs
 *
 * Source:  packages/proxyface-core/src/assets/models/emotion/
 * Dest:    <this app>/public/models/emotion/
 *
 * If the source is empty (step 2 hasn't been run yet) we write a tiny
 * placeholder README so it's obvious what's missing, and exit 0 —
 * this way CI can still build the scaffold end-to-end before training
 * has happened.
 */

import { cpSync, existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(here, '..');
const src = resolve(appRoot, '../../packages/proxyface-core/src/assets/models/emotion');
const dest = resolve(appRoot, 'public/models/emotion');

mkdirSync(dest, { recursive: true });

if (!existsSync(src) || readdirSync(src).filter((f) => !f.startsWith('.')).length <= 1) {
  // Empty or only contains the README.md we shipped earlier.
  const placeholder = join(dest, 'MODEL_MISSING.md');
  writeFileSync(
    placeholder,
    [
      '# Model not yet synced',
      '',
      'Run the step 2 pipeline first:',
      '',
      '```',
      'cd training',
      'python scripts/make_dataset.py',
      'python scripts/train_model.py',
      'python scripts/export_to_onnx.py',
      '```',
      '',
      "Then re-run this app's `sync-models` script (or just `pnpm build`).",
      '',
    ].join('\n'),
  );
  console.log(`[sync-models] source is empty — wrote placeholder to ${placeholder}`);
  process.exit(0);
}

console.log(`[sync-models] copying ${src} → ${dest}`);
cpSync(src, dest, { recursive: true });
console.log('[sync-models] done');
