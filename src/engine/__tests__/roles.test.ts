import { GameDriver, makeSetup } from '../testing';
import { checkInvariants } from '../invariants';
import { validateSetup } from '../setup';
import type { CustomRoleDef, RoleId } from '../types';

const fill = (special: RoleId[], wolves = 2, total = 9): RoleId[] => {
  const r: RoleId[] = [...Array(wolves).fill('loup-garou'), ...special];
  while (r.length < total) r.push('villageois');
  return r;
};

describe('Salvateur', () => {
  it('bloque l’attaque des loups mais pas la potion de mort', () => {
    const g = new GameDriver(makeSetup(fill(['salvateur', 'sorciere'])));
    g.finishNight({ salvateur: { target: 'p5' }, wolves: { target: 'p5' }, witch: { heal: null, poison: 'p6' } });
    expect(g.player('p5').alive).toBe(true);
    expect(g.player('p6').alive).toBe(false);
  });

  it('ne protège pas la même personne deux nuits de suite', () => {
    const g = new GameDriver(makeSetup(fill(['salvateur'])));
    g.finishNight({ salvateur: { target: 'p5' }, wolves: { target: 'p6' } }).act({ type: 'dawn/confirm' }).act({ type: 'day/end' });
    expect(g.tryAct({ type: 'night/submit', stepKey: g.stepKey('salvateur'), payload: { target: 'p5' } })).toBe('salvateur-repeat');
    g.submit('salvateur', { target: 'p3' });
  });

  it('variante : interdiction de se protéger soi-même', () => {
    const g = new GameDriver(makeSetup(fill(['salvateur']), { variants: { salvateurSelf: false } }));
    expect(g.tryAct({ type: 'night/submit', stepKey: g.stepKey('salvateur'), payload: { target: 'p3' } })).toBe('salvateur-self');
  });
});

describe('Ancien', () => {
  it('survit à la première attaque, meurt à la seconde', () => {
    const g = new GameDriver(makeSetup(fill(['ancien'])));
    g.finishNight({ wolves: { target: 'p3' } });
    expect(g.player('p3').alive).toBe(true);
    expect(g.player('p3').uses.extraLife).toBe(0);
    g.act({ type: 'dawn/confirm' }).act({ type: 'day/end' }).finishNight({ wolves: { target: 'p3' } });
    expect(g.player('p3').alive).toBe(false);
  });

  it('une attaque bloquée ne consomme pas sa vie', () => {
    const g = new GameDriver(makeSetup(fill(['ancien', 'salvateur'])));
    g.finishNight({ salvateur: { target: 'p3' }, wolves: { target: 'p3' } });
    expect(g.player('p3').uses.extraLife).toBe(1);
  });

  it('tué par le vote : les villageois perdent leurs pouvoirs', () => {
    const g = new GameDriver(makeSetup(fill(['ancien', 'voyante', 'chasseur'])));
    g.finishNight({ wolves: { target: 'p9' } }).act({ type: 'dawn/confirm' });
    g.eliminationVote(['p3', 'p3']);
    expect(g.state.villagePowersLost).toBe(true);
    g.act({ type: 'day/end' });
    const seer = g.steps().find((s) => s.roleId === 'voyante');
    expect(seer?.bluff).toBe(true);
    g.finishNight({ wolves: { target: 'p5' } });
    // Le Chasseur a perdu son tir.
    expect(g.player('p5').alive).toBe(false);
    expect(g.state.pending).toEqual([]);
  });

  it('variante « vote seulement » : empoisonné, pas de vengeance', () => {
    const g = new GameDriver(makeSetup(fill(['ancien', 'sorciere']), { variants: { elderVengeance: 'vote_only' } }));
    g.finishNight({ wolves: { target: null }, witch: { heal: null, poison: 'p3' } });
    expect(g.player('p3').alive).toBe(false);
    expect(g.state.villagePowersLost).toBe(false);
  });
});

describe('Renard et Montreur d’ours (voisinage)', () => {
  // Places : p1 loup, p2 loup, p3 renard, p4..p9 villageois (p9 voisin de p1)
  it('le Renard garde son flair s’il trouve un loup, le perd sinon', () => {
    const g = new GameDriver(makeSetup(fill(['renard'])));
    g.finishNight({ fox: { target: 'p9' }, wolves: { target: 'p6' } });
    expect(g.player('p3').foxPowerLost).toBe(false);
    g.act({ type: 'dawn/confirm' }).act({ type: 'day/end' });
    g.finishNight({ fox: { target: 'p5' }, wolves: { target: 'p7' } });
    expect(g.player('p3').foxPowerLost).toBe(true);
    g.act({ type: 'dawn/confirm' }).act({ type: 'day/end' });
    expect(g.steps().find((s) => s.roleId === 'renard')?.bluff).toBe(true);
  });

  it('l’ours grogne si un voisin vivant est un loup, en sautant les morts', () => {
    const g = new GameDriver(makeSetup(['villageois', 'montreur-ours', 'villageois', 'loup-garou', 'villageois', 'villageois', 'villageois', 'loup-garou']));
    g.finishNight({ wolves: { target: 'p5' } });
    const bear = g.state.dawnReport.find((e) => e.event.type === 'bear');
    expect(bear?.event).toMatchObject({ growled: false });
    g.act({ type: 'dawn/confirm' });
    g.eliminationVote(['p3', 'p3']);
    g.act({ type: 'day/end' }).finishNight({ wolves: { target: 'p6' } });
    const bear2 = g.state.dawnReport.find((e) => e.event.type === 'bear');
    expect(bear2?.event).toMatchObject({ growled: true });
  });
});

describe('Chevalier à l’épée rouillée', () => {
  it('le premier loup à sa gauche meurt la nuit suivante', () => {
    // p1 chevalier, p2 villageois, p3 loup (premier loup à gauche), p9 loup
    const roles: RoleId[] = ['chevalier', 'villageois', 'loup-garou', 'villageois', 'villageois', 'villageois', 'villageois', 'villageois', 'loup-garou'];
    const g = new GameDriver(makeSetup(roles));
    g.finishNight({ wolves: { target: 'p1' } });
    expect(g.state.rustyCurse).toEqual({ wolfId: 'p3', night: 2 });
    g.act({ type: 'dawn/confirm' }).act({ type: 'day/end' });
    g.finishNight({ wolves: { target: 'p4' } });
    expect(g.player('p3').alive).toBe(false);
    expect(g.player('p3').death?.cause).toBe('rusty-sword');
    expect(g.player('p4').alive).toBe(false);
  });
});

describe('Enfant sauvage et Chien-loup', () => {
  it('l’Enfant sauvage devient loup à la mort de son modèle', () => {
    const g = new GameDriver(makeSetup(fill(['enfant-sauvage'])));
    g.finishNight({ 'wild-child': { target: 'p5' }, wolves: { target: 'p5' } });
    expect(g.player('p3').team).toBe('wolves');
    g.act({ type: 'dawn/confirm' }).act({ type: 'day/end' });
    expect(g.steps().find((s) => s.kind === 'wolves')?.actorIds).toContain('p3');
  });

  it('variante : seulement si le modèle est tué par les loups', () => {
    const g = new GameDriver(makeSetup(fill(['enfant-sauvage']), { variants: { wildChildTrigger: 'wolves_only' } }));
    g.finishNight({ 'wild-child': { target: 'p5' }, wolves: { target: 'p6' } }).act({ type: 'dawn/confirm' });
    g.eliminationVote(['p5', 'p5']);
    expect(g.player('p3').team).toBe('village');
  });

  it('le Chien-loup qui choisit les loups chasse dès la première nuit', () => {
    const g = new GameDriver(makeSetup(fill(['chien-loup'])));
    g.submit('wolfhound', { team: 'wolves' });
    expect(g.steps().find((s) => s.kind === 'wolves')?.actorIds).toEqual(['p1', 'p2', 'p3']);
  });
});

describe('Voleur', () => {
  it('prend une carte hors jeu et joue ce rôle immédiatement', () => {
    const g = new GameDriver(makeSetup(fill(['voleur']), { extra: ['voyante', 'villageois'] }));
    expect(g.steps()[0].kind).toBe('thief');
    g.submit('thief', { cardIndex: 0 });
    expect(g.player('p3').roleId).toBe('voyante');
    expect(g.steps().find((s) => s.kind === 'seer')?.actorIds).toEqual(['p3']);
  });

  it('doit prendre un loup si les deux cartes sont des loups', () => {
    const g = new GameDriver(makeSetup(fill(['voleur'], 1), { extra: ['loup-garou', 'loup-garou'] }));
    expect(g.tryAct({ type: 'night/submit', stepKey: g.stepKey('thief'), payload: { cardIndex: null } })).toBe('thief-must-take');
    g.submit('thief', { cardIndex: 1 });
    expect(g.player('p2').team).toBe('wolves');
  });

  it('corriger le choix du Voleur invalide les choix dépendants', () => {
    const g = new GameDriver(makeSetup(fill(['voleur']), { extra: ['voyante', 'villageois'] }));
    g.submit('thief', { cardIndex: 0 }).submit('seer', { target: 'p1' });
    expect(Object.keys(g.state.night!.choices)).toContain('seer:p3');
    g.act({ type: 'night/submit', stepKey: 'thief:p3', payload: { cardIndex: 1 } });
    expect(Object.keys(g.state.night!.choices)).not.toContain('seer:p3');
    expect(g.player('p3').roleId).toBe('villageois');
    expect(checkInvariants(g.state)).toEqual([]);
  });

  it('exige deux cartes hors jeu', () => {
    const issues = validateSetup(makeSetup(fill(['voleur'])));
    expect(issues.some((i) => i.code === 'extra-count')).toBe(true);
  });
});

describe('Loups spéciaux', () => {
  it('Infect Père des Loups : la victime rejoint les loups, une seule fois', () => {
    const g = new GameDriver(makeSetup(fill(['infect'], 1)));
    g.finishNight({ wolves: { target: 'p5' }, infect: { infect: true } });
    expect(g.player('p5').alive).toBe(true);
    expect(g.player('p5').team).toBe('wolves');
    expect(g.player('p5').infected).toBe(true);
    g.act({ type: 'dawn/confirm' }).act({ type: 'day/end' });
    expect(g.steps().some((s) => s.kind === 'infect' && !s.bluff)).toBe(false);
    expect(g.steps().find((s) => s.kind === 'wolves')?.actorIds).toContain('p5');
  });

  it('Infect : impossible sur une victime protégée', () => {
    const g = new GameDriver(makeSetup(fill(['infect', 'salvateur'], 1)));
    g.submit('salvateur', { target: 'p5' }).submit('wolves', { target: 'p5' });
    expect(g.tryAct({ type: 'night/submit', stepKey: g.stepKey('infect'), payload: { infect: true } })).toBe('infect-protected');
  });

  it('Infect : le Joueur de flûte infecté perd son pouvoir', () => {
    const g = new GameDriver(makeSetup(fill(['infect', 'joueur-de-flute'], 1)));
    g.finishNight({ wolves: { target: 'p3' }, infect: { infect: true } });
    expect(g.player('p3').powersLost).toBe(true);
  });

  it('Grand Méchant Loup : seconde victime tant qu’aucun loup n’est mort', () => {
    const g = new GameDriver(makeSetup(fill(['grand-mechant-loup'], 1, 10)));
    g.finishNight({ wolves: { target: 'p5' }, 'big-bad-wolf': { target: 'p6' } });
    expect(g.player('p5').alive).toBe(false);
    expect(g.player('p6').alive).toBe(false);
    g.act({ type: 'dawn/confirm' });
    g.eliminationVote(['p1', 'p1', 'p1']);
    g.act({ type: 'day/end' });
    expect(g.steps().some((s) => s.kind === 'big-bad-wolf')).toBe(false);
  });

  it('Grand Méchant Loup : ne cible ni un loup ni la victime de la meute', () => {
    const g = new GameDriver(makeSetup(fill(['grand-mechant-loup'], 1, 10)));
    g.submit('wolves', { target: 'p5' });
    expect(g.tryAct({ type: 'night/submit', stepKey: g.stepKey('big-bad-wolf'), payload: { target: 'p5' } })).toBe('bbw-same');
    expect(g.tryAct({ type: 'night/submit', stepKey: g.stepKey('big-bad-wolf'), payload: { target: 'p1' } })).toBe('bbw-wolf');
  });

  it('Loup-Garou blanc : agit les nuits paires, gagne seul', () => {
    const g = new GameDriver(makeSetup(['loup-garou', 'loup-blanc', 'villageois', 'villageois', 'villageois', 'villageois', 'villageois']));
    expect(g.steps().some((s) => s.kind === 'white-wolf')).toBe(false);
    g.finishNight({ wolves: { target: 'p3' } }).act({ type: 'dawn/confirm' });
    g.eliminationVote(['p4', 'p4']);
    g.act({ type: 'day/end' });
    expect(g.steps().some((s) => s.kind === 'white-wolf')).toBe(true);
    expect(g.tryAct({ type: 'night/submit', stepKey: g.stepKey('white-wolf'), payload: { target: 'p5' } })).toBe('white-not-wolf');
    g.finishNight({ wolves: { target: 'p5' }, 'white-wolf': { target: 'p1' } }).act({ type: 'dawn/confirm' });
    expect(g.player('p1').alive).toBe(false);
    expect(g.state.victory).toBeNull();
    g.eliminationVote(['p6']);
    g.act({ type: 'day/end' }).finishNight({ wolves: { target: 'p7' } });
    expect(g.state.victory?.winner).toBe('white-wolf');
  });
});

describe('Solitaires', () => {
  it('Joueur de flûte : gagne quand tous les survivants sont charmés', () => {
    const g = new GameDriver(makeSetup(['loup-garou', 'joueur-de-flute', 'villageois', 'villageois', 'villageois']));
    g.finishNight({ wolves: { target: 'p5' }, piper: { targets: ['p1', 'p3'] } }).act({ type: 'dawn/confirm' });
    expect(g.state.victory).toBeNull();
    g.act({ type: 'day/end' });
    expect(g.tryAct({ type: 'night/submit', stepKey: g.stepKey('piper'), payload: { targets: ['p1'] } })).toBe('piper-charmed');
    g.finishNight({ wolves: { target: 'p3' }, piper: { targets: ['p4'] } });
    expect(g.state.victory?.winner).toBe('piper');
  });

  it('Ange : la partie commence le jour ; gagne s’il est éliminé au premier vote', () => {
    const g = new GameDriver(makeSetup(fill(['ange'])));
    expect(g.state.phase).toEqual({ kind: 'day', number: 1 });
    g.eliminationVote(['p3', 'p3']);
    expect(g.state.victory?.winner).toBe('angel');
  });

  it('Ange : devient villageois après le premier tour', () => {
    const g = new GameDriver(makeSetup(fill(['ange'])));
    g.eliminationVote(['p4', 'p4']);
    g.act({ type: 'day/end' }).finishNight({ wolves: { target: 'p5' } }).act({ type: 'dawn/confirm' });
    expect(g.player('p3').team).toBe('village');
    g.eliminationVote(['p3', 'p3']);
    expect(g.state.victory).toBeNull();
  });

  it('Abominable sectaire : gagne quand l’autre groupe est éliminé', () => {
    const groups: Record<string, 'A' | 'B'> = { p1: 'B', p2: 'A', p3: 'B', p4: 'A', p5: 'A' };
    const g = new GameDriver(makeSetup(['loup-garou', 'sectaire', 'villageois', 'villageois', 'villageois'], { sectGroups: groups }));
    g.finishNight({ wolves: { target: 'p3' } }).act({ type: 'dawn/confirm' });
    g.eliminationVote(['p1', 'p1']);
    expect(g.state.victory?.winner).toBe('sectarian');
  });

  it('Abominable sectaire : groupes obligatoires', () => {
    const issues = validateSetup(makeSetup(['loup-garou', 'sectaire', 'villageois', 'villageois', 'villageois']));
    expect(issues.some((i) => i.code === 'sect-groups')).toBe(true);
  });
});

describe('Comédien', () => {
  it('emprunte une carte pour la nuit, qui est ensuite retirée', () => {
    const g = new GameDriver(makeSetup(fill(['comedien']), { extra: ['voyante', 'salvateur', 'sorciere'] }));
    g.submit('comedian', { cardIndex: 0 });
    expect(g.steps().find((s) => s.kind === 'seer')?.actorIds).toEqual(['p3']);
    g.finishNight({ seer: { target: 'p1' }, wolves: { target: 'p5' } });
    expect(g.state.comedianCards).toEqual(['salvateur', 'sorciere']);
    expect(g.player('p3').comedianRole).toBeNull();
    g.act({ type: 'dawn/confirm' }).act({ type: 'day/end' });
    g.submit('comedian', { cardIndex: 1 });
    expect(g.steps().find((s) => s.kind === 'witch')?.actorIds).toEqual(['p3']);
    g.finishNight({ wolves: { target: 'p6' }, witch: { heal: 'p6', poison: null } });
    expect(g.player('p6').alive).toBe(true);
    expect(g.player('p3').uses.heal).toBeUndefined();
  });

  it('refuse une carte non autorisée', () => {
    const issues = validateSetup(makeSetup(fill(['comedien']), { extra: ['chasseur', 'salvateur', 'sorciere'] }));
    expect(issues.some((i) => i.code === 'comedian-card')).toBe(true);
  });
});

describe('Petite Fille', () => {
  it('surprise, elle meurt à la place de la victime', () => {
    const g = new GameDriver(makeSetup(fill(['petite-fille'])));
    g.finishNight({ wolves: { target: 'p5', littleGirlCaught: true } });
    expect(g.player('p3').alive).toBe(false);
    expect(g.player('p5').alive).toBe(true);
  });
});

describe('Rôles personnalisés', () => {
  const guard: CustomRoleDef = {
    id: 'custom:garde',
    name: 'Garde',
    team: 'village',
    description: 'Protège un joueur.',
    nightAction: 'protect',
    schedule: 'every_night',
    uses: 2,
    canTargetSelf: false,
    onDeath: 'shoot',
    wakeOrder: 52,
  };

  it('protège, consomme ses utilisations et tire à sa mort', () => {
    const setup = makeSetup(fill(['custom:garde']));
    setup.customRoles = [guard];
    const g = new GameDriver(setup);
    expect(g.tryAct({ type: 'night/submit', stepKey: g.stepKey('custom'), payload: { target: 'p3' } })).toBe('custom-self');
    g.finishNight({ custom: { target: 'p5' }, wolves: { target: 'p5' } });
    expect(g.player('p5').alive).toBe(true);
    expect(g.player('p3').uses.custom).toBe(1);
    g.act({ type: 'dawn/confirm' }).act({ type: 'day/end' });
    g.finishNight({ custom: { target: 'p6' }, wolves: { target: 'p3' } });
    expect(g.state.pending[0].kind).toBe('custom-shot');
    g.resolvePending({ target: 'p1' });
    expect(g.player('p1').alive).toBe(false);
  });

  it('un tueur personnalisé est bloqué par le Salvateur', () => {
    const killer: CustomRoleDef = { ...guard, id: 'custom:assassin', name: 'Assassin', team: 'solo', nightAction: 'kill', uses: null, onDeath: 'none', wakeOrder: 75 };
    const setup = makeSetup(fill(['custom:assassin', 'salvateur']));
    setup.customRoles = [killer];
    const g = new GameDriver(setup);
    g.finishNight({ salvateur: { target: 'p6' }, custom: { target: 'p6' }, wolves: { target: 'p7' } });
    expect(g.player('p6').alive).toBe(true);
    expect(g.player('p7').alive).toBe(false);
  });
});

describe('Appels pour la forme', () => {
  it('appelle les rôles morts pour ne rien révéler (variante active)', () => {
    const g = new GameDriver(makeSetup(fill(['voyante'])));
    g.finishNight({ wolves: { target: 'p3' } }).act({ type: 'dawn/confirm' }).act({ type: 'day/end' });
    const seer = g.steps().find((s) => s.roleId === 'voyante');
    expect(seer).toMatchObject({ kind: 'bluff', bluff: true });
  });

  it('variante désactivée : aucun appel factice', () => {
    const g = new GameDriver(makeSetup(fill(['voyante']), { variants: { callInactiveRoles: false } }));
    g.finishNight({ wolves: { target: 'p3' } }).act({ type: 'dawn/confirm' }).act({ type: 'day/end' });
    expect(g.steps().some((s) => s.bluff)).toBe(false);
  });
});
