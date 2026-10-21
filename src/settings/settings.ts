import { DEFAULT_VARIANTS, normalizeVariants, type RoleId, type Variants } from '@/engine';

export type ThemeId = 'clair-de-lune' | 'foret' | 'lune-de-sang' | 'parchemin';

export const THEME_IDS: readonly ThemeId[] = ['clair-de-lune', 'foret', 'lune-de-sang', 'parchemin'];

export interface AppSettings {
  themeId: ThemeId;
  /** Coupe tous les sons. */
  muted: boolean;
  ambientVolume: number;
  effectsVolume: number;
  /** Narration vocale des appels de nuit (synthèse vocale de l'appareil). */
  narrationEnabled: boolean;
  narrationVolume: number;
  /** Jouer les sons même lorsque l'iPhone est en mode silencieux. */
  playInSilentMode: boolean;
  /** Mode discret : interface très sombre, aucun son, animations réduites. */
  discreetMode: boolean;
  /** Masquer les rôles par défaut dans les vues générales. */
  hideSecretsByDefault: boolean;
  haptics: boolean;
  keepAwake: boolean;
  defaultVariants: Variants;
  favoriteRoles: RoleId[];
  /** Aide de démarrage déjà vue. */
  onboardingSeen: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  themeId: 'clair-de-lune',
  muted: false,
  ambientVolume: 0.5,
  effectsVolume: 0.7,
  narrationEnabled: false,
  narrationVolume: 0.8,
  playInSilentMode: false,
  discreetMode: false,
  hideSecretsByDefault: true,
  haptics: true,
  keepAwake: true,
  defaultVariants: DEFAULT_VARIANTS,
  favoriteRoles: [],
  onboardingSeen: false,
};

function volume(v: unknown, fallback: number): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) return fallback;
  return Math.round(Math.min(1, Math.max(0, v)) * 100) / 100;
}

function bool(v: unknown, fallback: boolean): boolean {
  return typeof v === 'boolean' ? v : fallback;
}

/** Valide des paramètres lus sur disque : toute valeur absente ou invalide reprend sa valeur par défaut. */
export function normalizeSettings(input: unknown): AppSettings {
  if (typeof input !== 'object' || input === null) return { ...DEFAULT_SETTINGS };
  const s = input as Record<string, unknown>;
  const d = DEFAULT_SETTINGS;
  return {
    themeId: THEME_IDS.includes(s.themeId as ThemeId) ? (s.themeId as ThemeId) : d.themeId,
    muted: bool(s.muted, d.muted),
    ambientVolume: volume(s.ambientVolume, d.ambientVolume),
    effectsVolume: volume(s.effectsVolume, d.effectsVolume),
    narrationEnabled: bool(s.narrationEnabled, d.narrationEnabled),
    narrationVolume: volume(s.narrationVolume, d.narrationVolume),
    playInSilentMode: bool(s.playInSilentMode, d.playInSilentMode),
    discreetMode: bool(s.discreetMode, d.discreetMode),
    hideSecretsByDefault: bool(s.hideSecretsByDefault, d.hideSecretsByDefault),
    haptics: bool(s.haptics, d.haptics),
    keepAwake: bool(s.keepAwake, d.keepAwake),
    defaultVariants: normalizeVariants(s.defaultVariants),
    favoriteRoles: Array.isArray(s.favoriteRoles) ? s.favoriteRoles.filter((r): r is RoleId => typeof r === 'string').slice(0, 100) : [],
    onboardingSeen: bool(s.onboardingSeen, d.onboardingSeen),
  };
}
