import { RoleRegistry } from './roles/registry';
import type { GameState, Phase, PlayerId, PlayerState, RoleId } from './types';

/** Fonctions de lecture pures sur l'état de la partie. */

const registryCache = new WeakMap<object, RoleRegistry>();

export function registryOf(state: Pick<GameState, 'setup'>): RoleRegistry {
  let reg = registryCache.get(state.setup.customRoles);
  if (!reg) {
    reg = new RoleRegistry(state.setup.customRoles);
    registryCache.set(state.setup.customRoles, reg);
  }
  return reg;
}

export function phaseLabel(phase: Phase): string {
  switch (phase.kind) {
    case 'night':
      return `Nuit ${phase.number}`;
    case 'dawn':
      return `Aube ${phase.number}`;
    case 'day':
      return `Jour ${phase.number}`;
    case 'ended':
      return 'Fin de partie';
  }
}

export function getPlayer(state: Pick<GameState, 'players'>, id: PlayerId): PlayerState {
  const p = state.players.find((x) => x.id === id);
  if (!p) throw new Error(`Joueur inconnu : ${id}`);
  return p;
}

export function findPlayer(state: Pick<GameState, 'players'>, id: PlayerId | null | undefined): PlayerState | undefined {
  if (!id) return undefined;
  return state.players.find((x) => x.id === id);
}

export function alivePlayers(state: Pick<GameState, 'players'>): PlayerState[] {
  return state.players.filter((p) => p.alive);
}

/** Le joueur appartient-il au camp des loups (pour la meute, la Voyante, le Renard…) ? */
export function isWolfSide(p: PlayerState): boolean {
  return p.team === 'wolves' || p.roleId === 'loup-blanc';
}

/** Rôle effectif pour la nuit (prend en compte la carte du Comédien). */
export function effectiveRole(p: PlayerState): RoleId {
  return p.comedianRole ?? p.roleId;
}

/** Le joueur dispose-t-il encore de ses pouvoirs spéciaux ? */
export function hasPowers(state: Pick<GameState, 'villagePowersLost'>, p: PlayerState): boolean {
  if (!p.alive || p.powersLost) return false;
  if (state.villagePowersLost && p.team === 'village') return false;
  return true;
}

export function loverOf(state: Pick<GameState, 'lovers'>, id: PlayerId): PlayerId | null {
  if (!state.lovers) return null;
  if (state.lovers[0] === id) return state.lovers[1];
  if (state.lovers[1] === id) return state.lovers[0];
  return null;
}

/** Voisins vivants immédiats (gauche = place suivante, droite = place précédente). */
export function aliveNeighbors(state: Pick<GameState, 'players'>, id: PlayerId): { left: PlayerState | null; right: PlayerState | null } {
  const seats = [...state.players].sort((a, b) => a.seat - b.seat);
  const idx = seats.findIndex((p) => p.id === id);
  if (idx < 0) return { left: null, right: null };
  const n = seats.length;
  let left: PlayerState | null = null;
  let right: PlayerState | null = null;
  for (let k = 1; k < n; k++) {
    const p = seats[(idx + k) % n];
    if (p.alive && p.id !== id) {
      left = p;
      break;
    }
  }
  for (let k = 1; k < n; k++) {
    const p = seats[(idx - k + n * 2) % n];
    if (p.alive && p.id !== id) {
      right = p;
      break;
    }
  }
  return { left, right };
}

/** Premier loup vivant à gauche (sens horaire) d'un joueur, éventuellement parmi un groupe donné. */
export function firstWolfToLeft(state: Pick<GameState, 'players'>, id: PlayerId, among?: ReadonlySet<PlayerId>): PlayerState | null {
  const seats = [...state.players].sort((a, b) => a.seat - b.seat);
  const idx = seats.findIndex((p) => p.id === id);
  const n = seats.length;
  for (let k = 1; k < n; k++) {
    const p = seats[(idx + k) % n];
    if (p.alive && isWolfSide(p) && (!among || among.has(p.id))) return p;
  }
  return null;
}

/** Un joueur du camp des loups est-il déjà mort ? */
export function aWolfHasDied(state: Pick<GameState, 'players'>): boolean {
  return state.players.some((p) => !p.alive && isWolfSide(p));
}

/** Le Grand Méchant Loup a-t-il perdu sa seconde victime ? (selon la variante choisie) */
export function bigBadWolfBlocked(state: Pick<GameState, 'players' | 'setup'>): boolean {
  if (aWolfHasDied(state)) return true;
  if (state.setup.variants.bigBadWolfRule === 'wolf_or_ambiguous_died') {
    return state.players.some((p) => !p.alive && (p.roleId === 'enfant-sauvage' || p.roleId === 'chien-loup'));
  }
  return false;
}

/** Nuit de réveil solitaire du Loup-Garou blanc (« une nuit sur deux »). */
export function whiteWolfNight(state: Pick<GameState, 'setup'>, n: number): boolean {
  return state.setup.variants.whiteWolfNights === 'odd' ? n % 2 === 1 : n % 2 === 0;
}

export function isFirstRound(state: GameState): boolean {
  return state.nightNumber <= 1 && (state.phase.kind !== 'day' || state.phase.number <= 1);
}

export function activeBallot(state: GameState) {
  return state.ballots.find((b) => b.id === state.activeBallotId) ?? null;
}

/** Joueurs pouvant voter lors d'un scrutin du jour courant. */
export function eligibleVoters(state: GameState): PlayerId[] {
  const day = state.phase.kind === 'day' ? state.phase.number : state.dayNumber;
  const restricted = state.restrictedVoters && state.restrictedVoters.day === day ? new Set(state.restrictedVoters.voters) : null;
  return state.players
    .filter((p) => p.alive && !p.idiotRevealed && (!restricted || restricted.has(p.id)))
    .map((p) => p.id);
}

export function roleName(state: Pick<GameState, 'setup'>, roleId: RoleId): string {
  const reg = registryOf(state);
  return reg.has(roleId) ? reg.get(roleId).name : roleId;
}
