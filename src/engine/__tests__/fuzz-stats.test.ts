import { fuzzGame } from '../fuzz';

// Statistiques de couverture du fuzzing (affichées, non bloquantes sauf violations).
it('statistiques du fuzzing', () => {
  const winners: Record<string, number> = {};
  let tried = 0, applied = 0, rejected = 0, undos = 0;
  const types: Record<string, number> = {};
  const kinds: Record<string, number> = {};
  const t0 = Date.now();
  for (let seed = 1001; seed <= 1100; seed++) {
    const r = fuzzGame(seed);
    tried += r.actionsTried; applied += r.actionsApplied; rejected += r.rejected; undos += r.undos;
    winners[r.winner ?? 'non terminée'] = (winners[r.winner ?? 'non terminée'] ?? 0) + 1;
    expect(r.violations).toEqual([]);
    for (const [k, v] of Object.entries(r.appliedTypes)) types[k] = (types[k] ?? 0) + v;
    for (const [k, v] of Object.entries(r.stepKinds)) kinds[k] = (kinds[k] ?? 0) + v;
  }
  console.log(JSON.stringify({ ms: Date.now() - t0, tried, applied, rejected, undos, winners, types, kinds }, null, 1));
  // Les actions ajoutées doivent être réellement appliquées (pas seulement rejetées).
  for (const t of ['ballot/set-count', 'event/draw', 'mj/extra-vote', 'mj/revive', 'mj/set-team', 'mj/remove-mayor']) {
    expect(types[t] ?? 0).toBeGreaterThan(0);
  }
});
