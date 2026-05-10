#!/usr/bin/env node
/**
 * sync-sprites.mjs
 *
 * Copies sprite assets from the shared asset directory into this app's
 * public/sprites/ so Vite serves them at /sprites/…
 *
 * Source:  packages/proxyface-core/src/assets/sprites/
 * Dest:    <this app>/public/sprites/
 *
 * Plug-and-play character discovery:
 *   After copying, the script walks public/sprites/art/* and aggregates
 *   each character's manifest.json into a single
 *   public/sprites/art/index.json. The web app fetches that one file at
 *   startup to populate the showroom.
 *
 * Drop a new folder under art/, run `pnpm dev` (or
 * `node scripts/sync-sprites.mjs`) and the new character appears in
 * the showroom — no code changes.
 */

import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(here, '..');
const src = resolve(appRoot, '../../packages/proxyface-core/src/assets/sprites');
const dest = resolve(appRoot, 'public/sprites');

mkdirSync(dest, { recursive: true });

const topLevel = existsSync(src)
  ? readdirSync(src).filter((f) => !f.startsWith('.') && !f.startsWith('_'))
  : [];

if (topLevel.length === 0) {
  writeFileSync(
    join(dest, 'SPRITES_MISSING.md'),
    [
      '# Sprite assets not yet synced',
      '',
      'Drop your character folders at:',
      '`packages/proxyface-core/src/assets/sprites/art/<character-id>/`',
      '',
      'Each folder needs `atlas.png`, `pupil.png`, and `manifest.json`.',
      '',
    ].join('\n'),
  );
  console.log('[sync-sprites] source is empty — wrote placeholder note');
  process.exit(0);
}

console.log(`[sync-sprites] copying ${src} → ${dest}`);
cpSync(src, dest, { recursive: true });

// ─── Build art/index.json ──────────────────────────────────────────
// Walk public/sprites/art/* and aggregate every manifest into one
// listing the runtime can fetch in a single request. We read from
// the *destination* (post-copy) so we're guaranteed to be reading
// the same files the browser will see.
const artDir = join(dest, 'art');
const characters = [];
let charDirs = [];
if (existsSync(artDir)) {
  charDirs = readdirSync(artDir).filter((name) => {
    const p = join(artDir, name);
    return statSync(p).isDirectory() && !name.startsWith('_') && !name.startsWith('.');
  });

  for (const id of charDirs) {
    const manifestPath = join(artDir, id, 'manifest.json');
    if (!existsSync(manifestPath)) {
      console.warn(`[sync-sprites] skipping ${id} — no manifest.json`);
      continue;
    }
    let manifest;
    try {
      manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
    } catch (err) {
      console.warn(`[sync-sprites] skipping ${id} — invalid manifest.json (${err.message})`);
      continue;
    }
    characters.push({
      id,
      name: manifest.name ?? id,
      description: manifest.description ?? '',
      author: manifest.author ?? '',
      url: manifest.url ?? '',
      eyeCount: manifest.eyeCount ?? 2,
      manifestUrl: `/sprites/art/${id}/manifest.json`,
      // We expose the atlas URL too so the showroom can show a static
      // thumbnail of frame 0 without fetching the whole manifest.
      atlasUrl: `/sprites/art/${id}/${manifest.atlas ?? 'atlas.png'}`,
    });
  }
}

const indexPath = join(artDir, 'index.json');
mkdirSync(artDir, { recursive: true });
writeFileSync(
  indexPath,
  JSON.stringify(
    {
      version: 1,
      generatedAt: new Date().toISOString(),
      characters: characters.sort((a, b) => a.name.localeCompare(b.name)),
    },
    null,
    2,
  ),
);

console.log(`[sync-sprites] wrote index with ${characters.length} characters → ${indexPath}`);
console.log(`[sync-sprites] synced ${topLevel.length} top-level entries, ${charDirs.length} character folders`);
