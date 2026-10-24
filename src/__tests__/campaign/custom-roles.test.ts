import { fuzzPlay, replay, setupErrors } from '@/engine';
import { persistRoundTrip, renderDerived, seeds } from './helpers';

/**
 * Campagne QA — rôles personnalisés (déclaratifs) : 1 à 3 rôles aléatoires
 * valides par partie (camp, action nocturne, calendrier, utilisations, effet
 * à la mort, condition de victoire), joués aléatoirement.
 */
let withCustom = 0;
afterAll(() => {
  // Le générateur doit réellement produire des rôles personnalisés.
  expect(withCustom).toBeGreaterThan(550);
});

describe.each(seeds(1, 600))('graine %i', (seed) => {
  it('invariants, victoire cohérente, rejeu identique après relecture', () => {
    const { report, record, state } = fuzzPlay(20_000 + seed, 300, {}, 1 + (seed % 3));
    // Rares petites compositions sans carte remplaçable : partie jouée sans rôle personnalisé.
    withCustom += record.setup.customRoles.length > 0 ? 1 : 0;
    const errors = setupErrors(record.setup);
    // Une composition refusée par la validation ne doit de toute façon pas planter.
    expect(report.violations).toEqual([]);
    const res = replay(persistRoundTrip(record));
    expect(res.failure).toBeNull();
    expect(JSON.stringify(res.state)).toBe(JSON.stringify(state));
    renderDerived(res.state);
    if (state.victory?.winner === 'custom') expect(state.setup.customRoles.map((r) => r.id)).toContain(state.victory.customRoleId);
    expect(Array.isArray(errors)).toBe(true);
  });
});
