import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { ThemeId } from '@/settings/settings';
import { discreetPalette, highContrastPalette, THEMES, type Theme } from './themes';

export interface ActiveTheme extends Theme {
  discreet: boolean;
  highContrast: boolean;
}

const ThemeContext = createContext<ActiveTheme>({ ...THEMES['clair-de-lune'], discreet: false, highContrast: false });

export function ThemeProvider({ themeId, discreet, highContrast = false, children }: { themeId: ThemeId; discreet: boolean; highContrast?: boolean; children: ReactNode }) {
  const value = useMemo<ActiveTheme>(() => {
    const base = THEMES[themeId] ?? THEMES['clair-de-lune'];
    if (discreet) return { ...base, dark: true, discreet, highContrast: false, colors: discreetPalette(base.colors) };
    return highContrast ? { ...base, discreet, highContrast, colors: highContrastPalette(base.colors, base.dark) } : { ...base, discreet, highContrast };
  }, [themeId, discreet, highContrast]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ActiveTheme {
  return useContext(ThemeContext);
}
