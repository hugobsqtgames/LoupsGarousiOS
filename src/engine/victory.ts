import { findPlayer, hasPowers, isWolfSide } from './selectors';
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

  if (state.angelVictory) {
    return { winner: 'angel', winners: [state.angelVictory], reason: 'L’Ange a été éliminé dès le premier tour.' };
  }
  if (alive.length === 0) {
    return { winner: 'none', winners: [], reason: 'Plus aucun survivant.' };
  }

  const piper = alive.find((p) => p.roleId === 'joueur-de-flute' && p.team === 'solo' && hasPowers(state, p));
  if (piper && alive.every((p) => p.id === piper.id || p.charmed)) {
    return { winner: 'piper', winners: [piper.id], reason: 'Tous les survivants sont charmés.' };
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
