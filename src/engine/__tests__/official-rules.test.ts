import { canOpenBallot } from '../ballot';
import { eventDeck, firstEliminated, spiritualist } from '../events';
import { checkInvariants } from '../invariants';
import { validateCustomRole } from '../roles/custom';
import { validateSetup } from '../setup';
import { GameDriver, makeSetup } from '../testing';
import type { CustomRoleDef, GameSetup, RoleId } from '../types';

/**
 * Règles vérifiées dans les livrets officiels (jeu de base 2014, Nouvelle
 * Lune 2015, Personnages 2013, Best Of 2017, Le Village 2009) et nouvelles
 * fonctions : Gitane, cartes Événement, outils du MJ, mains levées,
 * conditions de victoire des rôles personnalisés.
 */

const fill = (special: RoleId[], wolves = 2, total = 9): RoleId[] => {
  const r: RoleId[] = [...Array(wolves).fill('loup-garou'), ...special];
  while (r.length < total) r.push('villageois');
  return r;
};

const nextDay = (g: GameDriver, wolvesTarget: string | null = null) =>
  g.act({ type: 'day/end' }).finishNight({ wolves: { target: wolvesTarget } }).act({ type: 'dawn/confirm' });

describe('Livrets officiels : protections et immunités', () => {
  it('la protection du Salvateur est sans effet sur la Petite Fille surprise', () => {
    const g = new GameDriver(makeSetup(fill(['petite-fille', 'salvateur'])));
    g.finishNight({ salvateur: { target: 'p3' }, wolves: { target: 'p6', littleGirlCaught: true } });
    expect(g.player('p3').alive).toBe(false);
    expect(g.player('p6').alive).toBe(true);
  });

  it('l’Ancien n’est pas affecté par l’infection : il perd une vie, l’Infect garde son pouvoir', () => {
    const g = new GameDriver(makeSetup(['infect', 'loup-garou', 'ancien', ...fill([], 0, 6)]));
    g.finishNight({ wolves: { target: 'p3' }, infect: { infect: true } });
    const elder = g.player('p3');
    expect(elder.alive).toBe(true);
    expect(elder.team).toBe('village');
    expect(elder.infected).toBe(false);
    expect(elder.uses.extraLife).toBe(0);
    expect(g.player('p1').uses.infect).toBe(1);
  });

  it('Chevalier dévoré par le Grand Méchant Loup : c’est ce loup, responsable, qui est maudit', () => {
    // Places : p1 loup, p2 Grand Méchant Loup, p3 Chevalier… le premier loup à gauche de p3 est p1.
    const g = new GameDriver(makeSetup(['loup-garou', 'grand-mechant-loup', 'chevalier', ...fill([], 0, 6)]));
    g.finishNight({ wolves: { target: 'p5' }, 'big-bad-wolf': { target: 'p3' } });
    expect(g.state.rustyCurse?.wolfId).toBe('p2');
  });

  it('Chevalier dévoré par la meute : premier loup à sa gauche', () => {
    const g = new GameDriver(makeSetup(['loup-garou', 'grand-mechant-loup', 'chevalier', ...fill([], 0, 6)]));
    g.finishNight({ wolves: { target: 'p3' }, 'big-bad-wolf': { target: null } });
    expect(g.state.rustyCurse?.wolfId).toBe('p1');
  });
});

describe('Livrets officiels : maire, Idiot, Ancien', () => {
  it('un Idiot maire révélé fait perdre définitivement le poste de maire', () => {
    const g = new GameDriver(makeSetup(fill(['idiot'])));
    g.finishNight({ wolves: { target: 'p9' } }).act({ type: 'dawn/confirm' });
    g.act({ type: 'ballot/open', kind: 'mayor', mode: 'tally' }).act({ type: 'ballot/vote', target: 'p3' }).act({ type: 'ballot/close' }).act({ type: 'ballot/confirm' });
    expect(g.state.mayorId).toBe('p3');
    g.eliminationVote(['p3', 'p3', 'p3']);
    expect(g.player('p3').idiotRevealed).toBe(true);
    expect(g.state.mayorId).toBeNull();
    expect(g.state.mayorAbolished).toBe(true);
    nextDay(g, 'p8');
    expect(canOpenBallot(g.state, 'mayor')).toMatch(/perdu définitivement/);
    expect(checkInvariants(g.state)).toEqual([]);
  });

  it('variante « pour les courageux » : l’Idiot révélé meurt avec l’Ancien tué par le village', () => {
    const g = new GameDriver(makeSetup(fill(['ancien', 'idiot']), { variants: { elderTakesIdiot: true, mayorEnabled: false } }));
    g.finishNight({ wolves: { target: 'p9' } }).act({ type: 'dawn/confirm' });
    g.eliminationVote(['p4', 'p4']);
    expect(g.player('p4').idiotRevealed).toBe(true);
    nextDay(g, 'p8');
    g.eliminationVote(['p3', 'p3']);
    expect(g.player('p3').alive).toBe(false);
    expect(g.player('p4').alive).toBe(false);
  });

  it('l’Ange amoureux renonce à sa victoire du premier tour', () => {
    const g = new GameDriver(makeSetup(fill(['ange', 'cupidon']), { variants: { angelStartsWithDay: false } }));
    g.finishNight({ cupid: { targets: ['p3', 'p5'] }, wolves: { target: 'p3' } });
    expect(g.player('p3').alive).toBe(false);
    expect(g.state.angelVictory).toBeNull();
    expect(g.state.victory?.winner).not.toBe('angel');
  });
});

describe('Livret Personnages : Servante dévouée', () => {
  it('le rôle repris se joue « comme une première nuit » ; le charme de la Servante disparaît', () => {
    const roles: RoleId[] = ['loup-garou', 'loup-garou', 'servante', 'enfant-sauvage', 'joueur-de-flute', 'villageois', 'villageois', 'villageois', 'villageois'];
    const g = new GameDriver(makeSetup(roles, { variants: { mayorEnabled: false } }));
    g.finishNight({ 'wild-child': { target: 'p6' }, piper: { targets: ['p3', 'p7'] }, wolves: { target: 'p8' } }).act({ type: 'dawn/confirm' });
    expect(g.player('p3').charmed).toBe(true);
    g.eliminationVote(['p4', 'p4']);
    g.resolvePending({ accept: true });
    const servant = g.player('p3');
    expect(servant.roleId).toBe('enfant-sauvage');
    expect(servant.charmed).toBe(false);
    expect(servant.wildChildModel).toBeNull();
    g.act({ type: 'day/end' });
    expect(g.steps().some((s) => s.kind === 'wild-child' && s.actorIds[0] === 'p3')).toBe(true);
  });

  it('une Servante maire perd son titre et désigne un successeur', () => {
    const g = new GameDriver(makeSetup(fill(['servante', 'chasseur'])));
    g.finishNight({ wolves: { target: 'p9' } }).act({ type: 'dawn/confirm' });
    g.act({ type: 'ballot/open', kind: 'mayor', mode: 'tally' }).act({ type: 'ballot/vote', target: 'p3' }).act({ type: 'ballot/close' }).act({ type: 'ballot/confirm' });
    g.eliminationVote(['p4', 'p4']);
    g.resolvePending({ accept: true });
    expect(g.state.pending[0]).toMatchObject({ kind: 'mayor-succession', fromPlayerId: 'p3' });
    g.resolvePending({ target: 'p6' });
    expect(g.state.mayorId).toBe('p6');
    expect(g.player('p3').roleId).toBe('chasseur');
  });

  it('une Servante infectée reste dans le camp des loups après la reprise', () => {
    const g = new GameDriver(makeSetup(['infect', 'loup-garou', 'servante', 'chasseur', ...fill([], 0, 5)], { variants: { mayorEnabled: false } }));
    g.finishNight({ wolves: { target: 'p3' }, infect: { infect: true } }).act({ type: 'dawn/confirm' });
    g.eliminationVote(['p4', 'p4']);
    g.resolvePending({ accept: true });
    expect(g.player('p3').roleId).toBe('chasseur');
    expect(g.player('p3').team).toBe('wolves');
  });

  it('reprise de l’Ange : il ne gagne pas s’il meurt ensuite', () => {
    const g = new GameDriver(makeSetup(fill(['servante', 'ange']), { variants: { mayorEnabled: false } }));
    expect(g.state.phase.kind).toBe('day');
    g.eliminationVote(['p4', 'p4']);
    expect(g.state.pending[0]?.kind).toBe('servant-offer');
    g.resolvePending({ accept: true });
    expect(g.state.angelVictory).toBeNull();
    expect(g.player('p3').team).toBe('village');
  });
});

describe('Variantes issues des livrets', () => {
  it('Grand Méchant Loup (livret Personnages) : la mort de l’Enfant sauvage lui fait perdre sa seconde victime', () => {
    const roles: RoleId[] = ['grand-mechant-loup', 'loup-garou', 'enfant-sauvage', ...fill([], 0, 6)];
    const strict = new GameDriver(makeSetup(roles, { variants: { bigBadWolfRule: 'wolf_or_ambiguous_died', mayorEnabled: false } }));
    strict.finishNight({ 'wild-child': { target: 'p5' }, wolves: { target: 'p3' }, 'big-bad-wolf': { target: null } }).act({ type: 'dawn/confirm' }).act({ type: 'day/end' });
    expect(strict.steps().some((s) => s.kind === 'big-bad-wolf')).toBe(false);
    const bestOf = new GameDriver(makeSetup(roles, { variants: { mayorEnabled: false } }));
    bestOf.finishNight({ 'wild-child': { target: 'p5' }, wolves: { target: 'p3' }, 'big-bad-wolf': { target: null } }).act({ type: 'dawn/confirm' }).act({ type: 'day/end' });
    expect(bestOf.steps().some((s) => s.kind === 'big-bad-wolf')).toBe(true);
  });

  it('Loup-Garou blanc : nuits impaires en variante', () => {
    const roles: RoleId[] = ['loup-blanc', ...fill([], 2, 9).slice(0, 8)];
    expect(new GameDriver(makeSetup(roles, { variants: { whiteWolfNights: 'odd' } })).steps().some((s) => s.kind === 'white-wolf')).toBe(true);
    expect(new GameDriver(makeSetup(roles)).steps().some((s) => s.kind === 'white-wolf')).toBe(false);
  });

  it('Deux Sœurs : réveil facultatif une nuit sur deux', () => {
    const roles = fill(['deux-soeurs', 'deux-soeurs']);
    const later = new GameDriver(makeSetup(roles, { variants: { siblingsWakeLater: true } }));
    later.finishNight({ wolves: { target: 'p9' } }).act({ type: 'dawn/confirm' }).act({ type: 'day/end' });
    expect(later.steps().some((s) => s.kind === 'sisters')).toBe(true);
    const normal = new GameDriver(makeSetup(roles));
    normal.finishNight({ wolves: { target: 'p9' } }).act({ type: 'dawn/confirm' }).act({ type: 'day/end' });
    expect(normal.steps().some((s) => s.kind === 'sisters')).toBe(false);
  });

  it('première nuit : signe du Juge bègue et repérage du Montreur d’ours', () => {
    const g = new GameDriver(makeSetup(fill(['juge-begue', 'montreur-ours'])));
    const kinds = g.steps().map((s) => s.kind);
    expect(kinds).toContain('judge');
    expect(kinds).toContain('bear-tamer');
    g.finishNight({ wolves: { target: 'p9' } }).act({ type: 'dawn/confirm' }).act({ type: 'day/end' });
    expect(g.steps().map((s) => s.kind)).not.toContain('judge');
  });
});

describe('Gitane', () => {
  it('fait poser une question au matin ; le premier éliminé répond ; chaque carte ne sert qu’une fois', () => {
    const g = new GameDriver(makeSetup(fill(['gitane']), { variants: { mayorEnabled: false } }));
    g.finishNight({ gypsy: { target: 'p5', cardIndex: 2, question: 3 }, wolves: { target: 'p6' } });
    const sp = g.state.dawnReport.find((e) => e.event.type === 'spiritualism');
    expect(sp?.event).toMatchObject({ type: 'spiritualism', source: 'gypsy', askerId: 'p5', answererId: 'p6', card: 2, question: 3 });
    expect(g.player('p3').uses.spirit).toBe(4);
    g.act({ type: 'dawn/confirm' }).act({ type: 'day/end' });
    expect(g.tryAct({ type: 'night/submit', stepKey: g.stepKey('gypsy'), payload: { target: 'p5', cardIndex: 2, question: 1 } })).toBe('gypsy-card-used');
    expect(g.tryAct({ type: 'night/submit', stepKey: g.stepKey('gypsy'), payload: { target: 'p5', cardIndex: 6, question: 1 } })).toBe('gypsy-card');
    g.submit('gypsy', { target: null });
    expect(g.player('p3').uses.spirit).toBe(4);
  });

  it('les cartes Spiritisme sont retirées de la pioche des événements', () => {
    const g = new GameDriver(makeSetup(fill(['gitane']), { variants: { newMoonEvents: true } }));
    expect(eventDeck(g.state).some((c) => c.id.startsWith('spiritisme'))).toBe(false);
    expect(eventDeck(g.state)).toHaveLength(31);
  });
});

describe('Cartes Événement (Nouvelle Lune)', () => {
  const eventsGame = (roles = fill(['voyante'])) => {
    const g = new GameDriver(makeSetup(roles, { variants: { newMoonEvents: true, mayorEnabled: false } }));
    g.finishNight({ wolves: { target: 'p9' } }).act({ type: 'dawn/confirm' });
    return g;
  };

  it('aucun tirage le premier matin, un seul par matin, chaque carte une fois', () => {
    const g = eventsGame();
    expect(g.tryAct({ type: 'event/draw', cardId: 'miracle' })).toBe('event-draw');
    g.eliminationVote(['p8', 'p8']);
    nextDay(g, 'p7');
    g.act({ type: 'event/draw', cardId: 'lundi-morose' });
    expect(g.tryAct({ type: 'event/draw', cardId: 'miracle' })).toBe('event-draw');
    expect(eventDeck(g.state).some((c) => c.id === 'lundi-morose')).toBe(false);
    expect(g.state.log.some((e) => e.event.type === 'event-drawn' && e.event.readerId === 'p7')).toBe(true);
  });

  it('Spiritisme : Spirite à gauche du dernier éliminé, réponse du premier éliminé', () => {
    const g = eventsGame();
    g.eliminationVote(['p8', 'p8']);
    nextDay(g, 'p5');
    expect(firstEliminated(g.state)).toBe('p9');
    expect(spiritualist(g.state)).toBe('p6');
    g.act({ type: 'event/draw', cardId: 'spiritisme-1' });
    const sp = g.state.log.find((e) => e.event.type === 'spiritualism');
    expect(sp?.event).toMatchObject({ source: 'event', askerId: 'p6', answererId: 'p9' });
  });

  it('Pile ou face : le condamné peut être gracié, uniquement avec l’événement', () => {
    const g = eventsGame();
    g.act({ type: 'ballot/open', kind: 'elimination', mode: 'tally' }).act({ type: 'ballot/vote', target: 'p8' }).act({ type: 'ballot/close' });
    expect(g.tryAct({ type: 'ballot/confirm', spared: true })).toBe('spare-event');
    g.act({ type: 'ballot/confirm' });
    nextDay(g, 'p7');
    g.act({ type: 'event/draw', cardId: 'pile-ou-face' });
    g.act({ type: 'ballot/open', kind: 'elimination', mode: 'tally' }).act({ type: 'ballot/vote', target: 'p6' }).act({ type: 'ballot/close' }).act({ type: 'ballot/confirm', spared: true });
    expect(g.player('p6').alive).toBe(true);
    expect(canOpenBallot(g.state, 'elimination')).not.toBeNull();
  });

  it('Retour de flamme : un Simple Villageois désigné devient loup', () => {
    const g = eventsGame();
    g.eliminationVote(['p8', 'p8']);
    nextDay(g, 'p7');
    g.act({ type: 'event/draw', cardId: 'retour-de-flamme' }).act({ type: 'day/end' });
    g.finishNight({ wolves: { target: 'p6' } });
    expect(g.player('p6').alive).toBe(true);
    expect(g.player('p6').team).toBe('wolves');
  });

  it('Retour de flamme : sinon la victime survit et le premier loup à sa gauche est foudroyé', () => {
    const g = eventsGame();
    g.eliminationVote(['p8', 'p8']);
    nextDay(g, 'p7');
    g.act({ type: 'event/draw', cardId: 'retour-de-flamme' }).act({ type: 'day/end' });
    g.finishNight({ wolves: { target: 'p3' } }); // Voyante : à sa gauche p4…p6, puis p1 (loup).
    expect(g.player('p3').alive).toBe(true);
    expect(g.player('p1').alive).toBe(false);
    expect(g.player('p1').death?.cause).toBe('event');
  });

  it('outils du MJ : vote supplémentaire, destitution du maire, retour en jeu, changement de camp, potion rendue', () => {
    const g = new GameDriver(makeSetup(fill(['sorciere', 'cupidon'])));
    g.finishNight({ cupid: { targets: ['p5', 'p6'] }, wolves: { target: 'p5' }, witch: { heal: null, poison: 'p7' } }).act({ type: 'dawn/confirm' });
    expect(g.player('p6').alive).toBe(false);
    g.act({ type: 'mj/revive', playerId: 'p5', asVillager: true });
    expect(g.player('p5').alive).toBe(true);
    expect(g.state.lovers).toBeNull();
    g.act({ type: 'mj/grant-use', playerId: 'p3', key: 'poison' });
    expect(g.player('p3').uses.poison).toBe(1);
    expect(g.tryAct({ type: 'mj/grant-use', playerId: 'p3', key: 'heal' })).toBe('grant-available');
    g.act({ type: 'mj/set-team', playerId: 'p8', team: 'wolves' });
    expect(g.player('p8').team).toBe('wolves');
    g.act({ type: 'ballot/open', kind: 'mayor', mode: 'tally' }).act({ type: 'ballot/vote', target: 'p9' }).act({ type: 'ballot/close' }).act({ type: 'ballot/confirm' });
    g.act({ type: 'mj/remove-mayor' });
    expect(g.state.mayorId).toBeNull();
    g.eliminationVote(['p9']);
    expect(canOpenBallot(g.state, 'elimination')).not.toBeNull();
    g.act({ type: 'mj/extra-vote' });
    expect(canOpenBallot(g.state, 'elimination')).toBeNull();
    expect(checkInvariants(g.state)).toEqual([]);
  });
});

describe('Vote à main levée (saisie du nombre de voix)', () => {
  it('produit des opérations +/− unitaires et respecte le nombre de votants', () => {
    const g = new GameDriver(makeSetup(fill([]), { variants: { mayorEnabled: false } }));
    g.finishNight({ wolves: { target: 'p9' } }).act({ type: 'dawn/confirm' });
    g.act({ type: 'ballot/open', kind: 'elimination', mode: 'tally' });
    g.act({ type: 'ballot/set-count', target: 'p5', count: 3 });
    const b = () => g.state.ballots[g.state.ballots.length - 1];
    expect(b().ops.filter((o) => o.type === 'add')).toHaveLength(3);
    g.act({ type: 'ballot/set-count', target: 'p5', count: 1 });
    expect(b().ops.filter((o) => o.type === 'remove')).toHaveLength(2);
    // 8 votants vivants : 1 déjà compté, 8 de plus dépasseraient le plafond ; rien n'est appliqué.
    const before = b().ops.length;
    expect(g.tryAct({ type: 'ballot/set-count', target: 'p6', count: 8 })).toBe('too-many-votes');
    expect(b().ops.length).toBe(before);
    g.act({ type: 'ballot/set-count', target: 'p6', count: 7 });
    expect(g.tryAct({ type: 'ballot/set-count', target: 'p6', count: -1 })).toBe('bad-count');
  });

  it('refusée en mode nominatif', () => {
    const g = new GameDriver(makeSetup(fill([]), { variants: { mayorEnabled: false } }));
    g.finishNight({ wolves: { target: 'p9' } }).act({ type: 'dawn/confirm' });
    g.act({ type: 'ballot/open', kind: 'elimination', mode: 'nominal' });
    expect(g.tryAct({ type: 'ballot/set-count', target: 'p5', count: 2 })).toBe('tally-only');
  });
});

describe('Rôles personnalisés : conditions de victoire « comme dans les règles »', () => {
  const role = (over: Partial<CustomRoleDef>): CustomRoleDef => ({
    id: 'custom:solo',
    name: 'Solitaire',
    team: 'solo',
    description: '',
    nightAction: 'none',
    schedule: 'every_night',
    uses: null,
    canTargetSelf: false,
    onDeath: 'none',
    wakeOrder: 75,
    ...over,
  });
  const withCustom = (def: CustomRoleDef, roles: RoleId[], extra: Partial<GameSetup> = {}) => {
    const setup = { ...makeSetup(roles, { variants: { mayorEnabled: false } }), customRoles: [def], ...extra };
    return new GameDriver(setup);
  };

  it('validation : un solitaire doit avoir une condition propre, cohérente avec son action', () => {
    expect(validateCustomRole({ ...role({}), winCondition: 'camp' }).ok).toBe(false);
    expect(validateCustomRole(role({ team: 'village', winCondition: 'last-survivor' })).ok).toBe(false);
    expect(validateCustomRole(role({ winCondition: 'all-marked', nightAction: 'inspect' })).ok).toBe(false);
    expect(validateCustomRole(role({ winCondition: 'all-marked', nightAction: 'mark' })).ok).toBe(true);
    expect(validateCustomRole({ ...role({}), winCondition: 'pirate' }).ok).toBe(false);
    // Ancien format sans condition : accepté (solitaire → dernier survivant).
    expect(validateCustomRole(role({})).ok).toBe(true);
  });

  it('dernier survivant (comme le Loup-Garou blanc)', () => {
    const def = role({ winCondition: 'last-survivor' });
    const g = withCustom(def, ['loup-garou', 'custom:solo', 'villageois', 'villageois', 'villageois']);
    g.finishNight({ wolves: { target: 'p3' } }).act({ type: 'dawn/confirm' });
    for (const id of ['p4', 'p5', 'p1']) g.act({ type: 'mj/eliminate', playerId: id });
    expect(g.state.victory).toMatchObject({ winner: 'custom', customRoleId: 'custom:solo', winners: ['p2'] });
  });

  it('tous les survivants marqués (comme le Joueur de flûte)', () => {
    const def = role({ winCondition: 'all-marked', nightAction: 'mark' });
    const g = withCustom(def, ['loup-garou', 'custom:solo', 'villageois', 'villageois', 'villageois']);
    g.finishNight({ custom: { target: 'p3' }, wolves: { target: 'p4' } }).act({ type: 'dawn/confirm' });
    expect(g.player('p3').markedBy).toEqual(['p2']);
    g.act({ type: 'day/end' }).finishNight({ custom: { target: 'p5' }, wolves: { target: null } });
    g.act({ type: 'dawn/confirm' }).act({ type: 'day/end' }).finishNight({ custom: { target: 'p1' }, wolves: { target: null } });
    expect(g.state.victory).toMatchObject({ winner: 'custom', winners: ['p2'] });
  });

  it('éliminé au premier tour (comme l’Ange)', () => {
    const def = role({ winCondition: 'first-round-death' });
    const g = withCustom(def, ['loup-garou', 'loup-garou', 'custom:solo', ...fill([], 0, 6)]);
    g.finishNight({ wolves: { target: 'p3' } });
    expect(g.state.victory).toMatchObject({ winner: 'custom', winners: ['p3'] });
  });

  it('éliminé au premier tour : passé ce tour, il devient villageois', () => {
    const def = role({ winCondition: 'first-round-death' });
    const g = withCustom(def, ['loup-garou', 'loup-garou', 'custom:solo', ...fill([], 0, 6)]);
    g.finishNight({ wolves: { target: 'p9' } }).act({ type: 'dawn/confirm' }).act({ type: 'day/end' });
    expect(g.player('p3').team).toBe('village');
  });

  it('groupe opposé éliminé (comme l’Abominable sectaire) : groupes obligatoires', () => {
    const def = role({ winCondition: 'opposite-group' });
    const roles: RoleId[] = ['loup-garou', 'custom:solo', 'villageois', 'villageois', 'villageois'];
    const setup = { ...makeSetup(roles), customRoles: [def] };
    expect(validateSetup(setup).some((i) => i.code === 'custom-groups')).toBe(true);
    const groups = { p1: 'B', p2: 'A', p3: 'A', p4: 'B', p5: 'B' } as const;
    const g = withCustom(def, roles, { sectGroups: groups });
    g.finishNight({ wolves: { target: 'p4' } }).act({ type: 'dawn/confirm' });
    g.act({ type: 'mj/eliminate', playerId: 'p5' }).act({ type: 'mj/eliminate', playerId: 'p1' });
    expect(g.state.victory).toMatchObject({ winner: 'custom', winners: ['p2'] });
  });
});
