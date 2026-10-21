import { Timeline } from '../timeline';
import { replay } from '../replay';
import { fuzzGame } from '../fuzz';
import { GameDriver, makeSetup } from '../testing';

function longGame() {
  const g = new GameDriver(makeSetup(['loup-garou', 'loup-garou', 'voyante', 'sorciere', 'villageois', 'villageois', 'villageois', 'villageois', 'villageois', 'villageois'], { variants: { mayorEnabled: false } }));
  g.finishNight({ wolves: { target: 'p5' } }).act({ type: 'dawn/confirm' });
  g.act({ type: 'ballot/open', kind: 'elimination', mode: 'tally' });
  for (let i = 0; i < 60; i++) g.act({ type: 'ballot/vote', target: 'p6' }).act({ type: 'ballot/unvote', target: 'p6' });
  return g;
}

describe('Timeline (points de contrôle)', () => {
  it('chaque annulation donne le même état qu’un rejeu complet', () => {
    const g = longGame();
    const { timeline, failure } = Timeline.load(g.record);
    expect(failure).toBeNull();
    for (let k = 0; k < 45; k++) {
      timeline.undo();
      const ref = replay(timeline.record);
      expect(JSON.stringify(timeline.state)).toBe(JSON.stringify(ref.state));
    }
  });

  it('les actions après un retour arrière repartent proprement', () => {
    const g = longGame();
    const { timeline } = Timeline.load(g.record);
    timeline.rewindTo(10);
    expect(timeline.length).toBe(10);
    for (let i = 0; i < 30; i++) {
      const r = timeline.dispatch({ type: 'night/resolve' });
      if (!r.ok) break;
    }
    expect(JSON.stringify(timeline.state)).toBe(JSON.stringify(replay(timeline.record).state));
  });

  it('charge un enregistrement corrompu jusqu’à la dernière action valide', () => {
    const g = longGame();
    const bad = { setup: g.record.setup, actions: [...g.record.actions.slice(0, 8), { action: { type: 'ballot/vote' as const, target: 'inconnu' }, at: '' }, ...g.record.actions.slice(8)] };
    const { timeline, failure } = Timeline.load(bad);
    expect(failure?.index).toBe(8);
    expect(timeline.length).toBe(8);
  });

  it('reste équivalent au rejeu sur des parties aléatoires (annulations et retours arrière aléatoires)', () => {
    for (let seed = 1; seed <= 20; seed++) {
      expect(fuzzGame(seed).violations).toEqual([]);
    }
  });
});
