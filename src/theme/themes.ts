import type { ThemeId } from '@/settings/settings';

/** Jetons de conception partagés par tous les écrans. */

export interface Palette {
  /** Fond principal de l'application. */
  background: string;
  /** Haut du dégradé de ciel (décor). */
  sky: string;
  /** Bas du dégradé de ciel (horizon). */
  horizon: string;
  surface: string;
  surfaceRaised: string;
  surfacePressed: string;
  border: string;
  borderStrong: string;
  text: string;
  textMuted: string;
  textFaint: string;
  accent: string;
  accentPressed: string;
  onAccent: string;
  /** Lueur lunaire (halo, focus). */
  glow: string;
  moon: string;
  silhouette: string;
  mist: string;
  village: string;
  wolves: string;
  solo: string;
  danger: string;
  onDanger: string;
  success: string;
  warning: string;
  info: string;
  overlay: string;
}

export interface Theme {
  id: ThemeId;
  name: string;
  description: string;
  dark: boolean;
  colors: Palette;
}

export const spacing = { xxs: 2, xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 } as const;
export const radius = { sm: 8, md: 12, lg: 18, xl: 26, pill: 999 } as const;

/** Taille minimale des zones tactiles (recommandation Apple : 44 pt). */
export const TOUCH_MIN = 44;

export const fonts = {
  display: 'Cinzel_700Bold',
  title: 'Cinzel_600SemiBold',
  body: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const;

export const typography = {
  display: { fontFamily: fonts.display, fontSize: 32, lineHeight: 40, letterSpacing: 1.2 },
  title: { fontFamily: fonts.title, fontSize: 22, lineHeight: 30, letterSpacing: 0.6 },
  heading: { fontFamily: fonts.semibold, fontSize: 17, lineHeight: 24 },
  body: { fontFamily: fonts.body, fontSize: 16, lineHeight: 23 },
  bodyStrong: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 23 },
  small: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20 },
  caption: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 16, letterSpacing: 0.4 },
  overline: { fontFamily: fonts.semibold, fontSize: 11, lineHeight: 14, letterSpacing: 1.6, textTransform: 'uppercase' as const },
  number: { fontFamily: fonts.bold, fontSize: 28, lineHeight: 32 },
} as const;

export type TypographyVariant = keyof typeof typography;

const moonlight: Palette = {
  background: '#0A0F1E',
  sky: '#121A33',
  horizon: '#1F2747',
  surface: '#131A2E',
  surfaceRaised: '#1A2340',
  surfacePressed: '#222C4D',
  border: 'rgba(178, 190, 235, 0.14)',
  borderStrong: 'rgba(178, 190, 235, 0.32)',
  text: '#ECEEF6',
  textMuted: '#A2AAC6',
  textFaint: '#6D7596',
  accent: '#E7C688',
  accentPressed: '#D2AE6C',
  onAccent: '#1B1407',
  glow: 'rgba(231, 198, 136, 0.28)',
  moon: '#F3E7C9',
  silhouette: '#070B16',
  mist: 'rgba(170, 185, 230, 0.10)',
  village: '#86C2AC',
  wolves: '#E36B5E',
  solo: '#B79BEA',
  danger: '#EF6A57',
  onDanger: '#1E0703',
  success: '#7AD3A0',
  warning: '#EDBB57',
  info: '#8FB4F2',
  overlay: 'rgba(3, 5, 12, 0.78)',
};

export const THEMES: Record<ThemeId, Theme> = {
  'clair-de-lune': {
    id: 'clair-de-lune',
    name: 'Clair de lune',
    description: 'Nuit bleutée et reflets dorés. Le thème par défaut.',
    dark: true,
    colors: moonlight,
  },
  foret: {
    id: 'foret',
    name: 'Forêt profonde',
    description: 'Sous-bois, mousse et lueur de lanterne.',
    dark: true,
    colors: {
      ...moonlight,
      background: '#07120E',
      sky: '#0D1E18',
      horizon: '#183126',
      surface: '#0F1D18',
      surfaceRaised: '#162A22',
      surfacePressed: '#1D352B',
      border: 'rgba(170, 214, 186, 0.14)',
      borderStrong: 'rgba(170, 214, 186, 0.32)',
      text: '#EAF2EC',
      textMuted: '#A3BCAE',
      textFaint: '#6A8577',
      accent: '#E9A84F',
      accentPressed: '#D18F37',
      onAccent: '#1D1104',
      glow: 'rgba(233, 168, 79, 0.26)',
      moon: '#F1E4C0',
      silhouette: '#030806',
      mist: 'rgba(170, 214, 186, 0.10)',
      village: '#9BD18A',
    },
  },
  'lune-de-sang': {
    id: 'lune-de-sang',
    name: 'Lune de sang',
    description: 'Une nuit rouge, pour les parties les plus féroces.',
    dark: true,
    colors: {
      ...moonlight,
      background: '#12070A',
      sky: '#1E0B10',
      horizon: '#3A1219',
      surface: '#1C0C11',
      surfaceRaised: '#271218',
      surfacePressed: '#331820',
      border: 'rgba(240, 170, 170, 0.14)',
      borderStrong: 'rgba(240, 170, 170, 0.32)',
      text: '#F6E9E7',
      textMuted: '#C9A5A3',
      textFaint: '#8C6866',
      accent: '#F06450',
      accentPressed: '#D84E3B',
      onAccent: '#1F0603',
      glow: 'rgba(240, 100, 80, 0.30)',
      moon: '#F2B7A1',
      silhouette: '#080204',
      mist: 'rgba(240, 170, 170, 0.08)',
      wolves: '#FF8A70',
      danger: '#FF7A66',
    },
  },
  parchemin: {
    id: 'parchemin',
    name: 'Parchemin',
    description: 'Un thème clair pour jouer en plein jour.',
    dark: false,
    colors: {
      background: '#F1E7D3',
      sky: '#E9DCC2',
      horizon: '#D9C7A3',
      surface: '#FBF5E8',
      surfaceRaised: '#FFFBF2',
      surfacePressed: '#EFE4CC',
      border: 'rgba(74, 52, 25, 0.16)',
      borderStrong: 'rgba(74, 52, 25, 0.34)',
      text: '#2B1F12',
      textMuted: '#5E4C36',
      textFaint: '#8A7658',
      accent: '#8E2F1F',
      accentPressed: '#742417',
      onAccent: '#FFF6EA',
      glow: 'rgba(142, 47, 31, 0.18)',
      moon: '#FFF6DE',
      silhouette: '#B49B73',
      mist: 'rgba(255, 255, 255, 0.35)',
      village: '#2F6E55',
      wolves: '#A3281C',
      solo: '#5D3E9A',
      danger: '#B3261E',
      onDanger: '#FFFFFF',
      success: '#2E7D4F',
      warning: '#9A6400',
      info: '#2A5BA8',
      overlay: 'rgba(43, 31, 18, 0.55)',
    },
  },
};

/** Variante « mode discret » : luminosité réduite, contrastes doux, sans halo. */
export function discreetPalette(base: Palette): Palette {
  return {
    ...base,
    background: '#000000',
    sky: '#020305',
    horizon: '#05070B',
    surface: '#07090D',
    surfaceRaised: '#0B0E14',
    surfacePressed: '#11151D',
    border: 'rgba(140, 150, 170, 0.14)',
    borderStrong: 'rgba(140, 150, 170, 0.26)',
    text: '#9AA0AE',
    textMuted: '#6E7482',
    textFaint: '#4A4F5B',
    accent: '#8C7A55',
    accentPressed: '#76663F',
    onAccent: '#000000',
    glow: 'transparent',
    moon: '#3A3A36',
    silhouette: '#000000',
    mist: 'transparent',
    village: '#5E8577',
    wolves: '#9A5048',
    solo: '#7C6C9C',
    danger: '#A3564A',
    onDanger: '#000000',
    success: '#5A8C6F',
    warning: '#9C8344',
    info: '#647DA4',
    overlay: 'rgba(0, 0, 0, 0.85)',
  };
}

export function teamColor(c: Palette, team: 'village' | 'wolves' | 'solo'): string {
  return team === 'village' ? c.village : team === 'wolves' ? c.wolves : c.solo;
}
