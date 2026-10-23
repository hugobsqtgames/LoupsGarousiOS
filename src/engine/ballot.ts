import { assert, emit, nextId } from './core';
import { activeBallot, eligibleVoters, findPlayer, hasPowers, loverOf } from './selectors';
import type { Ballot, BallotKind, BallotOutcome, BallotResult, BallotTarget, GameState, PlayerId, VoteMode } from './types';

/** Décompte courant d'un scrutin, reconstruit à partir de ses opérations. */
export interface BallotCount {
  /** Voix pondérées par cible. */
  tallies: Record<PlayerId, number>;
  /** Nombre de bulletins (votants) par cible. */
  ballotsFor: Record<PlayerId, number>;
  blank: number;
  abstentions: number;
  /** Nombre de votants ayant exprimé un choix (y compris blanc / abstention). */
  cast: number;
  /** Vote actuel de chaque votant identifié. */
  byVoter: Record<PlayerId, BallotTarget>;
  /** Voix anonymes (mode compteur) par cible. */
  anonymous: Record<string, number>;
}

export function countBallot(ballot: Ballot): BallotCount {
  const byVoter: Record<PlayerId, { target: BallotTarget; weight: number }> = {};
  const anonymous: Record<string, number> = {};
  for (const op of ballot.ops) {
    if (op.voterId) {
      if (op.type === 'add') byVoter[op.voterId] = { target: op.target, weight: op.weight };
      else delete byVoter[op.voterId];
    } else {
      anonymous[op.target] = (anonymous[op.target] ?? 0) + (op.type === 'add' ? 1 : -1);
    }
  }
  const tallies: Record<PlayerId, number> = {};
  const ballotsFor: Record<PlayerId, number> = {};
  for (const c of ballot.candidates) {
    tallies[c] = 0;
    ballotsFor[c] = 0;
  }
  let blank = 0;
  let abstentions = 0;
  let cast = 0;
  const add = (target: BallotTarget, weight: number, count: number) => {
    if (count <= 0) return;
    cast += count;
    if (target === 'blank') blank += count;
    else if (target === 'abstain') abstentions += count;
    else {
      tallies[target] = (tallies[target] ?? 0) + weight * count;
      ballotsFor[target] = (ballotsFor[target] ?? 0) + count;
    }
  };
  for (const [target, n] of Object.entries(anonymous)) add(target as BallotTarget, 1, n);
  for (const v of Object.values(byVoter)) add(v.target, v.weight, 1);
  return {
    tallies,
    ballotsFor,
    blank,
    abstentions,
    cast,
    byVoter: Object.fromEntries(Object.entries(byVoter).map(([k, v]) => [k, v.target])),
    anonymous,
  };
}

/** Voix totales en incluant le bonus du Corbeau. */
export function talliesWithBonus(ballot: Ballot): Record<PlayerId, number> {
  const { tallies } = countBallot(ballot);
  if (ballot.ravenTarget && ballot.ravenTarget in tallies) {
    return { ...tallies, [ballot.ravenTarget]: tallies[ballot.ravenTarget] + ballot.ravenBonus };
  }
  return tallies;
}

export function leadersOf(tallies: Record<PlayerId, number>): { leaders: PlayerId[]; top: number } {
  let top = 0;
  for (const v of Object.values(tallies)) top = Math.max(top, v);
  if (top <= 0) return { leaders: [], top: 0 };
  return { leaders: Object.keys(tallies).filter((k) => tallies[k] === top), top };
}

/** Cibles admissibles d'un scrutin (joueurs vivants parmi les candidats). */
export function ballotTargets(state: GameState, ballot: Ballot): PlayerId[] {
  return ballot.candidates.filter((id) => findPlayer(state, id)?.alive);
}

function voteWeight(state: GameState, ballot: Ballot, voterId: PlayerId | null): number {
  if (voterId && voterId === state.mayorId && ballot.kind === 'elimination') return state.setup.variants.mayorVoteWeight;
  return 1;
}

export function requireOpenBallot(state: GameState): Ballot {
  const b = activeBallot(state);
  assert(b && b.status === 'open', 'no-open-ballot', 'Aucun scrutin ouvert.');
  return b;
}

/** Nombre de scrutins d'élimination (premier tour) déjà autorisés aujourd'hui. */
export function eliminationAllowance(state: GameState): number {
  return 1 + (state.judgeSecondVoteAvailable ? 1 : 0) + state.extraVotesToday;
}

export function canOpenBallot(state: GameState, kind: BallotKind): string | null {
  if (state.phase.kind !== 'day') return 'Les scrutins ont lieu pendant le jour.';
  if (state.victory) return 'La partie est terminée.';
  if (state.pending.length > 0) return 'Une décision est en attente.';
  const current = activeBallot(state);
  if (current && (current.status === 'open' || current.status === 'closed')) return 'Un scrutin est déjà en cours.';
  if (kind === 'mayor') {
    if (!state.setup.variants.mayorEnabled) return 'L’élection du maire est désactivée.';
    if (state.mayorAbolished) return 'Le poste de maire a été perdu définitivement (Idiot du village).';
    if (state.mayorId) return 'Le village a déjà un maire.';
    if (state.eliminationsToday > 0) return 'Le vote d’élimination du jour a déjà eu lieu.';
    return null;
  }
  if (state.eliminationsToday >= eliminationAllowance(state)) return 'Le vote d’élimination du jour a déjà eu lieu.';
  return null;
}

export function openBallot(state: GameState, kind: BallotKind, mode: VoteMode | undefined, candidates: PlayerId[] | undefined): void {
  const reason = canOpenBallot(state, kind);
  assert(reason === null, 'cannot-open', reason ?? '');
  const day = state.phase.kind === 'day' ? state.phase.number : 0;
  const alive = state.players.filter((p) => p.alive).map((p) => p.id);
  let cands: PlayerId[] = alive;
  if (kind === 'mayor' && candidates && candidates.length > 0) {
    for (const c of candidates) assert(alive.includes(c), 'bad-candidate', 'Candidat invalide ou éliminé.');
    cands = [...new Set(candidates)];
  }
  const firstOfDay = kind === 'elimination' && state.eliminationsToday === 0;
  const raven = firstOfDay && state.ravenMark && state.ravenMark.day === day && alive.includes(state.ravenMark.targetId) ? state.ravenMark.targetId : null;
  const ballot: Ballot = {
    id: nextId(state, 'b'),
    kind,
    day,
    round: 1,
    parentId: null,
    mode: mode ?? state.setup.variants.voteMode,
    candidates: cands,
    voters: eligibleVoters(state),
    ops: [],
    status: 'open',
    result: null,
    ravenTarget: raven,
    ravenBonus: raven ? state.setup.variants.ravenBonus : 0,
    judgeSecondVote: kind === 'elimination' && state.eliminationsToday > 0,
  };
  state.ballots.push(ballot);
  state.activeBallotId = ballot.id;
  emit(state, { type: 'ballot-opened', ballotId: ballot.id, kind, round: 1 });
}

export function toggleCandidate(state: GameState, playerId: PlayerId, add: boolean): void {
  const b = requireOpenBallot(state);
  assert(b.kind === 'mayor', 'not-mayor', 'Les candidatures ne concernent que l’élection du maire.');
  const p = findPlayer(state, playerId);
  assert(p && p.alive, 'bad-candidate', 'Candidat invalide ou éliminé.');
  const alive = state.players.filter((x) => x.alive).map((x) => x.id);
  // Liste « libre » (tous les vivants) = aucune candidature enregistrée.
  const isOpenList = b.candidates.length === alive.length && alive.every((id) => b.candidates.includes(id));
  if (add) {
    if (isOpenList) b.candidates = [playerId];
    else if (!b.candidates.includes(playerId)) b.candidates.push(playerId);
    return;
  }
  assert(b.candidates.includes(playerId), 'not-candidate', `${p.name} n’est pas candidat(e).`);
  const count = countBallot(b);
  assert((count.ballotsFor[playerId] ?? 0) === 0, 'candidate-has-votes', `Retirez d’abord les voix de ${p.name}.`);
  b.candidates = b.candidates.filter((c) => c !== playerId);
  if (b.candidates.length === 0) b.candidates = alive;
}

export function castVote(state: GameState, target: BallotTarget, voterId: PlayerId | null | undefined, remove: boolean): void {
  const b = requireOpenBallot(state);
  const v = state.setup.variants;
  const count = countBallot(b);
  const voter = voterId ?? null;

  if (target === 'blank') assert(v.allowBlankVotes, 'no-blank', 'Les votes blancs sont désactivés.');
  else if (target === 'abstain') assert(voter !== null, 'abstain-anon', 'L’abstention concerne un votant identifié.');
  else {
    const p = findPlayer(state, target);
    assert(p, 'unknown-player', 'Joueur inconnu.');
    assert(p.alive, 'dead-target', `${p.name} est éliminé(e) : impossible de voter contre lui/elle.`);
    assert(b.candidates.includes(target), 'not-eligible', `${p.name} n’est pas éligible pour ce scrutin.`);
  }

  if (voter) {
    const vp = findPlayer(state, voter);
    assert(vp, 'unknown-voter', 'Votant inconnu.');
    assert(b.voters.includes(voter), 'not-voter', `${vp.name} ne peut pas voter.`);
    if (b.mode === 'tally') assert(voter === state.mayorId, 'tally-voter', 'En mode compteur, seul le vote du maire est nominatif.');
    if (remove) {
      assert(count.byVoter[voter] !== undefined, 'no-vote', `${vp.name} n’a pas encore voté.`);
    } else if (target !== 'blank' && target !== 'abstain') {
      assert(loverOf(state, voter) !== target, 'lover-vote', 'Un Amoureux ne peut pas voter contre l’être aimé.');
    }
  } else {
    assert(b.mode === 'tally', 'nominal-needs-voter', 'En mode nominatif, choisissez d’abord le votant.');
    if (remove) {
      assert((count.anonymous[target] ?? 0) > 0, 'no-vote-to-remove', 'Aucune voix à retirer.');
    } else if (v.strictVoterCount) {
      const mayorSlot = state.mayorId && b.voters.includes(state.mayorId) ? 1 : 0;
      const anonymousCast = Object.values(count.anonymous).reduce((a, n) => a + n, 0);
      const anonymousCapacity = b.voters.length - mayorSlot;
      assert(anonymousCast < anonymousCapacity, 'too-many-votes', 'Toutes les voix attendues sont déjà enregistrées.');
    }
  }

  const op = {
    seq: b.ops.length,
    type: remove ? ('remove' as const) : ('add' as const),
    target,
    voterId: voter,
    weight: voteWeight(state, b, voter),
    actionIndex: state.actionCount,
  };
  b.ops.push(op);
  emit(state, { type: 'vote', ballotId: b.id, op });
}

function computeOutcome(state: GameState, b: Ballot, leaders: PlayerId[]): BallotOutcome {
  const v = state.setup.variants;
  if (leaders.length === 0) return { kind: 'none', reason: 'no-votes' };
  if (leaders.length === 1) {
    return b.kind === 'mayor' ? { kind: 'elected', playerId: leaders[0] } : { kind: 'eliminated', playerId: leaders[0] };
  }
  if (b.kind === 'mayor') {
    if (v.mayorTie === 'no_mayor') return { kind: 'none', reason: 'tie' };
    if (v.mayorTie === 'runoff_then_mj' && b.round === 1) return { kind: 'runoff', candidates: leaders };
    return { kind: 'mj-tiebreak', candidates: leaders };
  }
  const scapegoat = state.players.find((p) => p.alive && p.roleId === 'bouc-emissaire');
  if (v.scapegoatOnTie && scapegoat) return { kind: 'eliminated', playerId: scapegoat.id, viaScapegoat: true };
  if (v.eliminationTie === 'none') return { kind: 'none', reason: 'tie' };
  const mayor = state.mayorId ? findPlayer(state, state.mayorId) : undefined;
  if (v.eliminationTie === 'mayor_then_runoff' && v.mayorEnabled && mayor?.alive) return { kind: 'mayor-tiebreak', candidates: leaders };
  if (b.round === 1) return { kind: 'runoff', candidates: leaders };
  return { kind: 'none', reason: 'tie' };
}

export function computeResult(state: GameState, b: Ballot): BallotResult {
  const count = countBallot(b);
  const tallies = talliesWithBonus(b);
  const { leaders, top } = leadersOf(tallies);
  return { tallies, blank: count.blank, abstentions: count.abstentions, leaders, topScore: top, outcome: computeOutcome(state, b, leaders) };
}

export function closeBallot(state: GameState): void {
  const b = requireOpenBallot(state);
  b.result = computeResult(state, b);
  b.status = 'closed';
  emit(state, { type: 'ballot-closed', ballotId: b.id, outcome: b.result.outcome });
}

export function reopenBallot(state: GameState): void {
  const b = activeBallot(state);
  assert(b && b.status === 'closed', 'not-closed', 'Seul un scrutin clôturé et non validé peut être rouvert.');
  b.status = 'open';
  b.result = null;
}

export function cancelBallot(state: GameState): void {
  const b = activeBallot(state);
  assert(b && (b.status === 'open' || b.status === 'closed'), 'no-ballot', 'Aucun scrutin à annuler.');
  b.status = 'cancelled';
  state.activeBallotId = null;
  emit(state, { type: 'ballot-cancelled', ballotId: b.id });
}

export function openRunoff(state: GameState, parent: Ballot, candidates: PlayerId[]): void {
  const ballot: Ballot = {
    id: nextId(state, 'b'),
    kind: parent.kind,
    day: parent.day,
    round: parent.round + 1,
    parentId: parent.id,
    mode: parent.mode,
    candidates,
    voters: eligibleVoters(state),
    ops: [],
    status: 'open',
    result: null,
    ravenTarget: null,
    ravenBonus: 0,
    judgeSecondVote: parent.judgeSecondVote,
  };
  state.ballots.push(ballot);
  state.activeBallotId = ballot.id;
  emit(state, { type: 'ballot-opened', ballotId: ballot.id, kind: ballot.kind, round: ballot.round });
}

export function judgeCanCallSecondVote(state: GameState): boolean {
  if (state.phase.kind !== 'day' || state.judgeSecondVoteAvailable || state.eliminationsToday < 1) return false;
  const current = activeBallot(state);
  if (current && (current.status === 'open' || current.status === 'closed')) return false;
  return state.players.some((p) => p.roleId === 'juge-begue' && hasPowers(state, p) && (p.uses.judge ?? 0) > 0);
}

export function applyJudge(state: GameState): void {
  assert(judgeCanCallSecondVote(state), 'judge-unavailable', 'Le Juge bègue ne peut pas déclencher de second vote maintenant.');
  const judge = state.players.find((p) => p.roleId === 'juge-begue' && hasPowers(state, p) && (p.uses.judge ?? 0) > 0)!;
  judge.uses.judge = 0;
  state.judgeSecondVoteAvailable = true;
  emit(state, { type: 'note', text: 'Le Juge bègue impose un second vote.' }, true);
}

export function getBallot(state: GameState, id: string): Ballot {
  const b = state.ballots.find((x) => x.id === id);
  assert(b, 'unknown-ballot', 'Scrutin inconnu.');
  return b;
}

