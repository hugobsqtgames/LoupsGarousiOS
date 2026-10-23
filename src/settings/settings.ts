import { DEFAULT_VARIANTS, normalizeVariants, type RoleId, type Variants } from '@/engine';

export type ThemeId = 'clair-de-lune' | 'foret' | 'lune-de-sang' | 'parchemin';

export const THEME_IDS: readonly ThemeId[] = ['clair-de-lune', 'foret', 'lune-de-sang', 'parchemin'];

export type NightAmbience = 'auto' | 'night' | 'rain' | 'storm';
export type AnnouncementStyleSetting = 'sobre' | 'dramatique' | 'conte' | 'humour';

/** Ambiance de nuit associée à chaque thème (réglage « Selon le thème »). */
export const THEME_NIGHT_AMBIENCE: Record<ThemeId, Exclude<NightAmbience, 'auto'>> = {
  'clair-de-lune': 'night',
  foret: 'rain',
  'lune-de-sang': 'storm',
  parchemin: 'night',
};

export function resolveNightAmbience(s: Pick<AppSettings, 'nightAmbience' | 'themeId'>): Exclude<NightAmbience, 'auto'> {
  return s.nightAmbience === 'auto' ? THEME_NIGHT_AMBIENCE[s.themeId] : s.nightAmbience;
}

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
  /** Ambiance sonore de la nuit. */
  nightAmbience: NightAmbience;
  /** Ambiance du jour (oiseaux) ou silence. */
  dayAmbience: boolean;
  /** Hurlement au réveil des loups. */
  wolfHowl: boolean;
  /** Cloche du village à l'aube (à la place du carillon). */
  dawnBell: boolean;
  /** Durée du débat en minutes (0 = pas de minuteur). */
  debateMinutes: number;
  /** Style de l'annonce de l'aube prête à lire. */
  announcementStyle: AnnouncementStyleSetting;
  /** Révéler la carte des joueurs éliminés dans l'annonce (règle de base). */
  revealRolesAtDawn: boolean;
  /** Contraste élevé (texte et bordures renforcés). */
  highContrast: boolean;
  /** Animations réduites (en plus du réglage du système). */
  reduceMotion: boolean;
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
  nightAmbience: 'auto',
  dayAmbience: true,
  wolfHowl: true,
  dawnBell: false,
  debateMinutes: 3,
  announcementStyle: 'dramatique',
  revealRolesAtDawn: true,
  highContrast: false,
  reduceMotion: false,
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
    nightAmbience: (['auto', 'night', 'rain', 'storm'] as const).includes(s.nightAmbience as NightAmbience) ? (s.nightAmbience as NightAmbience) : d.nightAmbience,
    dayAmbience: bool(s.dayAmbience, d.dayAmbience),
    wolfHowl: bool(s.wolfHowl, d.wolfHowl),
    dawnBell: bool(s.dawnBell, d.dawnBell),
    debateMinutes: typeof s.debateMinutes === 'number' && Number.isInteger(s.debateMinutes) && s.debateMinutes >= 0 && s.debateMinutes <= 30 ? s.debateMinutes : d.debateMinutes,
    announcementStyle: (['sobre', 'dramatique', 'conte', 'humour'] as const).includes(s.announcementStyle as AnnouncementStyleSetting) ? (s.announcementStyle as AnnouncementStyleSetting) : d.announcementStyle,
    revealRolesAtDawn: bool(s.revealRolesAtDawn, d.revealRolesAtDawn),
    highContrast: bool(s.highContrast, d.highContrast),
    reduceMotion: bool(s.reduceMotion, d.reduceMotion),
  };
}
