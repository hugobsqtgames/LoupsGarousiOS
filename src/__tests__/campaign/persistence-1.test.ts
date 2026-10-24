import { cloneState, replay, ReplayCursor, rewindTo, createRng } from '@/engine';
import { describeAll, invariantsOf, persistRoundTrip, playedGame, renderDerived, seeds } from './helpers';

/**
 * Campagne QA — persistance et rejeu (graines 1 à 500).
 * Pour chaque partie aléatoire : ce qui est écrit puis relu (JSON + validateurs)
 * se rejoue exactement à l'identique, les retours en arrière correspondent au
 * rejeu d'un préfixe, et tout l'affichage dérivé fonctionne sans exception.
 */
describe.each(seeds(1, 500))('graine %i', (seed) => {
  it('relecture disque → rejeu identique, invariants, affichage', () => {
    const { record, state } = playedGame(seed);
    const reread = persistRoundTrip(record);
    const res = replay(reread);
    expect(res.failure).toBeNull();
    expect(JSON.stringify(res.state)).toBe(JSON.stringify(state));
    expect(invariantsOf(res.state)).toEqual([]);
    expect(renderDerived(res.state)).toBeGreaterThan(0);
    describeAll(record, res.state);
    // Le clonage ne partage aucun état mutable avec l'original.
    const c = cloneState(res.state);
    expect(JSON.stringify(c)).toBe(JSON.stringify(res.state));
  });

  it('retour en arrière = rejeu du préfixe (lecteur pas à pas compris)', () => {
    const { record } = playedGame(seed);
    const rng = createRng(seed * 31 + 7);
    const cursor = new ReplayCursor(record);
    for (let t = 0; t < 3; t++) {
      const k = Math.floor(rng() * (record.actions.length + 1));
      const a = rewindTo(record, k).state;
      const b = replay({ setup: record.setup, actions: record.actions.slice(0, k) }).state;
      expect(JSON.stringify(a)).toBe(JSON.stringify(b));
      expect(JSON.stringify(cursor.stateAt(k))).toBe(JSON.stringify(b));
      expect(invariantsOf(a)).toEqual([]);
    }
  });
});
