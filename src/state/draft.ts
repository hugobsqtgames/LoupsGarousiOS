import {
  BUILTIN_ROLE_LIST,
  COMEDIAN_ALLOWED,
  createRng,
  DEFAULT_VARIANTS,
  duplicateNames,
  generateComposition,
  MAX_NAME_LENGTH,
  normalizeName,
  shuffle,
  validateSetup,
  type BalanceAdjustments,
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
  /**
   * random : l'app tire les rôles, le MJ distribue les cartes physiques ;
   * phone : l'app tire les rôles et chaque joueur découvre le sien sur le téléphone ;
   * manual : le MJ saisit les cartes physiques reçues.
   */
  assignMode: 'random' | 'manual' | 'phone';
  assignments: Record<PlayerId, RoleId>;
  variants: Variants;
  sectGroups: Record<PlayerId, 'A' | 'B'>;
  seed: number;
  complexity: Complexity;
  expansions: Expansion[];
  allowSolo: boolean;
  explanations: string[];
  /** Ajuster les poids d'équilibrage d'après les parties terminées (absent = oui). */
  learnFromHistory?: boolean;
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
    expansions: ['base', 'nouvelle-lune', 'le-village', 'personnages'],
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

export interface Deal {
  assignments: Record<PlayerId, RoleId>;
  /** Deux cartes laissées au centre pour le Voleur (vide si le Voleur n'est pas distribué). */
  centerCards: RoleId[];
}

/** Cartes que l'application laisse toujours à un joueur (jamais au centre). */
const NEVER_CENTER = new Set<RoleId>(['voleur', 'comedien', 'deux-soeurs', 'trois-freres']);

/**
 * Distribution officielle avec le Voleur : on ajoute deux cartes au paquet,
 * on mélange, on distribue une carte par joueur et les deux restantes vont au
 * centre (règle du jeu de base). Limite de l'application : le Voleur, le
 * Comédien, les Sœurs et les Frères sont toujours distribués à un joueur
 * (une carte de ce type tirée au centre est échangée avec celle d'un joueur).
 */
export function dealCards(players: SetupPlayer[], roles: RoleId[], thiefCards: readonly RoleId[], seed: number): Deal {
  if (!roles.includes('voleur')) return { assignments: randomAssignments(players, roles, seed), centerCards: [] };
  const rng = createRng(seed);
  const deck = shuffle([...roles, ...thiefCards], rng);
  const n = players.length;
  for (let c = n; c < deck.length; c++) {
    if (!NEVER_CENTER.has(deck[c])) continue;
    const swap = deck.findIndex((r, i) => i < n && !NEVER_CENTER.has(r));
    if (swap >= 0) [deck[c], deck[swap]] = [deck[swap], deck[c]];
  }
  const assignments: Record<PlayerId, RoleId> = {};
  players.forEach((p, i) => {
    if (deck[i]) assignments[p.id] = deck[i];
  });
  return { assignments, centerCards: deck.slice(n, n + 2) };
}

/** Tirage effectif du brouillon (aperçu identique à la partie lancée). */
export function draftDeal(d: Draft): Deal {
  const roles = rolesFromCounts(d.roleCounts);
  if (d.assignMode === 'manual') return { assignments: d.assignments, centerCards: roles.includes('voleur') ? [...d.thiefCards] : [] };
  return dealCards(d.players, roles, d.thiefCards, d.seed);
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
  const deal = draftDeal(d);
  const assignments = deal.assignments;
  const dealt = d.players.map((p) => assignments[p.id]);
  const extraCards = [...(dealt.includes('voleur') ? deal.centerCards : []), ...(dealt.includes('comedien') ? d.comedianCards.slice(0, 3) : [])];
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
    sectGroups: needsGroups(roles, customRoles) ? Object.fromEntries(d.players.map((p, i) => [p.id, d.sectGroups[p.id] ?? (i % 2 === 0 ? 'A' : 'B')])) : undefined,
    ...(d.assignMode === 'phone' ? { dealMode: 'phone' as const } : {}),
  };
}

/** Deux groupes nécessaires : Abominable sectaire ou rôle personnalisé « groupe opposé ». */
export function needsGroups(roles: readonly RoleId[], customRoles: readonly CustomRoleDef[]): boolean {
  if (roles.includes('sectaire')) return true;
  return customRoles.some((c) => roles.includes(c.id) && c.winCondition === 'opposite-group');
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

export function applyAutoComposition(d: Draft, adjustments?: BalanceAdjustments): Draft {
  const include: RoleId[] = [];
  if ((d.roleCounts.voleur ?? 0) > 0) include.push('voleur');
  if ((d.roleCounts.comedien ?? 0) > 0) include.push('comedien');
  const comp = generateComposition({ playerCount: d.players.length, expansions: d.expansions, complexity: d.complexity, seed: d.seed, allowSolo: d.allowSolo, include, adjustments: d.learnFromHistory === false ? undefined : adjustments });
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
  // Les compositions importées ou anciennes peuvent omettre des champs.
  const names = Array.isArray(c.playerNames) ? c.playerNames.filter((n): n is string => typeof n === 'string').map((n) => n.slice(0, MAX_NAME_LENGTH)) : [];
  const players = names.length > 0 ? names.map((name) => ({ id: makePlayerId(), name })) : base.players;
  return {
    ...base,
    name: typeof c.name === 'string' ? c.name.slice(0, 60) : '',
    players,
    roleCounts: countsFromRoles(c.roles),
    ...splitExtraCards(c.roles, Array.isArray(c.extraCards) ? c.extraCards : []),
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
