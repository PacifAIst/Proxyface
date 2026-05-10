import { createContext, useContext, type ReactNode } from 'react';
import type { Platform, PlatformContext } from '../types';

/**
 * Provides the current runtime surface to descendants.
 * Each target wraps its tree with <PlatformProvider platform="..." />
 * so shared components can adapt without sniffing window.* themselves.
 */
const Ctx = createContext<PlatformContext | null>(null);

const PLATFORM_LABELS: Record<Platform, string> = {
  web: 'Web App',
  'extension-popup': 'Extension Popup',
  'extension-fullpage': 'Extension Full Page',
};

function buildContext(platform: Platform): PlatformContext {
  const isExtension = platform === 'extension-popup' || platform === 'extension-fullpage';
  return {
    platform,
    isExtension,
    // Step 5 enforces explicit opt-in everywhere; popup defaults strictest.
    cameraOptInRequired: true,
    label: PLATFORM_LABELS[platform],
  };
}

export function PlatformProvider({
  platform,
  children,
}: {
  platform: Platform;
  children: ReactNode;
}) {
  return <Ctx.Provider value={buildContext(platform)}>{children}</Ctx.Provider>;
}

export function usePlatform(): PlatformContext {
  const value = useContext(Ctx);
  if (!value) {
    throw new Error(
      'usePlatform() called outside <PlatformProvider>. Wrap your app entry point.',
    );
  }
  return value;
}
