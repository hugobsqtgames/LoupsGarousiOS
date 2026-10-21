import { fuzzGame } from '../fuzz';

// Statistiques de couverture du fuzzing (affichées, non bloquantes sauf violations).
it('statistiques du fuzzing', () => {
  const winners: Record<string, number> = {};
  let tried = 0, applied = 0, rejected = 0, undos = 0;
  const t0 = Date.now();
  for (let seed = 1001; seed <= 1100; seed++) {
    const r = fuzzGame(seed);
    tried += r.actionsTried; applied += r.actionsApplied; rejected += r.rejected; undos += r.undos;
    winners[r.winner ?? 'non terminée'] = (winners[r.winner ?? 'non terminée'] ?? 0) + 1;
    expect(r.violations).toEqual([]);
  }
  console.log(JSON.stringify({ ms: Date.now() - t0, tried, applied, rejected, undos, winners }, null, 1));
});
