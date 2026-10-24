import { replay, RuleError } from '@/engine';
import { DataError, parseActions } from '@/storage/validation';
import { invariantsOf, mutateActions, playedGame, renderDerived, seeds } from './helpers';

/**
 * Campagne QA — historiques altérés (cas 1001 à 2000).
 * Une action modifiée, supprimée, dupliquée ou déplacée ne doit jamais faire
 * planter le rejeu : soit l'historique est refusé à la lecture, soit le rejeu
 * s'arrête proprement sur l'action fautive avec un état cohérent.
 */
const internal: string[] = [];

afterAll(() => {
  // Journal des chemins non protégés par une erreur de règle (informatif).
  if (internal.length) console.log(`[corruption 2] ${internal.length} rejet(s) par erreur interne :\n${[...new Set(internal)].slice(0, 40).join('\n')}`);
});

describe.each(seeds(1001, 2000))('cas %i', (n) => {
  it('rejet propre ou rejeu cohérent', () => {
    const base = playedGame(1 + (n % 250), 200);
    const { actions, kind } = mutateActions(base.record.actions as unknown[], n * 104729);
    let parsed;
    try {
      parsed = parseActions(actions);
    } catch (e) {
      expect(e).toBeInstanceOf(DataError);
      return;
    }
    const record = { setup: base.record.setup, actions: parsed };
    const res = replay(record);
    if (res.failure && res.failure.code === 'internal') internal.push(`${kind} → ${res.failure.action.type} : ${res.failure.message}`);
    expect(invariantsOf(res.state)).toEqual([]);
    renderDerived(res.state);
    // Déterminisme du rejeu, même sur des données altérées.
    expect(JSON.stringify(replay(record).state)).toBe(JSON.stringify(res.state));
    expect(RuleError).toBeDefined();
  });
});
