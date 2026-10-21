import { replaceAction, replay, rewindTo, undo } from '../replay';
import { GameDriver, makeSetup } from '../testing';
import { activeBallot } from '../selectors';
import { countBallot } from '../ballot';

const roles = ['loup-garou', 'loup-garou', 'voyante', 'sorciere', 'chasseur', 'villageois', 'villageois', 'villageois'] as const;

function played() {
  const g = new GameDriver(makeSetup([...roles]));
  g.finishNight({ wolves: { target: 'p6' } }).act({ type: 'dawn/confirm' });
  g.act({ type: 'ballot/open', kind: 'elimination', mode: 'tally' });
  g.act({ type: 'ballot/vote', target: 'p1' }).act({ type: 'ballot/vote', target: 'p1' }).act({ type: 'ballot/vote', target: 'p7' });
  return g;
}

describe('rejeu et déterminisme', () => {
  it('rejouer l’historique reproduit exactement le même état', () => {
    const g = played();
    const r = replay(g.record);
    expect(r.failure).toBeNull();
    expect(JSON.stringify(r.state)).toBe(JSON.stringify(g.state));
  });

  it('annuler successivement revient à l’état initial', () => {
    const g = played();
    let rec = g.record;
    while (rec.actions.length > 0) rec = undo(rec)!.record;
    expect(undo(rec)).toBeNull();
    const r = replay(rec);
    expect(r.state.phase).toEqual({ kind: 'night', number: 1 });
  });

  it('revenir à un point de l’historique', () => {
    const g = played();
    const nightActions = g.record.actions.findIndex((a) => a.action.type === 'night/resolve');
    const r = rewindTo(g.record, nightActions);
    expect(r.state.phase.kind).toBe('night');
    expect(r.state.players.every((p) => p.alive)).toBe(true);
  });
});

describe('correction d’une action passée', () => {
  it('modifier la victime des loups recalcule l’aube et la suite', () => {
    const g = played();
    const idx = g.record.actions.findIndex((a) => a.action.type === 'night/submit' && a.action.stepKey === 'wolves');
    const res = replaceAction(g.record, idx, { type: 'night/submit', stepKey: 'wolves', payload: { target: 'p8' } });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.state.players.find((p) => p.id === 'p6')!.alive).toBe(true);
    expect(res.state.players.find((p) => p.id === 'p8')!.alive).toBe(false);
    expect(countBallot(activeBallot(res.state)!).tallies).toMatchObject({ p1: 2, p7: 1 });
  });

  it('une correction qui rend une action ultérieure invalide est signalée sans rien appliquer', () => {
    const g = played();
    const idx = g.record.actions.findIndex((a) => a.action.type === 'night/submit' && a.action.stepKey === 'wolves');
    // Si p7 meurt la nuit, le vote contre p7 devient impossible.
    const res = replaceAction(g.record, idx, { type: 'night/submit', stepKey: 'wolves', payload: { target: 'p7' } });
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.failure.code).toBe('dead-target');
    expect(res.truncated.actions.length).toBe(res.failure.index);
    expect(replay(res.truncated).failure).toBeNull();
  });
});
