import { DEFAULT_SETTINGS, normalizeSettings } from './settings';

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
