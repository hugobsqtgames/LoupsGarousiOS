import { deepClone } from './clone';
import {
  cancelBallot,
  castVote,
  closeBallot,
  openBallot,
  openRunoff,
  reopenBallot,
  toggleCandidate,
  useJudge,
} from './ballot';
import { assert, emit, fail } from './core';
import { killPlayers } from './deaths';
import { rebuildNight, validateStepPayload } from './night/choices';
import { resolveNight } from './night/resolve';
import { computeNightSteps } from './night/steps';
import { initialUses, createInitialState } from './setup';
import { activeBallot, findPlayer, getPlayer, registryOf } from './selectors';
import { detectVictory } from './victory';
import type { DecisionPayload, GameAction, GameSetup, GameState, PendingDecision, PlayerId } from './types';

/* ------------------------------------------------------------------ */
/* Transitions de phase                                                */
/* ------------------------------------------------------------------ */

function closeAngelWindow(state: GameState): void {
  if (state.nightNumber < 2 && state.dayNumber < 2) return;
  for (const p of state.players) {
    if (p.alive && p.roleId === 'ange' && p.team === 'solo') {
      p.team = 'village';
      emit(state, { type: 'angel-now-villager', playerId: p.id }, true);
    }
  }
}

function beginNight(state: GameState): void {
  state.nightNumber += 1;
  state.phase = { kind: 'night', number: state.nightNumber };
  state.activeBallotId = null;
  for (const p of state.players) p.comedianRole = null;
  closeAngelWindow(state);
  state.night = {
    number: state.nightNumber,
    startPlayers: deepClone(state.players),
    startLovers: state.lovers ? [state.lovers[0], state.lovers[1]] : null,
    choices: {},
    startComedianCards: [...state.comedianCards],
  };
  state.dawnReport = [];
  emit(state, { type: 'phase', phase: state.phase });
}

function beginDay(state: GameState): void {
  state.dayNumber += 1;
  state.phase = { kind: 'day', number: state.dayNumber };
  state.night = null;
  state.eliminationsToday = 0;
  state.judgeSecondVoteAvailable = false;
  state.activeBallotId = null;
  closeAngelWindow(state);
  emit(state, { type: 'phase', phase: state.phase });
}

/** État initial d'une partie qui démarre (première nuit, ou premier jour avec l'Ange). */
export function startGame(setup: GameSetup): GameState {
  const state = createInitialState(setup);
  emit(state, { type: 'game-started' });
  const hasAngel = state.players.some((p) => p.roleId === 'ange');
  if (hasAngel && setup.variants.angelStartsWithDay) beginDay(state);
  else beginNight(state);
  return state;
}

/* ------------------------------------------------------------------ */
/* Décisions en attente                                                */
/* ------------------------------------------------------------------ */

function aliveTarget(state: GameState, id: PlayerId | null | undefined, allowNull: boolean): PlayerId | null {
  if (id === null || id === undefined) {
    assert(allowNull, 'decision-target', 'Un joueur doit être désigné.');
    return null;
  }
  const p = findPlayer(state, id);
  assert(p && p.alive, 'decision-target', 'Le joueur désigné doit être vivant.');
  return p.id;
}

/** Élimination par le vote (Idiot, Servante dévouée, puis mort). */
function eliminateByVote(state: GameState, playerId: PlayerId, viaScapegoat: boolean, ballotId: string): void {
  const p = getPlayer(state, playerId);
  const powers = !p.powersLost && !(state.villagePowersLost && p.team === 'village');
  if (!viaScapegoat && p.roleId === 'idiot' && !p.idiotRevealed && powers) {
    p.idiotRevealed = true;
    emit(state, { type: 'idiot-revealed', playerId: p.id });
    return;
  }
  if (!viaScapegoat && p.idiotRevealed && !state.setup.variants.idiotDiesSecondTime) {
    emit(state, { type: 'note', text: `${p.name} (Idiot révélé) est épargné(e).` });
    return;
  }
  const servant = state.players.find(
    (s) =>
      s.alive &&
      s.id !== p.id &&
      s.roleId === 'servante' &&
      (s.uses.servant ?? 0) > 0 &&
      !s.powersLost &&
      !(state.villagePowersLost && s.team === 'village') &&
      !(state.lovers && state.lovers.includes(s.id)),
  );
  if (state.setup.variants.servantEnabled && servant) {
    state.pending.push({ id: `d${++state.idCounter}`, kind: 'servant-offer', victimId: p.id, servantId: servant.id, ballotId });
    return;
  }
  finishVoteDeath(state, p.id, viaScapegoat);
}

function finishVoteDeath(state: GameState, playerId: PlayerId, viaScapegoat: boolean): void {
  killPlayers(state, [{ playerId, cause: viaScapegoat ? 'scapegoat' : 'vote' }]);
  if (viaScapegoat) {
    state.pending.push({ id: `d${++state.idCounter}`, kind: 'scapegoat-voters', playerId });
  }
}

function resolveDecision(state: GameState, decisionId: string, payload: DecisionPayload): void {
  const idx = state.pending.findIndex((d) => d.id === decisionId);
  assert(idx >= 0, 'unknown-decision', 'Décision inconnue ou déjà traitée.');
  assert(idx === 0, 'decision-order', 'Traitez les décisions dans l’ordre indiqué.');
  const d: PendingDecision = state.pending[idx];
  state.pending.splice(idx, 1);
  emit(state, { type: 'decision', decisionKind: d.kind, payload });

  switch (d.kind) {
    case 'hunter-shot':
    case 'custom-shot': {
      const target = aliveTarget(state, payload.target, true);
      const shooter = getPlayer(state, d.playerId);
      shooter.uses.shot = 0;
      if (target) killPlayers(state, [{ playerId: target, cause: 'hunter' }]);
      return;
    }
    case 'mayor-succession': {
      const target = aliveTarget(state, payload.target, true);
      state.mayorId = target;
      emit(state, { type: 'mayor', playerId: target, how: target ? 'designated' : 'removed' });
      return;
    }
    case 'scapegoat-voters': {
      const voters = payload.targets ?? [];
      for (const v of voters) aliveTarget(state, v, false);
      state.restrictedVoters = { day: state.dayNumber + 1, voters: [...new Set(voters)] };
      emit(state, { type: 'scapegoat-voters', voters: state.restrictedVoters.voters, day: state.restrictedVoters.day });
      return;
    }
    case 'mayor-tiebreak': {
      const target = aliveTarget(state, payload.target, false)!;
      assert(d.candidates.includes(target), 'tiebreak-candidate', 'Le maire doit choisir parmi les ex æquo.');
      eliminateByVote(state, target, false, d.ballotId);
      return;
    }
    case 'mj-tiebreak': {
      const target = aliveTarget(state, payload.target, false)!;
      assert(d.candidates.includes(target), 'tiebreak-candidate', 'Choisissez parmi les ex æquo.');
      state.mayorId = target;
      state.mayorEverElected = true;
      emit(state, { type: 'mayor', playerId: target, how: 'elected' });
      return;
    }
    case 'servant-offer': {
      const victim = getPlayer(state, d.victimId);
      if (payload.accept) {
        const servant = getPlayer(state, d.servantId);
        const reg = registryOf(state);
        const taken = victim.roleId;
        servant.roleId = taken;
        servant.team = reg.get(taken).team;
        servant.uses = initialUses(taken, reg);
        servant.uses.servant = 0;
        victim.roleId = 'servante';
        emit(state, { type: 'servant', servantId: servant.id, victimId: victim.id, roleId: taken }, true);
      }
      const ballot = state.ballots.find((b) => b.id === d.ballotId);
      const viaScapegoat = ballot?.result?.outcome.kind === 'eliminated' && ballot.result.outcome.viaScapegoat === true;
      finishVoteDeath(state, victim.id, viaScapegoat);
      return;
    }
  }
}

/* ------------------------------------------------------------------ */
/* Réducteur                                                           */
/* ------------------------------------------------------------------ */

function requireNoVictory(state: GameState): void {
  assert(!state.victory, 'game-won', 'Une condition de victoire est atteinte : terminez la partie ou corrigez l’historique.');
}

function requireNoPending(state: GameState): void {
  assert(state.pending.length === 0, 'pending', 'Des décisions sont en attente.');
}

function confirmBallot(state: GameState): void {
  const b = activeBallot(state);
  assert(b && b.status === 'closed' && b.result, 'not-closed', 'Clôturez d’abord le scrutin.');
  b.status = 'confirmed';
  state.activeBallotId = null;
  const outcome = b.result.outcome;
  switch (outcome.kind) {
    case 'elected':
      state.mayorId = outcome.playerId;
      state.mayorEverElected = true;
      emit(state, { type: 'mayor', playerId: outcome.playerId, how: 'elected' });
      return;
    case 'runoff':
      openRunoff(state, b, outcome.candidates);
      return;
    case 'mj-tiebreak':
      state.pending.push({ id: `d${++state.idCounter}`, kind: 'mj-tiebreak', ballotId: b.id, candidates: outcome.candidates });
      return;
    case 'mayor-tiebreak':
      state.pending.push({ id: `d${++state.idCounter}`, kind: 'mayor-tiebreak', ballotId: b.id, candidates: outcome.candidates });
      state.eliminationsToday += 1;
      return;
    case 'eliminated':
      eliminateByVote(state, outcome.playerId, outcome.viaScapegoat === true, b.id);
      state.eliminationsToday += 1;
      return;
    case 'none':
      if (b.kind === 'elimination') state.eliminationsToday += 1;
      return;
  }
}

/**
 * Applique une action à un état (muté en place : l'appelant fournit un clone).
 * Lève une RuleError si l'action est invalide dans l'état courant.
 */
export function applyAction(state: GameState, action: GameAction): void {
  assert(state.phase.kind !== 'ended', 'ended', 'La partie est terminée.');
  state.actionCount += 1;

  switch (action.type) {
    case 'night/submit': {
      requireNoVictory(state);
      assert(state.phase.kind === 'night' && state.night, 'not-night', 'Aucune nuit en cours.');
      const steps = computeNightSteps(state);
      const step = steps.find((s) => s.key === action.stepKey);
      assert(step, 'unknown-step', 'Étape inconnue pour cette nuit.');
      const next = { ...state.night.choices, [action.stepKey]: action.payload };
      const { dropped } = rebuildNight(state, next);
      if (dropped.includes(action.stepKey)) {
        // Revalide pour obtenir le message d'erreur précis.
        const prior = { ...state.night.choices };
        const fresh = computeNightSteps(state).find((s) => s.key === action.stepKey);
        if (fresh) validateStepPayload(state, fresh, action.payload, prior);
        fail('invalid-choice', 'Choix invalide pour cette étape.');
      }
      for (const k of dropped) emit(state, { type: 'note', text: `Choix « ${k} » invalidé par la correction : à refaire.` }, true);
      emit(state, { type: 'step-done', stepKey: action.stepKey, kind: step.kind, actorIds: step.actorIds, payload: action.payload }, true);
      return;
    }
    case 'night/resolve':
      requireNoVictory(state);
      resolveNight(state);
      break;
    case 'dawn/confirm':
      requireNoVictory(state);
      assert(state.phase.kind === 'dawn', 'not-dawn', 'Ce n’est pas l’aube.');
      requireNoPending(state);
      beginDay(state);
      break;
    case 'day/end': {
      requireNoVictory(state);
      assert(state.phase.kind === 'day', 'not-day', 'Ce n’est pas le jour.');
      requireNoPending(state);
      const b = activeBallot(state);
      assert(!b || b.status === 'confirmed' || b.status === 'cancelled', 'ballot-open', 'Un scrutin est encore en cours.');
      beginNight(state);
      break;
    }
    case 'ballot/open':
      requireNoVictory(state);
      openBallot(state, action.kind, action.mode, action.candidates);
      break;
    case 'ballot/candidate':
      toggleCandidate(state, action.playerId, action.add);
      break;
    case 'ballot/vote':
      castVote(state, action.target, action.voterId, false);
      break;
    case 'ballot/unvote':
      castVote(state, action.target, action.voterId, true);
      break;
    case 'ballot/close':
      closeBallot(state);
      break;
    case 'ballot/reopen':
      reopenBallot(state);
      break;
    case 'ballot/confirm':
      requireNoPending(state);
      confirmBallot(state);
      break;
    case 'ballot/cancel':
      cancelBallot(state);
      break;
    case 'judge/second-vote':
      requireNoVictory(state);
      useJudge(state);
      break;
    case 'decision/resolve':
      resolveDecision(state, action.decisionId, action.payload);
      break;
    case 'mj/eliminate': {
      requireNoVictory(state);
      assert(state.phase.kind === 'day' || state.phase.kind === 'dawn', 'mj-eliminate-phase', 'Élimination manuelle possible à l’aube ou le jour.');
      const p = findPlayer(state, action.playerId);
      assert(p && p.alive, 'dead-target', 'Joueur introuvable ou déjà éliminé.');
      killPlayers(state, [{ playerId: p.id, cause: 'mj' }]);
      break;
    }
    case 'mj/note':
      assert(action.text.trim().length > 0 && action.text.length <= 500, 'note', 'Note vide ou trop longue.');
      emit(state, { type: 'note', text: action.text.trim() });
      return;
    case 'game/finish': {
      assert(state.victory, 'no-victory', 'Aucune condition de victoire n’est atteinte.');
      const victory = state.victory;
      state.phase = { kind: 'ended' };
      emit(state, { type: 'victory', victory });
      return;
    }
    case 'game/abandon':
      state.victory = { winner: 'abandoned', winners: [], reason: 'Partie interrompue par le MJ.' };
      state.phase = { kind: 'ended' };
      emit(state, { type: 'victory', victory: state.victory });
      return;
    default: {
      const never: never = action;
      fail('unknown-action', `Action inconnue : ${JSON.stringify(never)}`);
    }
  }

  // Vérification de victoire : jamais pendant la nuit ni avec une décision en attente.
  if (state.phase.kind !== 'night' && state.pending.length === 0) {
    state.victory = detectVictory(state);
  } else {
    state.victory = null;
  }
}

