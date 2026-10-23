import { effectiveWinCondition } from './roles/custom';
import { findPlayer, hasPowers, isWolfSide, registryOf } from './selectors';
import type { GameState, PlayerId, PlayerState, Victory } from './types';

type Side = 'wolves' | 'village' | 'white-wolf' | 'solo';

function sideOf(p: PlayerState): Side {
  if (p.roleId === 'loup-blanc') return 'white-wolf';
  if (p.team === 'wolves') return 'wolves';
  if (p.team === 'solo') return 'solo';
  return 'village';
}

/**
 * Détermine si une condition de victoire est atteinte.
 * N'est appelée que lorsque aucune décision n'est en attente (aucun tir du
 * Chasseur, aucune succession…), afin de ne pas conclure trop tôt.
 */
export function detectVictory(state: GameState): Victory | null {
  const alive = state.players.filter((p) => p.alive);
  const ids = (ps: PlayerState[]): PlayerId[] => ps.map((p) => p.id);

  const reg = registryOf(state);
  if (state.angelVictory) {
    const angel = findPlayer(state, state.angelVictory);
    if (angel && angel.roleId !== 'ange' && reg.getCustom(angel.roleId)) {
      const def = reg.get(angel.roleId);
      return { winner: 'custom', customRoleId: angel.roleId, winners: [angel.id], reason: `${def.name} a été éliminé(e) dès le premier tour.` };
    }
    return { winner: 'angel', winners: [state.angelVictory], reason: 'L’Ange a été éliminé dès le premier tour.' };
  }
  if (alive.length === 0) {
    return { winner: 'none', winners: [], reason: 'Plus aucun survivant.' };
  }

  const piper = alive.find((p) => p.roleId === 'joueur-de-flute' && p.team === 'solo' && hasPowers(state, p));
  if (piper && alive.every((p) => p.id === piper.id || p.charmed)) {
    return { winner: 'piper', winners: [piper.id], reason: 'Tous les survivants sont charmés.' };
  }

  // Rôles personnalisés solitaires (conditions calquées sur les rôles officiels).
  for (const p of alive) {
    if (p.team !== 'solo') continue;
    const def = reg.getCustom(p.roleId);
    if (!def) continue;
    const win = effectiveWinCondition(def);
    const done = (reason: string): Victory => ({ winner: 'custom', customRoleId: p.roleId, winners: [p.id], reason });
    if (win === 'last-survivor' && alive.length === 1) return done(`${def.name} est le dernier survivant.`);
    if (win === 'all-marked' && hasPowers(state, p) && alive.every((o) => o.id === p.id || o.markedBy.includes(p.id))) {
      return done(`Tous les survivants ont été marqués par ${def.name}.`);
    }
    if (win === 'opposite-group' && state.setup.sectGroups) {
      const own = state.setup.sectGroups[p.id];
      if (own && alive.every((o) => state.setup.sectGroups?.[o.id] === own)) return done('Tout le groupe opposé a été éliminé.');
    }
  }

  const sectarian = alive.find((p) => p.roleId === 'sectaire' && p.team === 'solo');
  if (sectarian && state.setup.sectGroups) {
    const groups = state.setup.sectGroups;
    const own = groups[sectarian.id];
    const othersAlive = alive.filter((p) => groups[p.id] !== own);
    if (own && othersAlive.length === 0) {
      return { winner: 'sectarian', winners: [sectarian.id], reason: 'Tout le groupe opposé a été éliminé.' };
    }
  }

  if (alive.length === 1 && alive[0].roleId === 'loup-blanc') {
    return { winner: 'white-wolf', winners: ids(alive), reason: 'Le Loup-Garou blanc est le dernier survivant.' };
  }

  if (state.lovers) {
    const [a, b] = state.lovers.map((id) => findPlayer(state, id));
    if (a && b && a.alive && b.alive && sideOf(a) !== sideOf(b)) {
      const cupid = state.setup.variants.cupidWinsWithMixedLovers ? alive.find((p) => p.roleId === 'cupidon') : undefined;
      const allowed = new Set([a.id, b.id, ...(cupid ? [cupid.id] : [])]);
      if (alive.every((p) => allowed.has(p.id))) {
        return { winner: 'lovers', winners: [...allowed], reason: 'Les Amoureux sont les seuls survivants.' };
      }
    }
  }

  const sides = alive.map(sideOf);
  if (sides.every((s) => s === 'wolves')) {
    const winners = state.players.filter((p) => p.team === 'wolves' && p.roleId !== 'loup-blanc');
    return { winner: 'wolves', winners: ids(winners), reason: 'Il ne reste que des loups.' };
  }
  if (!alive.some(isWolfSide) && sides.every((s) => s === 'village')) {
    const winners = state.players.filter((p) => p.team === 'village');
    return { winner: 'village', winners: ids(winners), reason: 'Tous les loups ont été éliminés.' };
  }
  return null;
}
