/**
 * useCharacterIndex — fetches the sprite/art/index.json that
 * sync-sprites.mjs generates at build time, so the showroom and
 * settings panel know what characters exist.
 *
 * The index is generated automatically by `node scripts/sync-sprites.mjs`
 * (which runs as part of `pnpm dev`) by walking
 * src/assets/sprites/art/* and aggregating each manifest.json.
 *
 * Falls back to a single "placeholder" entry if the index can't be
 * fetched, so the app stays usable.
 */
import { useEffect, useState } from 'react';

export interface CharacterIndexEntry {
  id: string;
  name: string;
  description: string;
  author: string;
  url: string;
  eyeCount: 0 | 1 | 2;
  manifestUrl: string;
  atlasUrl: string;
}

export interface CharacterIndex {
  version: number;
  generatedAt: string;
  characters: CharacterIndexEntry[];
}

const FALLBACK: CharacterIndex = {
  version: 1,
  generatedAt: new Date(0).toISOString(),
  characters: [
    {
      id: 'placeholder',
      name: 'Placeholder',
      description: 'The original test face.',
      author: 'ProxyFace built-in',
      url: '',
      eyeCount: 2,
      manifestUrl: '/sprites/art/placeholder/manifest.json',
      atlasUrl: '/sprites/art/placeholder/atlas.png',
    },
  ],
};

export function useCharacterIndex(spritesBaseUrl: string = '/sprites/'): {
  index: CharacterIndex;
  loading: boolean;
  error: string | null;
} {
  const [index, setIndex] = useState<CharacterIndex>(FALLBACK);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const url = `${spritesBaseUrl.replace(/\/$/, '')}/art/index.json`;
    fetch(url, { cache: 'no-store' })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<CharacterIndex>;
      })
      .then((data) => {
        if (!alive) return;
        if (!data?.characters?.length) throw new Error('empty index');
        setIndex(data);
        setError(null);
      })
      .catch((err) => {
        if (!alive) return;
        // eslint-disable-next-line no-console
        console.warn('[useCharacterIndex] using fallback —', err);
        setIndex(FALLBACK);
        setError(String(err));
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [spritesBaseUrl]);

  return { index, loading, error };
}
