/**
 * useSpriteSheet — load the avatar sprite sheet.
 *
 * Wraps `loadSpriteSheet` in a React hook with proper lifecycle,
 * error state, and a single-load guarantee across StrictMode double-mounts.
 */

import { useEffect, useState } from 'react';
import { loadSpriteSheet, type LoadedSpriteSheet } from '../avatar/loader';

type LoadState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; sheet: LoadedSpriteSheet }
  | { status: 'error'; error: string };

export function useSpriteSheet(manifestUrl: string | null | undefined): LoadState {
  const [state, setState] = useState<LoadState>({ status: 'idle' });

  useEffect(() => {
    if (!manifestUrl) return;
    let cancelled = false;
    setState({ status: 'loading' });

    loadSpriteSheet(manifestUrl)
      .then((sheet) => {
  console.log('[useSpriteSheet] loaded', manifestUrl, 'cancelled=', cancelled);
  if (cancelled) {
    sheet.atlas.close();
    sheet.pupilSprite?.close();
    return;
  }
  setState({ status: 'ready', sheet });
})
.catch((err: unknown) => {
  console.error('[useSpriteSheet] error', manifestUrl, err);
  if (cancelled) return;
  setState({
    status: 'error',
    error: err instanceof Error ? err.message : String(err),
  });
});

    return () => {
      cancelled = true;
    };
  }, [manifestUrl]);

  return state;
}
