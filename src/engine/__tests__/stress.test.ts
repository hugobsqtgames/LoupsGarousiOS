import { GameDriver, makeSetup } from '../testing';
import { replay } from '../replay';
import { checkInvariants } from '../invariants';
import type { RoleId } from '../types';

/** Tests de stress : grandes parties, longues séquences, corrections répétées. */
describe('stress', () => {
  it('partie à 40 joueurs avec milliers d’opérations de vote, rejouée rapidement', () => {
    const roles: RoleId[] = [...Array(6).fill('loup-garou'), 'voyante', 'sorciere', 'salvateur', 'chasseur', 'ancien', 'renard', 'corbeau'];
    while (roles.length < 40) roles.push('villageois');
    const g = new GameDriver(makeSetup(roles, { variants: { mayorEnabled: false } }));
    const t0 = Date.now();
    let day = 0;
    while (!g.state.victory && day < 30) {
      const victim = g.state.players.find((p) => p.alive && p.team === 'village' && p.roleId !== 'ancien');
      g.finishNight({ wolves: { target: victim?.id ?? null } });
      while (g.state.pending.length) g.resolvePending({ target: null, targets: [] });
      if (g.state.victory) break;
      g.act({ type: 'dawn/confirm' });
      g.act({ type: 'ballot/open', kind: 'elimination', mode: 'tally' });
      const alive = g.state.players.filter((p) => p.alive);
      // 200 corrections successives (+/−) avant le vote final.
      for (let i = 0; i < 100; i++) {
        g.act({ type: 'ballot/vote', target: alive[i % alive.length].id });
        g.act({ type: 'ballot/unvote', target: alive[i % alive.length].id });
      }
      const wolf = alive.find((p) => p.team === 'wolves')!;
      g.act({ type: 'ballot/vote', target: wolf.id }).act({ type: 'ballot/close' }).act({ type: 'ballot/confirm' });
      while (g.state.pending.length) g.resolvePending({ target: null, targets: [] });
      if (!g.state.victory) g.act({ type: 'day/end' });
      day++;
    }
    const playMs = Date.now() - t0;
    expect(g.state.victory?.winner).toBe('village');
    expect(checkInvariants(g.state)).toEqual([]);
    const t1 = Date.now();
    const r = replay(g.record);
    const replayMs = Date.now() - t1;
    expect(r.failure).toBeNull();
    expect(JSON.stringify(r.state)).toBe(JSON.stringify(g.state));
    const size = JSON.stringify(g.record).length;
    console.log(JSON.stringify({ actions: g.record.actions.length, playMs, replayMs, recordBytes: size, logEntries: g.state.log.length }));
    expect(replayMs).toBeLessThan(5000);
  });
});
