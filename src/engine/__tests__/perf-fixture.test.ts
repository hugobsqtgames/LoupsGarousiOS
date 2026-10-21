import { writeFileSync } from 'node:fs';
import { GameDriver, makeSetup } from '../testing';
import type { RoleId } from '../types';

/** Génère une très longue partie (40 joueurs) pour les mesures E2E : PERF_FIXTURE=chemin.json */
const out = process.env.PERF_FIXTURE;
(out ? it : it.skip)('génère la partie de mesure', () => {
  const roles: RoleId[] = [...Array(6).fill('loup-garou'), 'voyante', 'sorciere', 'salvateur', 'chasseur', 'ancien', 'renard', 'corbeau'];
  while (roles.length < 40) roles.push('villageois');
  const setup = { ...makeSetup(roles, { variants: { mayorEnabled: false } }), id: 'perf-game', name: 'Partie de mesure (40 joueurs)', createdAt: new Date().toISOString() };
  const g = new GameDriver(setup);
  for (let day = 0; day < 8; day++) {
    const victim = g.state.players.find((p) => p.alive && p.team === 'village' && p.roleId === 'villageois');
    g.finishNight({ wolves: { target: victim?.id ?? null } });
    while (g.state.pending.length) g.resolvePending({ target: null, targets: [] });
    g.act({ type: 'dawn/confirm' });
    g.act({ type: 'ballot/open', kind: 'elimination', mode: 'tally' });
    const alive = g.state.players.filter((p) => p.alive);
    for (let i = 0; i < 120; i++) {
      g.act({ type: 'ballot/vote', target: alive[i % alive.length].id });
      g.act({ type: 'ballot/unvote', target: alive[i % alive.length].id });
    }
    const v = alive.find((p) => p.roleId === 'villageois')!;
    g.act({ type: 'ballot/vote', target: v.id }).act({ type: 'ballot/close' }).act({ type: 'ballot/confirm' });
    while (g.state.pending.length) g.resolvePending({ target: null, targets: [] });
    g.act({ type: 'day/end' });
  }
  writeFileSync(out!, JSON.stringify({ app: 'loups-garous-mj', exportVersion: 1, exportedAt: new Date().toISOString(), schemaVersion: 1, games: [g.record], compositions: [], customRoles: [], settings: {} }));
  console.log(`actions : ${g.record.actions.length}`);
});
