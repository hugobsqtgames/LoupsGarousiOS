import { GameDriver, makeSetup } from '../testing';
import { validateSetup } from '../setup';
import { checkInvariants } from '../invariants';
import { describeEntry } from '../format';

const classic = () =>
  makeSetup(['loup-garou', 'loup-garou', 'voyante', 'sorciere', 'chasseur', 'cupidon', 'villageois', 'villageois'], {
    names: ['Alice', 'Bruno', 'Chloé', 'David', 'Emma', 'Farid', 'Gaëlle', 'Hugo'],
  });

describe('démarrage et ordre de la nuit', () => {
  it('valide une composition classique sans erreur', () => {
    expect(validateSetup(classic()).filter((i) => i.level === 'error')).toEqual([]);
  });

  it('commence par la nuit 1 avec les étapes dans l’ordre officiel', () => {
    const g = new GameDriver(classic());
    expect(g.state.phase).toEqual({ kind: 'night', number: 1 });
    expect(g.steps().map((s) => s.kind)).toEqual(['cupid', 'seer', 'wolves', 'witch']);
  });

  it('ajoute l’étape des Amoureux après le choix de Cupidon', () => {
    const g = new GameDriver(classic());
    g.submit('cupid', { targets: ['p7', 'p8'] });
    expect(g.steps().map((s) => s.kind)).toEqual(['cupid', 'lovers', 'seer', 'wolves', 'witch']);
    expect(g.state.lovers).toEqual(['p7', 'p8']);
  });

  it('refuse la résolution tant que des étapes manquent', () => {
    const g = new GameDriver(classic());
    expect(g.tryAct({ type: 'night/resolve' })).toBe('steps-missing');
  });
});

describe('résolution de la nuit', () => {
  it('la victime des loups meurt à l’aube', () => {
    const g = new GameDriver(classic());
    g.finishNight({ wolves: { target: 'p7' } });
    expect(g.state.phase).toEqual({ kind: 'dawn', number: 1 });
    expect(g.player('p7').alive).toBe(false);
    expect(g.player('p7').death?.cause).toBe('wolves');
  });

  it('un loup ne peut pas dévorer un loup', () => {
    const g = new GameDriver(classic());
    g.submit('cupid', { targets: ['p7', 'p8'] }).act({ type: 'night/submit', stepKey: 'lovers', payload: {} }).submit('seer', { target: null });
    expect(g.tryAct({ type: 'night/submit', stepKey: 'wolves', payload: { target: 'p2' } })).toBe('wolf-on-wolf');
  });

  it('la potion de vie sauve la victime et n’est utilisable qu’une fois', () => {
    const g = new GameDriver(classic());
    g.finishNight({ wolves: { target: 'p7' }, witch: { heal: 'p7', poison: null } });
    expect(g.player('p7').alive).toBe(true);
    expect(g.player('p4').uses.heal).toBe(0);
    expect(g.state.dawnReport.some((e) => e.event.type === 'attack-blocked')).toBe(true);
    g.act({ type: 'dawn/confirm' }).act({ type: 'day/end' });
    g.submit('seer', { target: null }).submit('wolves', { target: 'p8' });
    expect(g.tryAct({ type: 'night/submit', stepKey: g.stepKey('witch'), payload: { heal: 'p8' } })).toBe('heal-used');
  });

  it('la potion de vie ne vise qu’un joueur attaqué', () => {
    const g = new GameDriver(classic());
    g.submit('cupid', { targets: ['p7', 'p8'] }).act({ type: 'night/submit', stepKey: 'lovers', payload: {} });
    g.submit('seer', { target: null }).submit('wolves', { target: 'p7' });
    expect(g.tryAct({ type: 'night/submit', stepKey: g.stepKey('witch'), payload: { heal: 'p6' } })).toBe('heal-not-attacked');
  });

  it('la potion de mort tue et ignore les protections', () => {
    const g = new GameDriver(classic());
    g.finishNight({ wolves: { target: null }, witch: { heal: null, poison: 'p1' } });
    expect(g.player('p1').alive).toBe(false);
    expect(g.player('p1').death?.cause).toBe('poison');
  });

  it('les Amoureux meurent ensemble (une seule fois chacun)', () => {
    const g = new GameDriver(classic());
    g.finishNight({ cupid: { targets: ['p6', 'p7'] }, wolves: { target: 'p7' }, witch: { heal: null, poison: 'p6' } });
    expect(g.player('p6').alive).toBe(false);
    expect(g.player('p7').alive).toBe(false);
    const deaths = g.state.log.filter((e) => e.event.type === 'death');
    expect(deaths).toHaveLength(2);
    expect(checkInvariants(g.state)).toEqual([]);
  });

  it('la mort du Chasseur ouvre une décision de tir, puis la chaîne continue', () => {
    const g = new GameDriver(classic());
    g.finishNight({ cupid: { targets: ['p7', 'p8'] }, wolves: { target: 'p5' } });
    expect(g.state.pending.map((d) => d.kind)).toEqual(['hunter-shot']);
    expect(g.tryAct({ type: 'dawn/confirm' })).toBe('pending');
    g.resolvePending({ target: 'p7' });
    expect(g.player('p7').alive).toBe(false);
    expect(g.player('p8').death?.cause).toBe('heartbreak');
    expect(g.state.pending).toEqual([]);
    g.act({ type: 'dawn/confirm' });
    expect(g.state.phase).toEqual({ kind: 'day', number: 1 });
  });
});

describe('conditions de victoire', () => {
  it('le village gagne quand le dernier loup meurt, après résolution des décisions', () => {
    const g = new GameDriver(makeSetup(['loup-garou', 'chasseur', 'villageois', 'villageois', 'villageois']));
    g.finishNight({ wolves: { target: 'p3' } }).act({ type: 'dawn/confirm' });
    g.eliminationVote(['p1', 'p1', 'p1']);
    expect(g.player('p1').alive).toBe(false);
    expect(g.state.victory?.winner).toBe('village');
    expect(g.tryAct({ type: 'day/end' })).toBe('game-won');
    g.act({ type: 'game/finish' });
    expect(g.state.phase).toEqual({ kind: 'ended' });
  });

  it('pas de victoire calculée tant que le tir du Chasseur est en attente', () => {
    const g = new GameDriver(makeSetup(['loup-garou', 'chasseur', 'villageois', 'villageois', 'villageois']));
    g.finishNight({ wolves: { target: 'p3' } }).act({ type: 'dawn/confirm' });
    g.eliminationVote(['p4', 'p4', 'p4']);
    g.act({ type: 'day/end' });
    g.finishNight({ wolves: { target: 'p2' } });
    // 2 vivants : loup + villageois → les loups ne gagnent pas encore (le Chasseur doit tirer)
    expect(g.state.victory).toBeNull();
    g.resolvePending({ target: 'p1' });
    expect(g.state.victory?.winner).toBe('village');
  });

  it('les loups gagnent quand il ne reste que des loups', () => {
    const g = new GameDriver(makeSetup(['loup-garou', 'loup-garou', 'villageois', 'villageois', 'villageois'], { variants: { mayorEnabled: false } }));
    g.finishNight({ wolves: { target: 'p3' } }).act({ type: 'dawn/confirm' });
    g.eliminationVote(['p4', 'p4']);
    g.act({ type: 'day/end' }).finishNight({ wolves: { target: 'p5' } });
    expect(g.state.victory?.winner).toBe('wolves');
    expect(g.state.victory?.winners.sort()).toEqual(['p1', 'p2']);
  });

  it('un couple mixte gagne s’il est seul survivant', () => {
    const g = new GameDriver(makeSetup(['loup-garou', 'cupidon', 'villageois', 'villageois', 'villageois']));
    g.finishNight({ cupid: { targets: ['p1', 'p3'] }, wolves: { target: 'p4' } }).act({ type: 'dawn/confirm' });
    g.eliminationVote(['p5', 'p5']);
    expect(g.state.victory).toBeNull();
    g.act({ type: 'day/end' }).finishNight({ wolves: { target: 'p2' } });
    expect(g.state.victory?.winner).toBe('lovers');
  });

  it('personne ne gagne si tout le monde meurt', () => {
    const g = new GameDriver(makeSetup(['loup-garou', 'sorciere', 'villageois', 'villageois', 'villageois']));
    g.finishNight({ wolves: { target: 'p3' } }).act({ type: 'dawn/confirm' });
    for (const id of ['p4', 'p5']) {
      g.act({ type: 'mj/eliminate', playerId: id });
    }
    g.act({ type: 'day/end' }).finishNight({ wolves: { target: 'p2' }, witch: { heal: null, poison: 'p1' } });
    expect(g.state.victory?.winner).toBe('none');
  });
});

describe('formatage', () => {
  it('masque les informations secrètes sur demande', () => {
    const g = new GameDriver(classic());
    g.finishNight({ wolves: { target: 'p7' } });
    const death = g.state.dawnReport.find((e) => e.event.type === 'death')!;
    expect(describeEntry(g.state, death)).toContain('Simple Villageois');
    expect(describeEntry(g.state, death, true)).toContain('rôle masqué');
  });
});
