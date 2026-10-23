import { balanceOf, generateComposition, recommendedWolves, type Complexity } from '../composition';
import { setupErrors } from '../setup';
import { makeSetup } from '../testing';
import type { Expansion } from '../types';

const ALL: Expansion[] = ['base', 'nouvelle-lune', 'le-village', 'personnages'];

describe('composition automatique', () => {
  it('respecte la table des loups', () => {
    expect([5, 8, 11, 12, 17, 18, 24, 40].map(recommendedWolves)).toEqual([1, 2, 2, 3, 3, 4, 5, 6]);
  });

  it('est reproductible pour une même graine', () => {
    const a = generateComposition({ playerCount: 12, expansions: ALL, complexity: 'riche', seed: 42 });
    const b = generateComposition({ playerCount: 12, expansions: ALL, complexity: 'riche', seed: 42 });
    expect(a).toEqual(b);
  });

  it('contient toujours la Voyante et ne dépasse jamais l’équilibre toléré', () => {
    for (const complexity of ['decouverte', 'equilibre', 'riche'] as Complexity[]) {
      for (let n = 5; n <= 40; n++) {
        for (let seed = 1; seed <= 4; seed++) {
          const c = generateComposition({ playerCount: n, expansions: ALL, complexity, seed, allowSolo: seed % 2 === 0 });
          expect(c.roles).toHaveLength(n);
          expect(c.roles).toContain('voyante');
          expect(Math.abs(balanceOf(c.roles))).toBeLessThanOrEqual(Math.max(3, Math.round(n / 3)));
          const errors = setupErrors(makeSetup(c.roles, { extra: c.extraCards }));
          expect(errors).toEqual([]);
        }
      }
    }
  });

  it('reste dans le jeu de base si seules les cartes de base sont choisies', () => {
    const c = generateComposition({ playerCount: 14, expansions: ['base'], complexity: 'riche', seed: 3 });
    expect(c.roles.every((r) => ['loup-garou', 'villageois', 'voyante', 'sorciere', 'chasseur', 'cupidon', 'petite-fille'].includes(r))).toBe(true);
  });

  it('intègre Voleur et Comédien avec leurs cartes hors jeu', () => {
    const c = generateComposition({ playerCount: 12, expansions: ALL, complexity: 'equilibre', seed: 9, include: ['voleur', 'comedien'] });
    expect(c.roles).toContain('voleur');
    expect(c.roles).toContain('comedien');
    expect(c.extraCards).toHaveLength(5);
    expect(setupErrors(makeSetup(c.roles, { extra: c.extraCards }))).toEqual([]);
  });

  it('fournit des explications', () => {
    const c = generateComposition({ playerCount: 10, expansions: ALL, complexity: 'equilibre', seed: 1 });
    expect(c.explanations.length).toBeGreaterThan(2);
  });
});
