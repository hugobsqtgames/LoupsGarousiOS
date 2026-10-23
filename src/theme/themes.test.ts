import { contrastRatio } from './contrast';
import { discreetPalette, highContrastPalette, THEMES } from './themes';

describe('contrastes des thèmes (WCAG)', () => {
  for (const theme of Object.values(THEMES)) {
    const c = theme.colors;
    it(`${theme.name} : texte lisible sur fond et surfaces (≥ 4.5:1)`, () => {
      for (const bg of [c.background, c.surface, c.surfaceRaised]) {
        expect(contrastRatio(c.text, bg)).toBeGreaterThanOrEqual(7);
        expect(contrastRatio(c.textMuted, bg)).toBeGreaterThanOrEqual(4.5);
      }
      expect(contrastRatio(c.onAccent, c.accent)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(c.onDanger, c.danger)).toBeGreaterThanOrEqual(4.5);
      for (const team of [c.village, c.wolves, c.solo]) expect(contrastRatio(team, c.surface)).toBeGreaterThanOrEqual(3);
    });

    it(`${theme.name} en mode discret : reste lisible malgré la faible luminosité`, () => {
      const d = discreetPalette(c);
      expect(contrastRatio(d.text, d.surface)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(d.textMuted, d.surface)).toBeGreaterThanOrEqual(3);
      expect(contrastRatio(d.onAccent, d.accent)).toBeGreaterThanOrEqual(4.5);
    });

    it(`${theme.name} en contraste élevé : AAA pour le texte principal et secondaire, bordures visibles`, () => {
      const h = highContrastPalette(c, theme.dark);
      for (const bg of [h.background, h.surface, h.surfaceRaised]) {
        expect(contrastRatio(h.text, bg)).toBeGreaterThanOrEqual(contrastRatio(c.text, bg));
        expect(contrastRatio(h.textMuted, bg)).toBeGreaterThanOrEqual(7);
        expect(contrastRatio(h.textFaint, bg)).toBeGreaterThanOrEqual(4.5);
      }
      expect(contrastRatio(h.borderStrong, h.surface)).toBeGreaterThanOrEqual(3);
    });
  }
});
