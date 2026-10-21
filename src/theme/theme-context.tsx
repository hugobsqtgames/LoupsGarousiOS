import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { ThemeId } from '@/settings/settings';
import { discreetPalette, THEMES, type Theme } from './themes';

export interface ActiveTheme extends Theme {
  discreet: boolean;
}

const ThemeContext = createContext<ActiveTheme>({ ...THEMES['clair-de-lune'], discreet: false });

export function ThemeProvider({ themeId, discreet, children }: { themeId: ThemeId; discreet: boolean; children: ReactNode }) {
  const value = useMemo<ActiveTheme>(() => {
    const base = THEMES[themeId] ?? THEMES['clair-de-lune'];
    return discreet ? { ...base, dark: true, discreet, colors: discreetPalette(base.colors) } : { ...base, discreet };
  }, [themeId, discreet]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ActiveTheme {
  return useContext(ThemeContext);
}
