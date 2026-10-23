import { DEFAULT_SETTINGS, normalizeSettings, resolveNightAmbience } from './settings';

describe('paramètres', () => {
  it('reprend les valeurs par défaut si les données sont absentes ou invalides', () => {
    expect(normalizeSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(normalizeSettings('x')).toEqual(DEFAULT_SETTINGS);
    expect(normalizeSettings({ themeId: 'inconnu', muted: 'oui', ambientVolume: 7, effectsVolume: -1, narrationVolume: Number.NaN })).toEqual({
      ...DEFAULT_SETTINGS,
      ambientVolume: 1,
      effectsVolume: 0,
    });
  });

  it('conserve les valeurs valides', () => {
    const s = normalizeSettings({ themeId: 'foret', muted: true, ambientVolume: 0.333, discreetMode: true, favoriteRoles: ['voyante', 3] });
    expect(s).toMatchObject({ themeId: 'foret', muted: true, ambientVolume: 0.33, discreetMode: true, favoriteRoles: ['voyante'] });
  });

  it('complète les variantes partielles', () => {
    const s = normalizeSettings({ defaultVariants: { mayorEnabled: false } });
    expect(s.defaultVariants.mayorEnabled).toBe(false);
    expect(s.defaultVariants.ravenBonus).toBe(2);
  });
});

describe('nouveaux paramètres (ambiances, minuteur, annonce, accessibilité)', () => {
  it('valide les valeurs et associe une ambiance de nuit à chaque thème', () => {
    const s = normalizeSettings({ nightAmbience: 'grêle', debateMinutes: 99, announcementStyle: 'conte', highContrast: true });
    expect(s).toMatchObject({ nightAmbience: 'auto', debateMinutes: 3, announcementStyle: 'conte', highContrast: true });
    expect(resolveNightAmbience({ nightAmbience: 'auto', themeId: 'lune-de-sang' })).toBe('storm');
    expect(resolveNightAmbience({ nightAmbience: 'rain', themeId: 'lune-de-sang' })).toBe('rain');
  });
});
