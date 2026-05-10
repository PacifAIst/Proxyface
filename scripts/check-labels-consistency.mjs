#!/usr/bin/env node
/**
 * check-labels-consistency.mjs
 *
 * The 8 emotion labels MUST stay in perfect agreement across three
 * files:
 *   1. training/src/proxyface_training/labels.py  (Python source)
 *   2. packages/proxyface-core/src/types/index.ts (TypeScript source)
 *   3. packages/proxyface-core/src/assets/models/emotion/labels.json
 *      (the artifact shipped with the trained model)
 *
 * If any drift, the runtime will appear to work (no crash) but the
 * classifier's output will map to the wrong avatar emotions —
 * silently, in production. This script is an assertion in CI form.
 *
 * Exits 0 on consistency, 1 on any mismatch. Suitable for pre-push
 * hooks, CI gates, or just running manually before a release.
 *
 * Run:
 *   node scripts/check-labels-consistency.mjs
 *
 * Or wire into the root package.json as `pnpm check:labels`.
 */

import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');

const PY_FILE = resolve(root, 'training/src/proxyface_training/labels.py');
const TS_FILE = resolve(root, 'packages/proxyface-core/src/types/index.ts');
const JSON_FILE = resolve(
  root,
  'packages/proxyface-core/src/assets/models/emotion/labels.json',
);

function fail(msg) {
  console.error(`[check-labels] FAIL: ${msg}`);
  process.exit(1);
}

function extractPythonLabels() {
  if (!existsSync(PY_FILE)) fail(`missing ${PY_FILE}`);
  const src = readFileSync(PY_FILE, 'utf8');
  // Find:  LABELS: Final[tuple[str, ...]] = (  ... "IDLE",  ... )
  const match = src.match(/LABELS\s*:\s*Final\[tuple\[str,\s*\.\.\.\]\]\s*=\s*\(([\s\S]*?)\)/);
  if (!match) fail('could not parse LABELS tuple from labels.py');
  const body = match[1];
  const labels = [...body.matchAll(/"([A-Z]+)"/g)].map((m) => m[1]);
  if (labels.length === 0) fail('LABELS tuple in labels.py is empty');
  return labels;
}

function extractTypeScriptLabels() {
  if (!existsSync(TS_FILE)) fail(`missing ${TS_FILE}`);
  const src = readFileSync(TS_FILE, 'utf8');
  const match = src.match(/EMOTIONS\s*=\s*\[([\s\S]*?)\]\s*as\s*const/);
  if (!match) fail('could not parse EMOTIONS array from types/index.ts');
  const body = match[1];
  const labels = [...body.matchAll(/'([A-Z]+)'/g)].map((m) => m[1]);
  if (labels.length === 0) fail('EMOTIONS array in types/index.ts is empty');
  return labels;
}

function extractJsonLabels() {
  if (!existsSync(JSON_FILE)) {
    console.warn(
      '[check-labels] labels.json not present (model not exported yet); skipping JSON check',
    );
    return null;
  }
  const parsed = JSON.parse(readFileSync(JSON_FILE, 'utf8'));
  if (!Array.isArray(parsed.labels)) fail('labels.json has no "labels" array');
  return parsed.labels;
}

const pyLabels = extractPythonLabels();
const tsLabels = extractTypeScriptLabels();
const jsonLabels = extractJsonLabels();

console.log('[check-labels] python:     ', pyLabels.join(', '));
console.log('[check-labels] typescript: ', tsLabels.join(', '));
if (jsonLabels) console.log('[check-labels] labels.json:', jsonLabels.join(', '));

const eq = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);

if (!eq(pyLabels, tsLabels)) {
  fail('labels.py and types/index.ts DISAGREE. Fix one to match the other, then retrain.');
}
if (jsonLabels && !eq(pyLabels, jsonLabels)) {
  fail(
    'labels.json is out of sync with labels.py. Re-run training/scripts/export_to_onnx.py.',
  );
}

console.log(`[check-labels] OK — ${pyLabels.length} labels consistent across all sources`);
