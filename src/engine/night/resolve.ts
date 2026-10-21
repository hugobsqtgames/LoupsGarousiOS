import { assert, emit } from '../core';
import { killPlayers, type DeathRequest } from '../deaths';
import { aliveNeighbors, findPlayer, getPlayer, isWolfSide, registryOf } from '../selectors';
import type { DeathCause, GameState, PlayerId, StepPayload } from '../types';
import { packVictim, protectedThisNight } from './choices';
import { computeNightSteps } from './steps';

interface Attack {
  targetId: PlayerId;
  cause: DeathCause;
}

/** Groupe flairé par le Renard : la cible et ses deux voisins vivants. */
export function foxGroup(state: GameState, targetId: PlayerId): PlayerId[] {
  const { left, right } = aliveNeighbors(state, targetId);
  const ids = [targetId];
  if (left) ids.push(left.id);
  if (right && right.id !== left?.id) ids.push(right.id);
  return ids;
}

export function foxFindsWolf(state: GameState, targetId: PlayerId): boolean {
  return foxGroup(state, targetId).some((id) => isWolfSide(getPlayer(state, id)));
}

export function bearGrowls(state: GameState, tamerId: PlayerId): boolean {
  const tamer = getPlayer(state, tamerId);
  if (isWolfSide(tamer)) return true;
  const { left, right } = aliveNeighbors(state, tamerId);
  return Boolean((left && isWolfSide(left)) || (right && isWolfSide(right)));
}

function emitImmediateSummary(state: GameState, choices: Record<string, StepPayload>): void {
  const night = state.night!;
  for (const [key, c] of Object.entries(choices)) {
    const [kind, actorId] = key.split(':');
    if (kind === 'thief' && c.cardIndex !== null && c.cardIndex !== undefined) {
      emit(state, { type: 'thief-swap', playerId: actorId, from: 'voleur', to: state.setup.extraCards[c.cardIndex] }, true);
    } else if (kind === 'comedian' && c.cardIndex !== null && c.cardIndex !== undefined) {
      emit(state, { type: 'comedian-card', playerId: actorId, roleId: night.startComedianCards[c.cardIndex] }, true);
    } else if (kind === 'wolfhound' && c.team) {
      emit(state, { type: 'wolfhound', playerId: actorId, team: c.team }, true);
    } else if (kind === 'cupid' && c.targets?.length === 2) {
      emit(state, { type: 'lovers', lovers: [c.targets[0], c.targets[1]] }, true);
    } else if (kind === 'wild-child' && c.target) {
      emit(state, { type: 'wild-model', playerId: actorId, modelId: c.target }, true);
    }
  }
}

/**
 * Résout la nuit : protections, attaques, potions, charmes, effets différés,
 * puis morts en chaîne. Toutes les étapes doivent avoir été renseignées.
 */
export function resolveNight(state: GameState): void {
  const night = state.night;
  assert(night && state.phase.kind === 'night', 'not-night', 'Aucune nuit en cours.');
  const steps = computeNightSteps(state);
  const missing = steps.filter((s) => s.payload === undefined);
  assert(missing.length === 0, 'steps-missing', `Il reste ${missing.length} étape(s) à renseigner avant l'aube.`);

  const choices = night.choices;
  const logStart = state.log.length;
  const reg = registryOf(state);
  emitImmediateSummary(state, choices);

  const deaths: DeathRequest[] = [];

  // 1. Malédiction du Chevalier (mort différée, non bloquable).
  if (state.rustyCurse && state.rustyCurse.night === night.number) {
    const wolf = findPlayer(state, state.rustyCurse.wolfId);
    if (wolf?.alive) deaths.push({ playerId: wolf.id, cause: 'rusty-sword' });
    state.rustyCurse = null;
  }

  // 2. Protections.
  const protectedIds = protectedThisNight(state, choices);
  for (const step of steps) {
    if (step.kind === 'salvateur') {
      const actor = getPlayer(state, step.actorIds[0]);
      const target = step.payload?.target ?? null;
      actor.lastProtected = target;
      if (target) emit(state, { type: 'protected', targetId: target, byId: actor.id }, true);
    }
  }

  // 3. Informations (Voyante, Renard, actions personnalisées).
  for (const step of steps) {
    const target = step.payload?.target;
    if (step.kind === 'seer' && target) {
      emit(state, { type: 'seer', byId: step.actorIds[0], targetId: target, roleId: getPlayer(state, target).roleId }, true);
    }
    if (step.kind === 'fox' && target) {
      const actor = getPlayer(state, step.actorIds[0]);
      const found = foxFindsWolf(state, target);
      emit(state, { type: 'fox', byId: actor.id, targetIds: foxGroup(state, target), foundWolf: found }, true);
      if (!found && actor.comedianRole !== 'renard') actor.foxPowerLost = true;
    }
  }

  // 4. Attaques.
  const attacks: Attack[] = [];
  const pack = packVictim(state, choices.wolves);
  const infectStep = steps.find((s) => s.kind === 'infect' && s.payload?.infect === true);
  if (pack && infectStep) {
    const infector = getPlayer(state, infectStep.actorIds[0]);
    infector.uses.infect = 0;
    const victim = getPlayer(state, pack);
    victim.team = 'wolves';
    victim.infected = true;
    if (victim.roleId === 'joueur-de-flute') victim.powersLost = true;
    emit(state, { type: 'infected', targetId: victim.id }, true);
    emit(state, { type: 'transformed', playerId: victim.id, reason: 'infect' }, true);
  } else if (pack) {
    attacks.push({ targetId: pack, cause: 'wolves' });
  }
  for (const step of steps) {
    const target = step.payload?.target;
    if (!target) continue;
    if (step.kind === 'big-bad-wolf') attacks.push({ targetId: target, cause: 'big-bad-wolf' });
    if (step.kind === 'white-wolf') attacks.push({ targetId: target, cause: 'white-wolf' });
    if (step.kind === 'custom') {
      const actor = getPlayer(state, step.actorIds[0]);
      const def = reg.getCustom(actor.roleId);
      if (def) {
        if (actor.uses.custom !== undefined && actor.uses.custom > 0) actor.uses.custom -= 1;
        if (def.nightAction === 'kill') attacks.push({ targetId: target, cause: 'custom-kill' });
        else emit(state, { type: 'custom-action', byId: actor.id, targetId: target, action: def.nightAction }, true);
      }
    }
  }

  // 5. Sorcière.
  const healed = new Set<PlayerId>();
  const poisoned: PlayerId[] = [];
  for (const step of steps) {
    if (step.kind !== 'witch' || !step.payload) continue;
    const witch = getPlayer(state, step.actorIds[0]);
    if (step.payload.heal) {
      witch.uses.heal = 0;
      healed.add(step.payload.heal);
      emit(state, { type: 'potion', kind: 'heal', targetId: step.payload.heal, byId: witch.id }, true);
    }
    if (step.payload.poison) {
      witch.uses.poison = 0;
      poisoned.push(step.payload.poison);
      emit(state, { type: 'potion', kind: 'poison', targetId: step.payload.poison, byId: witch.id }, true);
    }
  }

  for (const atk of attacks) {
    const target = getPlayer(state, atk.targetId);
    if (protectedIds.has(target.id)) {
      emit(state, { type: 'attack-blocked', targetId: target.id, source: atk.cause, by: 'protection' }, true);
      continue;
    }
    if (healed.has(target.id) && atk.cause !== 'custom-kill') {
      emit(state, { type: 'attack-blocked', targetId: target.id, source: atk.cause, by: 'heal' }, true);
      continue;
    }
    const isWolfAttack = atk.cause === 'wolves' || atk.cause === 'big-bad-wolf' || atk.cause === 'white-wolf';
    if (isWolfAttack && target.roleId === 'ancien' && (target.uses.extraLife ?? 0) > 0) {
      target.uses.extraLife -= 1;
      emit(state, { type: 'elder-life-lost', playerId: target.id }, true);
      emit(state, { type: 'attack-blocked', targetId: target.id, source: atk.cause, by: 'elder' }, true);
      continue;
    }
    deaths.push({ playerId: target.id, cause: atk.cause });
  }
  for (const id of poisoned) deaths.push({ playerId: id, cause: 'poison' });

  // 6. Joueur de flûte et Corbeau.
  for (const step of steps) {
    if (step.kind === 'piper' && step.payload?.targets?.length) {
      for (const id of step.payload.targets) getPlayer(state, id).charmed = true;
      emit(state, { type: 'charmed', targetIds: step.payload.targets }, true);
    }
    if (step.kind === 'raven' && step.payload?.target) {
      state.ravenMark = { targetId: step.payload.target, day: state.dayNumber + 1 };
      emit(state, { type: 'raven', targetId: step.payload.target }, true);
    }
  }

  // 7. Fin des effets temporaires du Comédien.
  for (const p of state.players) {
    if (p.comedianRole === 'sorciere') {
      delete p.uses.heal;
      delete p.uses.poison;
    }
    p.comedianRole = null;
  }

  // 8. Morts et conséquences.
  state.phase = { kind: 'dawn', number: night.number };
  emit(state, { type: 'phase', phase: state.phase });
  killPlayers(state, deaths);

  // 9. Montreur d'ours (après les morts).
  for (const p of state.players) {
    if (p.alive && p.roleId === 'montreur-ours' && !p.powersLost && !(state.villagePowersLost && p.team === 'village')) {
      emit(state, { type: 'bear', tamerId: p.id, growled: bearGrowls(state, p.id) });
    }
  }

  state.dawnReport = state.log.slice(logStart);
}
