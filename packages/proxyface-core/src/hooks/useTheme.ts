/**
 * useTheme — manages light/dark mode.
 * Persists to localStorage, applies 'light' class to <html>.
 */
import { useCallback, useEffect, useState } from 'react';

const KEY = 'proxyface_theme';

export type Theme = 'dark' | 'light';

function applyTheme(t: Theme) {
  if (t === 'light') {
    document.documentElement.classList.add('light');
  } else {
    document.documentElement.classList.remove('light');
  }
}

export function useTheme(): [Theme, () => void] {
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      const stored = localStorage.getItem(KEY) as Theme | null;
      return stored === 'light' ? 'light' : 'dark';
    } catch {
      return 'dark';
    }
  });

  // Apply on mount and when changed
  useEffect(() => { applyTheme(theme); }, [theme]);

  const toggle = useCallback(() => {
    setTheme(prev => {
      const next: Theme = prev === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem(KEY, next); } catch {}
      return next;
    });
  }, []);

  return [theme, toggle];
}
