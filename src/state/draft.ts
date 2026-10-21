import {
  BUILTIN_ROLE_LIST,
  COMEDIAN_ALLOWED,
  createRng,
  DEFAULT_VARIANTS,
  duplicateNames,
  generateComposition,
  normalizeName,
  shuffle,
  validateSetup,
  type Complexity,
  type CustomRoleDef,
  type Expansion,
  type GameSetup,
  type PlayerId,
  type RoleId,
  type SetupIssue,
  type SetupPlayer,
  type Variants,
} from '@/engine';
import type { SavedComposition } from '@/storage/repository';

/** Brouillon de configuration d'une partie (assistant de création). */
export interface Draft {
  name: string;
  players: SetupPlayer[];
  roleCounts: Partial<Record<RoleId, number>>;
  /** Deux cartes proposées au Voleur. */
  thiefCards: [RoleId, RoleId];
  /** Trois cartes du Comédien. */
  comedianCards: RoleId[];
  assignMode: 'random' | 'manual';
  assignments: Record<PlayerId, RoleId>;
  variants: Variants;
  sectGroups: Record<PlayerId, 'A' | 'B'>;
  seed: number;
  complexity: Complexity;
  expansions: Expansion[];
  allowSolo: boolean;
  explanations: string[];
}

export function emptyDraft(variants: Variants = DEFAULT_VARIANTS, seed = Date.now() % 1_000_000): Draft {
  return {
    name: '',
    players: [],
    roleCounts: {},
    thiefCards: ['villageois', 'villageois'],
    comedianCards: ['voyante', 'salvateur', 'renard'],
    assignMode: 'random',
    assignments: {},
    variants,
    sectGroups: {},
    seed,
    complexity: 'equilibre',
    expansions: ['base', 'nouvelle-lune', 'personnages'],
    allowSolo: false,
    explanations: [],
  };
}

const ORDER = new Map<RoleId, number>(BUILTIN_ROLE_LIST.map((r, i) => [r.id, i]));

/** Liste ordonnée des cartes distribuées, à partir des quantités. */
export function rolesFromCounts(counts: Draft['roleCounts']): RoleId[] {
  const ids = (Object.keys(counts) as RoleId[]).filter((r) => (counts[r] ?? 0) > 0);
  ids.sort((a, b) => (ORDER.get(a) ?? 999) - (ORDER.get(b) ?? 999) || a.localeCompare(b));
  return ids.flatMap((r) => Array<RoleId>(counts[r] ?? 0).fill(r));
}

export function countsFromRoles(roles: readonly RoleId[]): Draft['roleCounts'] {
  const c: Draft['roleCounts'] = {};
  for (const r of roles) c[r] = (c[r] ?? 0) + 1;
  return c;
}

export function cardCount(d: Draft): number {
  return rolesFromCounts(d.roleCounts).length;
}

/** Cartes encore disponibles pour l'attribution manuelle. */
export function remainingCards(d: Draft): Draft['roleCounts'] {
  const left: Draft['roleCounts'] = { ...d.roleCounts };
  for (const p of d.players) {
    const r = d.assignments[p.id];
    if (r && (left[r] ?? 0) > 0) left[r] = (left[r] ?? 0) - 1;
  }
  return left;
}

/** Distribution aléatoire reproductible (graine) des cartes aux joueurs. */
export function randomAssignments(players: SetupPlayer[], roles: RoleId[], seed: number): Record<PlayerId, RoleId> {
  const deck = shuffle(roles, createRng(seed));
  const out: Record<PlayerId, RoleId> = {};
  players.forEach((p, i) => {
    if (deck[i]) out[p.id] = deck[i];
  });
  return out;
}

/** Cartes hors jeu effectives : Voleur (2) puis Comédien (3), selon les rôles présents. */
export function extraCardsOf(d: Draft): RoleId[] {
  const roles = rolesFromCounts(d.roleCounts);
  return [...(roles.includes('voleur') ? d.thiefCards : []), ...(roles.includes('comedien') ? d.comedianCards.slice(0, 3) : [])];
}

/** Cartes du Comédien par défaut : pouvoirs autorisés absents de la composition. */
export function defaultComedianCards(roles: readonly RoleId[]): RoleId[] {
  const pool = COMEDIAN_ALLOWED.filter((c) => c !== 'villageois' && !roles.includes(c));
  while (pool.length < 3) pool.push('villageois');
  return pool.slice(0, 3);
}

export function buildSetup(d: Draft, id: string, now: string, customRoles: CustomRoleDef[]): GameSetup {
  const roles = rolesFromCounts(d.roleCounts);
  const assignments = d.assignMode === 'random' ? randomAssignments(d.players, roles, d.seed) : d.assignments;
  const extraCards = extraCardsOf(d);
  const used = new Set<RoleId>([...roles, ...extraCards]);
  return {
    formatVersion: 1,
    id,
    name: normalizeName(d.name) || `Partie du ${now.slice(0, 10).split('-').reverse().join('/')}`,
    createdAt: now,
    players: d.players.map((p) => ({ id: p.id, name: normalizeName(p.name) })),
    assignments: Object.fromEntries(d.players.map((p) => [p.id, assignments[p.id]])),
    extraCards,
    variants: d.variants,
    customRoles: customRoles.filter((c) => used.has(c.id)),
    sectGroups: roles.includes('sectaire') ? Object.fromEntries(d.players.map((p, i) => [p.id, d.sectGroups[p.id] ?? (i % 2 === 0 ? 'A' : 'B')])) : undefined,
  };
}

/** Problèmes de configuration, avec ceux propres à l'assistant. */
export function draftIssues(d: Draft, customRoles: CustomRoleDef[]): SetupIssue[] {
  const issues: SetupIssue[] = [];
  const cards = cardCount(d);
  if (cards !== d.players.length) {
    issues.push({ level: 'error', code: 'card-count', message: `${cards} carte(s) pour ${d.players.length} joueur(s) : les nombres doivent être égaux.` });
  }
  if (d.assignMode === 'manual') {
    const missing = d.players.filter((p) => !d.assignments[p.id]).length;
    if (missing > 0) issues.push({ level: 'error', code: 'manual-missing', message: `${missing} joueur(s) sans carte attribuée.` });
    const left = remainingCards(d);
    if (Object.values(left).some((n) => (n ?? 0) < 0)) issues.push({ level: 'error', code: 'manual-excess', message: 'Une carte est attribuée plus de fois qu’elle n’existe.' });
  }
  const setup = buildSetup(d, 'draft', new Date(0).toISOString(), customRoles);
  const seen = new Set(issues.map((i) => i.code));
  for (const i of validateSetup(setup)) {
    if (i.code === 'unassigned' && (seen.has('card-count') || seen.has('manual-missing'))) continue;
    issues.push(i);
  }
  return issues;
}

export function applyAutoComposition(d: Draft): Draft {
  const include: RoleId[] = [];
  if ((d.roleCounts.voleur ?? 0) > 0) include.push('voleur');
  if ((d.roleCounts.comedien ?? 0) > 0) include.push('comedien');
  const comp = generateComposition({ playerCount: d.players.length, expansions: d.expansions, complexity: d.complexity, seed: d.seed, allowSolo: d.allowSolo, include });
  const hasThief = comp.roles.includes('voleur');
  const thiefCards: [RoleId, RoleId] = hasThief ? [comp.extraCards[0], comp.extraCards[1]] : d.thiefCards;
  const comedianCards = comp.roles.includes('comedien') ? comp.extraCards.slice(hasThief ? 2 : 0) : d.comedianCards;
  return { ...d, roleCounts: countsFromRoles(comp.roles), thiefCards, comedianCards, explanations: comp.explanations, assignments: {} };
}

export function draftFromSetup(setup: GameSetup, seed = Date.now() % 1_000_000): Draft {
  const roles = setup.players.map((p) => setup.assignments[p.id]);
  return {
    ...emptyDraft(setup.variants, seed),
    name: setup.name,
    players: setup.players.map((p) => ({ ...p })),
    roleCounts: countsFromRoles(roles),
    ...splitExtraCards(roles, setup.extraCards),
    assignMode: 'random',
    sectGroups: { ...(setup.sectGroups ?? {}) },
  };
}

export function draftFromComposition(c: SavedComposition, base: Draft, makePlayerId: () => string): Draft {
  const players = c.playerNames.length > 0 ? c.playerNames.map((name) => ({ id: makePlayerId(), name })) : base.players;
  return {
    ...base,
    name: c.name,
    players,
    roleCounts: countsFromRoles(c.roles),
    ...splitExtraCards(c.roles, c.extraCards),
    assignments: {},
    explanations: [],
  };
}

function splitExtraCards(roles: readonly RoleId[], extra: readonly RoleId[]): Pick<Draft, 'thiefCards' | 'comedianCards'> {
  const hasThief = roles.includes('voleur');
  const thiefCards: [RoleId, RoleId] = hasThief && extra.length >= 2 ? [extra[0], extra[1]] : ['villageois', 'villageois'];
  const comedianCards = roles.includes('comedien') ? extra.slice(hasThief ? 2 : 0, (hasThief ? 2 : 0) + 3) : defaultComedianCards(roles);
  return { thiefCards, comedianCards: comedianCards.length === 3 ? comedianCards : defaultComedianCards(roles) };
}

export function nameIssues(players: SetupPlayer[]): string[] {
  return duplicateNames(players.map((p) => p.name)).map((n) => normalizeName(n));
}
