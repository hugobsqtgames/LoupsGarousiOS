import { BUILTIN_ROLE_LIST, COMEDIAN_ALLOWED } from './roles/catalog';
import { effectiveWinCondition } from './roles/custom';
import { RoleRegistry, isCustomRoleId } from './roles/registry';
import { checkVariants } from './variants';
import type { BuiltinRoleId, GameSetup, GameState, PlayerState, RoleId } from './types';

export const MIN_PLAYERS = 5;
export const MAX_PLAYERS = 40;
export const MAX_NAME_LENGTH = 24;

export interface SetupIssue {
  level: 'error' | 'warning';
  code: string;
  message: string;
}

export function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}

export function nameKey(name: string): string {
  return normalizeName(name)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

/** Noms en double (insensible à la casse et aux accents). */
export function duplicateNames(names: readonly string[]): string[] {
  const seen = new Map<string, number>();
  for (const n of names) {
    const k = nameKey(n);
    if (!k) continue;
    seen.set(k, (seen.get(k) ?? 0) + 1);
  }
  return names.filter((n, i) => {
    const k = nameKey(n);
    return (seen.get(k) ?? 0) > 1 && names.findIndex((m) => nameKey(m) === k) === i;
  });
}

export function countRoles(roles: readonly RoleId[]): Map<RoleId, number> {
  const m = new Map<RoleId, number>();
  for (const r of roles) m.set(r, (m.get(r) ?? 0) + 1);
  return m;
}

/** Nombre de cartes hors jeu nécessaires pour une liste de rôles distribués. */
export function requiredExtraCards(roles: readonly RoleId[]): number {
  return (roles.includes('voleur') ? 2 : 0) + (roles.includes('comedien') ? 3 : 0);
}

const WOLF_CAPABLE: readonly RoleId[] = ['loup-garou', 'grand-mechant-loup', 'infect', 'loup-blanc', 'chien-loup', 'enfant-sauvage'];

/**
 * Vérifie la cohérence d'une configuration avant le lancement.
 * Les erreurs empêchent le démarrage ; les avertissements sont informatifs.
 */
export function validateSetup(setup: GameSetup): SetupIssue[] {
  const issues: SetupIssue[] = [];
  const reg = new RoleRegistry(setup.customRoles);
  const n = setup.players.length;

  if (n < MIN_PLAYERS) issues.push({ level: 'error', code: 'too-few', message: `Il faut au moins ${MIN_PLAYERS} joueurs.` });
  if (n > MAX_PLAYERS) issues.push({ level: 'error', code: 'too-many', message: `${MAX_PLAYERS} joueurs maximum.` });
  if (n >= MIN_PLAYERS && (n < 8 || n > 18)) {
    issues.push({ level: 'warning', code: 'outside-official', message: 'La règle de base est prévue pour 8 à 18 joueurs.' });
  }

  const ids = new Set<string>();
  for (const p of setup.players) {
    if (ids.has(p.id)) issues.push({ level: 'error', code: 'dup-id', message: `Identifiant de joueur dupliqué : ${p.id}` });
    ids.add(p.id);
    const name = normalizeName(p.name);
    if (!name) issues.push({ level: 'error', code: 'empty-name', message: 'Un joueur n’a pas de nom.' });
    if (name.length > MAX_NAME_LENGTH) issues.push({ level: 'error', code: 'long-name', message: `Nom trop long : ${name.slice(0, 30)}…` });
  }
  for (const d of duplicateNames(setup.players.map((p) => p.name))) {
    issues.push({ level: 'error', code: 'dup-name', message: `Nom en double : « ${normalizeName(d)} ».` });
  }

  const assigned: RoleId[] = [];
  for (const p of setup.players) {
    const r = setup.assignments[p.id];
    if (!r) {
      issues.push({ level: 'error', code: 'unassigned', message: `${normalizeName(p.name) || 'Un joueur'} n’a pas de rôle.` });
      continue;
    }
    if (!reg.has(r)) {
      issues.push({ level: 'error', code: 'unknown-role', message: `Rôle inconnu : ${r}` });
      continue;
    }
    assigned.push(r);
  }
  for (const key of Object.keys(setup.assignments)) {
    if (!ids.has(key)) issues.push({ level: 'error', code: 'orphan-assignment', message: 'Attribution d’un rôle à un joueur inexistant.' });
  }

  for (const r of setup.extraCards) {
    if (!reg.has(r)) issues.push({ level: 'error', code: 'unknown-extra', message: `Carte hors jeu inconnue : ${r}` });
  }
  const needExtra = requiredExtraCards(assigned);
  if (setup.extraCards.length !== needExtra) {
    issues.push({
      level: 'error',
      code: 'extra-count',
      message: needExtra === 0 ? 'Aucune carte hors jeu n’est nécessaire.' : `Il faut exactement ${needExtra} carte(s) hors jeu (Voleur : 2, Comédien : 3).`,
    });
  }
  if (assigned.includes('comedien') && setup.extraCards.length === needExtra) {
    const comedianCards = setup.extraCards.slice(assigned.includes('voleur') ? 2 : 0);
    for (const c of comedianCards) {
      if (!COMEDIAN_ALLOWED.includes(c as BuiltinRoleId)) {
        issues.push({ level: 'error', code: 'comedian-card', message: `Carte non autorisée pour le Comédien : ${reg.has(c) ? reg.get(c).name : c}.` });
      }
    }
  }
  if (setup.extraCards.includes('voleur') || setup.extraCards.includes('comedien')) {
    issues.push({ level: 'error', code: 'extra-forbidden', message: 'Le Voleur et le Comédien ne peuvent pas être hors jeu.' });
  }

  const all = [...assigned, ...setup.extraCards];
  const counts = countRoles(all);
  for (const [roleId, count] of counts) {
    if (!reg.has(roleId)) continue;
    const def = reg.get(roleId);
    const inPlay = assigned.filter((r) => r === roleId).length;
    if (count > def.maxCopies) issues.push({ level: 'error', code: 'max-copies', message: `${def.name} : ${def.maxCopies} exemplaire(s) maximum.` });
    if (def.exactCopies && inPlay > 0 && inPlay !== def.exactCopies) {
      issues.push({ level: 'error', code: 'exact-copies', message: `${def.name} : exactement ${def.exactCopies} joueurs requis.` });
    }
  }

  const wolves = assigned.filter((r) => reg.has(r) && reg.get(r).team === 'wolves').length;
  const wolfCapable = all.filter((r) => WOLF_CAPABLE.includes(r) || (isCustomRoleId(r) && reg.has(r) && reg.get(r).team === 'wolves')).length;
  if (n >= MIN_PLAYERS && wolfCapable === 0) issues.push({ level: 'error', code: 'no-wolf', message: 'La composition ne contient aucun loup.' });
  if (wolves > 0 && wolves >= n / 2) issues.push({ level: 'error', code: 'wolf-majority', message: 'Les loups seraient majoritaires dès le départ.' });
  else if (wolves > 0 && wolves > n / 3) issues.push({ level: 'warning', code: 'many-wolves', message: 'Beaucoup de loups pour ce nombre de joueurs.' });
  if (assigned.includes('voleur') && setup.extraCards.length >= 2) {
    const thiefCards = setup.extraCards.slice(0, 2);
    if (thiefCards.every((c) => c === 'loup-garou')) {
      issues.push({ level: 'warning', code: 'thief-wolves', message: 'Les deux cartes du Voleur sont des loups : il devra en prendre une.' });
    }
  }
  if (assigned.includes('joueur-de-flute') && n < 8) {
    issues.push({ level: 'warning', code: 'piper-small', message: 'Le Joueur de flûte gagne très vite dans une petite partie.' });
  }
  if (assigned.includes('loup-blanc') && wolves < 2) {
    issues.push({ level: 'warning', code: 'white-wolf-alone', message: 'Le Loup-Garou blanc a besoin d’au moins un autre loup.' });
  }
  if (assigned.includes('grand-mechant-loup') && assigned.includes('infect') && n < 12) {
    issues.push({ level: 'warning', code: 'strong-wolves', message: 'Grand Méchant Loup + Infect dans une petite partie : loups très avantagés.' });
  }
  for (const def of setup.customRoles) {
    if (!assigned.includes(def.id)) continue;
    const win = effectiveWinCondition(def);
    if (win === 'opposite-group') {
      const groups = setup.sectGroups ?? {};
      if (setup.players.some((p) => groups[p.id] !== 'A' && groups[p.id] !== 'B')) {
        issues.push({ level: 'error', code: 'custom-groups', message: `${def.name} : définissez les deux groupes (comme pour l’Abominable sectaire).` });
      }
    }
  }
  if (assigned.includes('gitane') && !setup.variants.newMoonEvents) {
    issues.push({ level: 'warning', code: 'gypsy-cards', message: 'La Gitane utilise les 5 cartes Spiritisme de l’extension Nouvelle Lune : gardez-les à portée de main.' });
  }
  if (assigned.includes('sectaire')) {
    const groups = setup.sectGroups ?? {};
    const missing = setup.players.filter((p) => groups[p.id] !== 'A' && groups[p.id] !== 'B');
    if (missing.length > 0) issues.push({ level: 'error', code: 'sect-groups', message: 'Tous les joueurs doivent appartenir à un groupe (Abominable sectaire).' });
    const a = setup.players.filter((p) => groups[p.id] === 'A').length;
    const b = setup.players.filter((p) => groups[p.id] === 'B').length;
    if (missing.length === 0 && (a === 0 || b === 0)) issues.push({ level: 'error', code: 'sect-empty', message: 'Les deux groupes du Sectaire doivent être non vides.' });
  }
  for (const v of checkVariants(setup.variants)) {
    issues.push({ level: v.level, code: 'variant', message: v.message });
  }
  return issues;
}

export function setupErrors(setup: GameSetup): SetupIssue[] {
  return validateSetup(setup).filter((i) => i.level === 'error');
}

export function initialUses(roleId: RoleId, reg: RoleRegistry): Record<string, number> {
  switch (roleId) {
    case 'sorciere':
      return { heal: 1, poison: 1 };
    case 'chasseur':
      return { shot: 1 };
    case 'ancien':
      return { extraLife: 1 };
    case 'infect':
      return { infect: 1 };
    case 'juge-begue':
      return { judge: 1 };
    case 'servante':
      return { servant: 1 };
    case 'gitane':
      return { spirit: 5 };
    default: {
      const c = reg.getCustom(roleId);
      if (!c) return {};
      const uses: Record<string, number> = {};
      if (c.nightAction !== 'none') uses.custom = c.uses ?? -1;
      if (c.onDeath === 'shoot') uses.shot = 1;
      return uses;
    }
  }
}

export function makePlayerState(id: string, name: string, seat: number, roleId: RoleId, reg: RoleRegistry): PlayerState {
  const def = reg.get(roleId);
  return {
    id,
    name: normalizeName(name),
    seat,
    roleId,
    originalRoleId: roleId,
    team: def.team,
    alive: true,
    death: null,
    uses: initialUses(roleId, reg),
    charmed: false,
    infected: false,
    idiotRevealed: false,
    powersLost: false,
    foxPowerLost: false,
    transformed: false,
    lastProtected: null,
    wildChildModel: null,
    comedianRole: null,
    firstNight: 1,
    markedBy: [],
    spiritCardsUsed: [],
  };
}

/** État « avant la première action ». L'appelant doit avoir validé la configuration. */
export function createInitialState(setup: GameSetup): GameState {
  const reg = new RoleRegistry(setup.customRoles);
  const players = setup.players.map((p, seat) => makePlayerState(p.id, p.name, seat, setup.assignments[p.id], reg));
  const hasThief = players.some((p) => p.roleId === 'voleur');
  const hasComedian = players.some((p) => p.roleId === 'comedien');
  return {
    setup,
    phase: { kind: 'night', number: 0 },
    nightNumber: 0,
    dayNumber: 0,
    players,
    lovers: null,
    mayorId: null,
    mayorEverElected: false,
    mayorAbolished: false,
    events: [],
    extraVotesToday: 0,
    spiritQuestion: null,
    night: null,
    dawnReport: [],
    ballots: [],
    activeBallotId: null,
    pending: [],
    ravenMark: null,
    restrictedVoters: null,
    rustyCurse: null,
    comedianCards: hasComedian ? setup.extraCards.slice(hasThief ? 2 : 0) : [],
    villagePowersLost: false,
    angelVictory: null,
    eliminationsToday: 0,
    judgeSecondVoteAvailable: false,
    victory: null,
    log: [],
    actionCount: 0,
    idCounter: 0,
  };
}

/** Rôles intégrés jouables, pour l'interface. */
export function builtinRoleIds(): RoleId[] {
  return BUILTIN_ROLE_LIST.map((r) => r.id);
}
