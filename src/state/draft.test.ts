import { setupErrors } from '@/engine';
import { applyAutoComposition, buildSetup, cardCount, draftFromSetup, draftIssues, emptyDraft, extraCardsOf, randomAssignments, remainingCards, rolesFromCounts, type Draft } from './draft';

function withPlayers(n: number): Draft {
  return { ...emptyDraft(undefined, 7), players: Array.from({ length: n }, (_, i) => ({ id: `p${i}`, name: `Joueur ${i}` })) };
}

describe('brouillon de partie', () => {
  it('la composition automatique produit une partie valide', () => {
    for (const n of [5, 8, 12, 20, 40]) {
      const d = applyAutoComposition(withPlayers(n));
      expect(cardCount(d)).toBe(n);
      expect(draftIssues(d, []).filter((i) => i.level === 'error')).toEqual([]);
      expect(setupErrors(buildSetup(d, 'g', '2026-10-21T10:00:00.000Z', []))).toEqual([]);
    }
  });

  it('signale un écart entre cartes et joueurs', () => {
    const d = { ...withPlayers(6), roleCounts: { 'loup-garou': 1, villageois: 3 } };
    expect(draftIssues(d, []).map((i) => i.code)).toContain('card-count');
  });

  it('attribution manuelle : cartes restantes et joueurs sans carte', () => {
    const d: Draft = { ...withPlayers(5), roleCounts: { 'loup-garou': 1, voyante: 1, villageois: 3 }, assignMode: 'manual', assignments: { p0: 'loup-garou', p1: 'villageois' } };
    expect(remainingCards(d)).toEqual({ 'loup-garou': 0, voyante: 1, villageois: 2 });
    expect(draftIssues(d, []).map((i) => i.code)).toContain('manual-missing');
  });

  it('le tirage aléatoire est reproductible et distribue toutes les cartes', () => {
    const players = withPlayers(8).players;
    const roles = rolesFromCounts({ 'loup-garou': 2, voyante: 1, villageois: 5 });
    const a = randomAssignments(players, roles, 3);
    expect(a).toEqual(randomAssignments(players, roles, 3));
    expect(Object.values(a).sort()).toEqual([...roles].sort());
  });

  it('ajoute les cartes hors jeu du Voleur et du Comédien', () => {
    const d: Draft = { ...withPlayers(8), roleCounts: { 'loup-garou': 2, voleur: 1, comedien: 1, villageois: 4 } };
    expect(extraCardsOf(d)).toHaveLength(5);
    expect(draftIssues(d, []).filter((i) => i.level === 'error')).toEqual([]);
  });

  it('rejouer une partie reprend joueurs, composition et variantes', () => {
    const d = applyAutoComposition(withPlayers(10));
    const setup = buildSetup({ ...d, name: 'Soirée' }, 'g1', '2026-10-21T10:00:00.000Z', []);
    const again = draftFromSetup(setup, 99);
    expect(again.players.map((p) => p.name)).toEqual(setup.players.map((p) => p.name));
    expect(rolesFromCounts(again.roleCounts).sort()).toEqual(Object.values(setup.assignments).sort());
    expect(again.variants).toEqual(setup.variants);
  });
});
