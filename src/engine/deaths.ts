import { emit, nextId } from './core';
import { firstWolfToLeft, getPlayer, loverOf, phaseLabel, registryOf } from './selectors';
import type { DeathCause, GameState, PlayerId, PlayerState } from './types';

export interface DeathRequest {
  playerId: PlayerId;
  cause: DeathCause;
}

const WOLF_CAUSES: ReadonlySet<DeathCause> = new Set<DeathCause>(['wolves', 'big-bad-wolf', 'white-wolf']);

/** Pouvoirs liés au décès encore actifs (indépendamment du fait d'être vivant). */
function deathPowersActive(state: GameState, p: PlayerState): boolean {
  if (p.powersLost) return false;
  if (state.villagePowersLost && p.team === 'village') return false;
  return true;
}

function elderVengeanceApplies(state: GameState, cause: DeathCause): boolean {
  if (state.setup.variants.elderVengeance === 'vote_only') return cause === 'vote';
  return cause === 'vote' || cause === 'hunter' || cause === 'poison';
}

function angelWindowOpen(state: GameState, cause: DeathCause): boolean {
  if (state.setup.variants.angelWindow === 'first_vote') {
    return (cause === 'vote' || cause === 'scapegoat') && state.dayNumber === 1 && state.phase.kind === 'day' && state.eliminationsToday === 0;
  }
  return state.nightNumber <= 1 && state.dayNumber <= 1;
}

/**
 * Applique une série de morts et toutes leurs conséquences en chaîne
 * (Amoureux, Chasseur, maire, Enfant sauvage, Ancien, Chevalier, Ange).
 * Chaque joueur ne peut mourir qu'une fois : les doublons sont ignorés.
 * Les décisions nécessitant un choix du MJ sont ajoutées à `state.pending`.
 */
export function killPlayers(state: GameState, requests: DeathRequest[]): void {
  const queue = [...requests];
  const guard = state.players.length * 4 + 4;
  let iterations = 0;
  const reg = registryOf(state);

  while (queue.length > 0) {
    iterations += 1;
    if (iterations > guard) throw new Error('Boucle de morts en chaîne détectée');
    const req = queue.shift()!;
    const p = getPlayer(state, req.playerId);
    if (!p.alive) continue;

    p.alive = false;
    p.death = { cause: req.cause, phaseLabel: phaseLabel(state.phase), actionIndex: state.actionCount };
    emit(state, { type: 'death', playerId: p.id, cause: req.cause, roleId: p.roleId });

    if (p.roleId === 'ange' && p.team === 'solo' && state.angelVictory === null && angelWindowOpen(state, req.cause)) {
      state.angelVictory = p.id;
    }

    const lover = loverOf(state, p.id);
    if (lover && getPlayer(state, lover).alive) queue.push({ playerId: lover, cause: 'heartbreak' });

    const active = deathPowersActive(state, p);
    if (p.roleId === 'chasseur' && active && (p.uses.shot ?? 0) > 0) {
      state.pending.push({ id: nextId(state, 'd'), kind: 'hunter-shot', playerId: p.id });
    }
    const custom = reg.getCustom(p.roleId);
    if (custom && custom.onDeath === 'shoot' && active && (p.uses.shot ?? 0) > 0) {
      state.pending.push({ id: nextId(state, 'd'), kind: 'custom-shot', playerId: p.id });
    }

    if (state.mayorId === p.id) {
      if (state.setup.variants.mayorSuccession === 'designate') {
        state.pending.push({ id: nextId(state, 'd'), kind: 'mayor-succession', fromPlayerId: p.id });
      } else {
        state.mayorId = null;
        emit(state, { type: 'mayor', playerId: null, how: 'removed' });
      }
    }

    if (p.roleId === 'ancien' && p.team === 'village' && elderVengeanceApplies(state, req.cause) && !state.villagePowersLost) {
      state.villagePowersLost = true;
      emit(state, { type: 'elder-vengeance', playerId: p.id });
    }

    if (p.roleId === 'chevalier' && active && WOLF_CAUSES.has(req.cause) && req.cause !== 'white-wolf') {
      const wolf = firstWolfToLeft(state, p.id);
      if (wolf) {
        state.rustyCurse = { wolfId: wolf.id, night: state.nightNumber + 1 };
        emit(state, { type: 'rusty-curse', wolfId: wolf.id }, true);
      }
    }

    for (const child of state.players) {
      if (
        child.alive &&
        child.roleId === 'enfant-sauvage' &&
        child.wildChildModel === p.id &&
        !child.transformed &&
        child.team === 'village' &&
        (state.setup.variants.wildChildTrigger === 'any_death' || WOLF_CAUSES.has(req.cause))
      ) {
        child.team = 'wolves';
        child.transformed = true;
        emit(state, { type: 'transformed', playerId: child.id, reason: 'wild-child' }, true);
      }
    }
  }
}
