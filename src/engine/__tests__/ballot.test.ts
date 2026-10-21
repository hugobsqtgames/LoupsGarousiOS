import { countBallot } from '../ballot';
import { activeBallot } from '../selectors';
import { GameDriver, makeSetup } from '../testing';
import { checkInvariants } from '../invariants';
import { undo } from '../replay';
import type { Variants } from '../types';

const roles = ['loup-garou', 'loup-garou', 'voyante', 'villageois', 'villageois', 'villageois', 'villageois', 'villageois'] as const;

function dayOne(variants: Partial<Variants> = {}, r: readonly string[] = roles) {
  const g = new GameDriver(makeSetup([...r] as never, { variants }));
  g.finishNight({ wolves: { target: 'p8' } }).act({ type: 'dawn/confirm' });
  return g;
}

describe('élection du maire', () => {
  it('enregistre candidats, voix et élit le maire', () => {
    const g = dayOne();
    g.act({ type: 'ballot/open', kind: 'mayor', mode: 'tally' });
    g.act({ type: 'ballot/candidate', playerId: 'p3', add: true });
    g.act({ type: 'ballot/candidate', playerId: 'p4', add: true });
    expect(activeBallot(g.state)!.candidates).toEqual(['p3', 'p4']);
    for (const t of ['p3', 'p3', 'p4', 'p3']) g.act({ type: 'ballot/vote', target: t });
    expect(countBallot(activeBallot(g.state)!).tallies).toEqual({ p3: 3, p4: 1 });
    expect(g.tryAct({ type: 'ballot/vote', target: 'p5' })).toBe('not-eligible');
    g.act({ type: 'ballot/close' }).act({ type: 'ballot/confirm' });
    expect(g.state.mayorId).toBe('p3');
    expect(g.tryAct({ type: 'ballot/open', kind: 'mayor' })).toBe('cannot-open');
  });

  it('ne retire pas un candidat qui a des voix', () => {
    const g = dayOne();
    g.act({ type: 'ballot/open', kind: 'mayor', mode: 'tally', candidates: ['p3', 'p4'] });
    g.act({ type: 'ballot/vote', target: 'p4' });
    expect(g.tryAct({ type: 'ballot/candidate', playerId: 'p4', add: false })).toBe('candidate-has-votes');
    g.act({ type: 'ballot/unvote', target: 'p4' }).act({ type: 'ballot/candidate', playerId: 'p4', add: false });
    expect(activeBallot(g.state)!.candidates).toEqual(['p3']);
  });

  it('égalité : second tour puis décision du MJ', () => {
    const g = dayOne();
    g.act({ type: 'ballot/open', kind: 'mayor', mode: 'tally', candidates: ['p3', 'p4'] });
    g.act({ type: 'ballot/vote', target: 'p3' }).act({ type: 'ballot/vote', target: 'p4' });
    g.act({ type: 'ballot/close' });
    expect(activeBallot(g.state)!.result!.outcome.kind).toBe('runoff');
    g.act({ type: 'ballot/confirm' });
    const runoff = activeBallot(g.state)!;
    expect(runoff.round).toBe(2);
    expect(runoff.candidates).toEqual(['p3', 'p4']);
    g.act({ type: 'ballot/vote', target: 'p3' }).act({ type: 'ballot/vote', target: 'p4' }).act({ type: 'ballot/close' }).act({ type: 'ballot/confirm' });
    expect(g.state.pending[0].kind).toBe('mj-tiebreak');
    g.resolvePending({ target: 'p4' });
    expect(g.state.mayorId).toBe('p4');
  });

  it('variante « pas de maire » en cas d’égalité', () => {
    const g = dayOne({ mayorTie: 'no_mayor' });
    g.act({ type: 'ballot/open', kind: 'mayor', mode: 'tally', candidates: ['p3', 'p4'] });
    g.act({ type: 'ballot/vote', target: 'p3' }).act({ type: 'ballot/vote', target: 'p4' }).act({ type: 'ballot/close' }).act({ type: 'ballot/confirm' });
    expect(g.state.mayorId).toBeNull();
  });

  it('succession : le maire mourant désigne son successeur', () => {
    const g = dayOne();
    g.act({ type: 'ballot/open', kind: 'mayor', candidates: ['p4'] }).act({ type: 'ballot/vote', target: 'p4' }).act({ type: 'ballot/close' }).act({ type: 'ballot/confirm' });
    g.eliminationVote(['p1', 'p1', 'p1']);
    g.act({ type: 'day/end' }).finishNight({ wolves: { target: 'p4' } });
    expect(g.state.pending[0].kind).toBe('mayor-succession');
    expect(checkInvariants(g.state)).toEqual([]);
    g.resolvePending({ target: 'p5' });
    expect(g.state.mayorId).toBe('p5');
  });

  it('succession par nouvelle élection (variante)', () => {
    const g = dayOne({ mayorSuccession: 'election' });
    g.act({ type: 'ballot/open', kind: 'mayor', candidates: ['p4'] }).act({ type: 'ballot/vote', target: 'p4' }).act({ type: 'ballot/close' }).act({ type: 'ballot/confirm' });
    g.eliminationVote(['p1', 'p1', 'p1']);
    g.act({ type: 'day/end' }).finishNight({ wolves: { target: 'p4' } });
    expect(g.state.pending).toEqual([]);
    expect(g.state.mayorId).toBeNull();
    g.act({ type: 'dawn/confirm' });
    expect(g.tryAct({ type: 'ballot/open', kind: 'mayor' })).toBeNull();
  });
});

describe('vote d’élimination (mode compteur)', () => {
  it('ajoute et retire des voix, sans passer sous zéro', () => {
    const g = dayOne();
    g.act({ type: 'ballot/open', kind: 'elimination', mode: 'tally' });
    g.act({ type: 'ballot/vote', target: 'p1' }).act({ type: 'ballot/vote', target: 'p1' }).act({ type: 'ballot/unvote', target: 'p1' });
    expect(countBallot(activeBallot(g.state)!).tallies.p1).toBe(1);
    g.act({ type: 'ballot/unvote', target: 'p1' });
    expect(g.tryAct({ type: 'ballot/unvote', target: 'p1' })).toBe('no-vote-to-remove');
  });

  it('refuse plus de voix que de votants', () => {
    const g = dayOne();
    g.act({ type: 'ballot/open', kind: 'elimination', mode: 'tally' });
    const voters = activeBallot(g.state)!.voters.length;
    expect(voters).toBe(7);
    for (let i = 0; i < voters; i++) g.act({ type: 'ballot/vote', target: 'p1' });
    expect(g.tryAct({ type: 'ballot/vote', target: 'p2' })).toBe('too-many-votes');
  });

  it('refuse un vote contre un joueur mort', () => {
    const g = dayOne();
    g.act({ type: 'ballot/open', kind: 'elimination', mode: 'tally' });
    expect(g.tryAct({ type: 'ballot/vote', target: 'p8' })).toBe('dead-target');
  });

  it('le vote du maire compte double et départage', () => {
    const g = dayOne();
    g.act({ type: 'ballot/open', kind: 'mayor', candidates: ['p4'] }).act({ type: 'ballot/vote', target: 'p4' }).act({ type: 'ballot/close' }).act({ type: 'ballot/confirm' });
    g.act({ type: 'ballot/open', kind: 'elimination', mode: 'tally' });
    g.act({ type: 'ballot/vote', target: 'p1' }).act({ type: 'ballot/vote', target: 'p1' }).act({ type: 'ballot/vote', target: 'p2' });
    g.act({ type: 'ballot/vote', target: 'p2', voterId: 'p4' });
    const c = countBallot(activeBallot(g.state)!);
    expect(c.tallies).toMatchObject({ p1: 2, p2: 3 });
    expect(c.cast).toBe(4);
    g.act({ type: 'ballot/close' });
    expect(activeBallot(g.state)!.result!.outcome).toEqual({ kind: 'eliminated', playerId: 'p2' });
  });

  it('égalité avec maire : le maire tranche', () => {
    const g = dayOne({ mayorVoteWeight: 1 });
    g.act({ type: 'ballot/open', kind: 'mayor', candidates: ['p4'] }).act({ type: 'ballot/vote', target: 'p4' }).act({ type: 'ballot/close' }).act({ type: 'ballot/confirm' });
    g.act({ type: 'ballot/open', kind: 'elimination', mode: 'tally' });
    g.act({ type: 'ballot/vote', target: 'p1' }).act({ type: 'ballot/vote', target: 'p2' }).act({ type: 'ballot/close' }).act({ type: 'ballot/confirm' });
    expect(g.state.pending[0]).toMatchObject({ kind: 'mayor-tiebreak', candidates: ['p1', 'p2'] });
    expect(g.tryAct({ type: 'decision/resolve', decisionId: g.state.pending[0].id, payload: { target: 'p3' } })).toBe('tiebreak-candidate');
    g.resolvePending({ target: 'p1' });
    expect(g.player('p1').alive).toBe(false);
  });

  it('égalité sans maire : second vote, puis personne si l’égalité persiste', () => {
    const g = dayOne({ mayorEnabled: false });
    g.act({ type: 'ballot/open', kind: 'elimination', mode: 'tally' });
    g.act({ type: 'ballot/vote', target: 'p1' }).act({ type: 'ballot/vote', target: 'p2' }).act({ type: 'ballot/close' }).act({ type: 'ballot/confirm' });
    const runoff = activeBallot(g.state)!;
    expect(runoff.candidates).toEqual(['p1', 'p2']);
    expect(g.tryAct({ type: 'ballot/vote', target: 'p3' })).toBe('not-eligible');
    g.act({ type: 'ballot/vote', target: 'p1' }).act({ type: 'ballot/vote', target: 'p2' }).act({ type: 'ballot/close' });
    expect(activeBallot(g.state)!.result!.outcome).toEqual({ kind: 'none', reason: 'tie' });
    g.act({ type: 'ballot/confirm' });
    expect(g.state.players.filter((p) => !p.alive)).toHaveLength(1);
    expect(g.tryAct({ type: 'ballot/open', kind: 'elimination' })).toBe('cannot-open');
    g.act({ type: 'day/end' });
  });

  it('variante : égalité → personne', () => {
    const g = dayOne({ eliminationTie: 'none' });
    g.act({ type: 'ballot/open', kind: 'elimination', mode: 'tally' });
    g.act({ type: 'ballot/vote', target: 'p1' }).act({ type: 'ballot/vote', target: 'p2' }).act({ type: 'ballot/close' });
    expect(activeBallot(g.state)!.result!.outcome.kind).toBe('none');
  });

  it('aucune voix : personne n’est éliminé', () => {
    const g = dayOne();
    g.act({ type: 'ballot/open', kind: 'elimination' }).act({ type: 'ballot/close' });
    expect(activeBallot(g.state)!.result!.outcome).toEqual({ kind: 'none', reason: 'no-votes' });
  });

  it('votes blancs comptés mais sans effet ; désactivables', () => {
    const g = dayOne();
    g.act({ type: 'ballot/open', kind: 'elimination', mode: 'tally' });
    g.act({ type: 'ballot/vote', target: 'blank' }).act({ type: 'ballot/vote', target: 'p1' });
    const c = countBallot(activeBallot(g.state)!);
    expect(c.blank).toBe(1);
    expect(c.cast).toBe(2);
    const g2 = dayOne({ allowBlankVotes: false });
    g2.act({ type: 'ballot/open', kind: 'elimination' });
    expect(g2.tryAct({ type: 'ballot/vote', target: 'blank' })).toBe('no-blank');
  });

  it('rouvrir un scrutin clôturé pour corriger une voix', () => {
    const g = dayOne();
    g.act({ type: 'ballot/open', kind: 'elimination', mode: 'tally' });
    g.act({ type: 'ballot/vote', target: 'p3' }).act({ type: 'ballot/close' });
    g.act({ type: 'ballot/reopen' });
    g.act({ type: 'ballot/unvote', target: 'p3' }).act({ type: 'ballot/vote', target: 'p1' }).act({ type: 'ballot/close' }).act({ type: 'ballot/confirm' });
    expect(g.player('p1').alive).toBe(false);
    expect(g.player('p3').alive).toBe(true);
  });

  it('annuler la dernière opération restaure exactement le compteur', () => {
    const g = dayOne();
    g.act({ type: 'ballot/open', kind: 'elimination', mode: 'tally' });
    g.act({ type: 'ballot/vote', target: 'p1' }).act({ type: 'ballot/vote', target: 'p2' });
    const u = undo(g.record)!;
    expect(countBallot(activeBallot(u.state)!).tallies).toMatchObject({ p1: 1, p2: 0 });
  });
});

describe('vote d’élimination (mode nominatif)', () => {
  it('un votant ne vote qu’une fois ; réattribuer remplace son vote', () => {
    const g = dayOne();
    g.act({ type: 'ballot/open', kind: 'elimination', mode: 'nominal' });
    expect(g.tryAct({ type: 'ballot/vote', target: 'p1' })).toBe('nominal-needs-voter');
    g.act({ type: 'ballot/vote', target: 'p1', voterId: 'p3' });
    g.act({ type: 'ballot/vote', target: 'p2', voterId: 'p3' });
    const c = countBallot(activeBallot(g.state)!);
    expect(c.tallies).toMatchObject({ p1: 0, p2: 1 });
    expect(c.cast).toBe(1);
    expect(c.byVoter).toEqual({ p3: 'p2' });
  });

  it('un mort ou un Idiot révélé ne vote pas', () => {
    const g = dayOne({}, ['loup-garou', 'loup-garou', 'voyante', 'idiot', 'villageois', 'villageois', 'villageois', 'villageois']);
    g.eliminationVote(['p4', 'p4']);
    expect(g.player('p4').idiotRevealed).toBe(true);
    expect(g.player('p4').alive).toBe(true);
    g.act({ type: 'day/end' }).finishNight({ wolves: { target: 'p5' } }).act({ type: 'dawn/confirm' });
    g.act({ type: 'ballot/open', kind: 'elimination', mode: 'nominal' });
    expect(g.tryAct({ type: 'ballot/vote', target: 'p1', voterId: 'p4' })).toBe('not-voter');
    expect(g.tryAct({ type: 'ballot/vote', target: 'p1', voterId: 'p8' })).toBe('not-voter');
    // Un Idiot révélé désigné une seconde fois meurt (variante par défaut).
    for (const v of ['p1', 'p2', 'p3']) g.act({ type: 'ballot/vote', target: 'p4', voterId: v });
    g.act({ type: 'ballot/close' }).act({ type: 'ballot/confirm' });
    expect(g.player('p4').alive).toBe(false);
  });

  it('un Amoureux ne peut pas voter contre l’être aimé', () => {
    const g = new GameDriver(makeSetup(['loup-garou', 'cupidon', 'voyante', 'villageois', 'villageois', 'villageois']));
    g.finishNight({ cupid: { targets: ['p4', 'p5'] }, wolves: { target: 'p6' } }).act({ type: 'dawn/confirm' });
    g.act({ type: 'ballot/open', kind: 'elimination', mode: 'nominal' });
    expect(g.tryAct({ type: 'ballot/vote', target: 'p5', voterId: 'p4' })).toBe('lover-vote');
  });
});

describe('rôles liés au vote', () => {
  it('Bouc émissaire : éliminé sur égalité, puis désigne les votants du lendemain', () => {
    const g = dayOne({}, ['loup-garou', 'loup-garou', 'voyante', 'bouc-emissaire', 'villageois', 'villageois', 'villageois', 'villageois']);
    g.act({ type: 'ballot/open', kind: 'elimination', mode: 'tally' });
    g.act({ type: 'ballot/vote', target: 'p1' }).act({ type: 'ballot/vote', target: 'p2' }).act({ type: 'ballot/close' });
    expect(activeBallot(g.state)!.result!.outcome).toEqual({ kind: 'eliminated', playerId: 'p4', viaScapegoat: true });
    g.act({ type: 'ballot/confirm' });
    expect(g.player('p4').death?.cause).toBe('scapegoat');
    expect(g.state.pending[0].kind).toBe('scapegoat-voters');
    g.resolvePending({ targets: ['p3', 'p5'] });
    g.act({ type: 'day/end' }).finishNight({ wolves: { target: 'p6' } }).act({ type: 'dawn/confirm' });
    g.act({ type: 'ballot/open', kind: 'elimination' });
    expect(activeBallot(g.state)!.voters.sort()).toEqual(['p3', 'p5']);
  });

  it('Corbeau : ajoute ses voix au premier vote du lendemain', () => {
    const g = new GameDriver(makeSetup(['loup-garou', 'loup-garou', 'corbeau', 'villageois', 'villageois', 'villageois', 'villageois', 'villageois']));
    g.finishNight({ raven: { target: 'p5' }, wolves: { target: 'p8' } }).act({ type: 'dawn/confirm' });
    g.act({ type: 'ballot/open', kind: 'elimination', mode: 'tally' });
    expect(activeBallot(g.state)!.ravenTarget).toBe('p5');
    g.act({ type: 'ballot/vote', target: 'p1' }).act({ type: 'ballot/close' });
    expect(activeBallot(g.state)!.result!.outcome).toEqual({ kind: 'eliminated', playerId: 'p5' });
  });

  it('Juge bègue : second vote le même jour, une seule fois', () => {
    const g = dayOne({}, ['loup-garou', 'loup-garou', 'juge-begue', 'villageois', 'villageois', 'villageois', 'villageois', 'villageois']);
    expect(g.tryAct({ type: 'judge/second-vote' })).toBe('judge-unavailable');
    g.eliminationVote(['p4']);
    expect(g.tryAct({ type: 'ballot/open', kind: 'elimination' })).toBe('cannot-open');
    g.act({ type: 'judge/second-vote' });
    g.eliminationVote(['p1']);
    expect(g.player('p1').alive).toBe(false);
    expect(g.tryAct({ type: 'judge/second-vote' })).toBe('judge-unavailable');
  });

  it('Servante dévouée : prend le rôle du joueur éliminé', () => {
    const g = dayOne({}, ['loup-garou', 'loup-garou', 'voyante', 'servante', 'chasseur', 'villageois', 'villageois', 'villageois']);
    g.eliminationVote(['p5', 'p5']);
    expect(g.state.pending[0]).toMatchObject({ kind: 'servant-offer', victimId: 'p5', servantId: 'p4' });
    g.resolvePending({ accept: true });
    expect(g.player('p4').roleId).toBe('chasseur');
    expect(g.player('p5').alive).toBe(false);
    // L'ancien Chasseur meurt avec la carte Servante : pas de tir.
    expect(g.state.pending).toEqual([]);
  });

  it('Servante dévouée : refus → la mort suit son cours', () => {
    const g = dayOne({}, ['loup-garou', 'loup-garou', 'voyante', 'servante', 'chasseur', 'villageois', 'villageois', 'villageois']);
    g.eliminationVote(['p5', 'p5']);
    g.resolvePending({ accept: false });
    expect(g.state.pending[0].kind).toBe('hunter-shot');
  });
});
