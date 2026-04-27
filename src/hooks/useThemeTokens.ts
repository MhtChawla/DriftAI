// src/hooks/useThemeTokens.ts
import { useMemo } from 'react';
import { tokens, tokensLight, type Theme } from '../theme/tokens';
import { useAppStore } from '../store/useAppStore';

export function useThemeTokens() {
  const themeMode = useAppStore((s) => s.theme);
  return useMemo<Theme>(
    () => (themeMode === 'dark' ? tokens : tokensLight),
    [themeMode],
  );
}
