import {
  createRng,
  DEFAULT_VARIANTS,
  generateComposition,
  recommendedWolves,
  setupErrors,
  startGame,
  type Complexity,
  type Expansion,
  type RoleId,
} from '@/engine';
import { normalizeSettings } from '@/settings/settings';
import { buildSetup, dealCards, emptyDraft, countsFromRoles } from '@/state/draft';
import { DataError, parseActions, parseSetup } from '@/storage/validation';
import { invariantsOf, seeds } from './helpers';

/**
 * Campagne QA — compositions automatiques, distribution officielle N+2,
 * création de partie et validateurs d'entrée.
 */

const EXPANSION_SETS: Expansion[][] = [['base'], ['base', 'nouvelle-lune'], ['base', 'personnages'], ['base', 'nouvelle-lune', 'le-village', 'personnages']];
const COMPLEXITIES: Complexity[] = ['decouverte', 'equilibre', 'riche'];

const compCases: [number, Complexity, number, boolean][] = [];
for (let n = 5; n <= 40; n++) for (const c of COMPLEXITIES) for (let e = 0; e < EXPANSION_SETS.length; e++) for (const solo of [false, true]) compCases.push([n, c, e, solo]);

describe.each(compCases)('composition %i joueurs, %s, extensions #%i, solo %s', (n, complexity, e, allowSolo) => {
  it('valide, jouable, autant de cartes que de joueurs', () => {
    const seed = n * 1000 + e * 10 + (allowSolo ? 1 : 0);
    const comp = generateComposition({ playerCount: n, expansions: EXPANSION_SETS[e], complexity, seed, allowSolo });
    expect(comp.roles).toHaveLength(n);
    const wolves = comp.roles.filter((r) => r === 'loup-garou').length;
    expect(wolves).toBeGreaterThanOrEqual(1);
    expect(wolves).toBeLessThanOrEqual(recommendedWolves(n));
    const players = comp.roles.map((_, i) => ({ id: `p${i + 1}`, name: `Joueur ${i + 1}` }));
    const draft = { ...emptyDraft(DEFAULT_VARIANTS, seed), players, roleCounts: countsFromRoles(comp.roles), thiefCards: (comp.extraCards.slice(0, 2).length === 2 ? comp.extraCards.slice(0, 2) : ['villageois', 'villageois']) as [RoleId, RoleId] };
    const setup = buildSetup(draft, `g-${seed}`, '2026-01-01T00:00:00.000Z', []);
    expect(setupErrors(setup).map((i) => i.message)).toEqual([]);
    // Toute partie créable est relisible et démarre dans un état cohérent.
    const reread = parseSetup(JSON.parse(JSON.stringify(setup)));
    expect(invariantsOf(startGame(reread))).toEqual([]);
  });
});

const ROLE_POOL: RoleId[] = ['loup-garou', 'voyante', 'sorciere', 'chasseur', 'cupidon', 'villageois', 'deux-soeurs', 'trois-freres', 'comedien', 'salvateur', 'idiot', 'ancien'];

describe.each(seeds(1, 500))('distribution avec Voleur, graine %i', (seed) => {
  it('N+2 cartes : multiset conservé, Voleur jamais au centre, une carte par joueur', () => {
    const rng = createRng(seed);
    const n = 5 + Math.floor(rng() * 15);
    const roles: RoleId[] = ['voleur', 'loup-garou'];
    while (roles.length < n) {
      const r = ROLE_POOL[Math.floor(rng() * ROLE_POOL.length)];
      if (r === 'deux-soeurs' && roles.length + 2 <= n) roles.push(r, r);
      else if (r === 'trois-freres' && roles.length + 3 <= n) roles.push(r, r, r);
      else if (r !== 'deux-soeurs' && r !== 'trois-freres') roles.push(r);
    }
    const thief = [ROLE_POOL[Math.floor(rng() * 6)], ROLE_POOL[Math.floor(rng() * 6)]] as const;
    const players = roles.map((_, i) => ({ id: `p${i}`, name: `J${i}` }));
    const deal = dealCards(players, roles, thief, seed);
    expect(Object.keys(deal.assignments)).toHaveLength(n);
    expect(deal.centerCards).toHaveLength(2);
    const all = [...Object.values(deal.assignments), ...deal.centerCards].sort();
    expect(all).toEqual([...roles, ...thief].sort());
    expect(Object.values(deal.assignments)).toContain('voleur');
    for (const c of deal.centerCards) expect(['voleur', 'comedien', 'deux-soeurs', 'trois-freres']).not.toContain(c);
    // Reproductible : même graine, même distribution.
    expect(dealCards(players, roles, thief, seed)).toEqual(deal);
  });
});

const JUNK: unknown[] = [undefined, null, 0, 1, -1, NaN, '', 'x'.repeat(300), [], {}, true, [1, 2], { a: 1 }, '<script>', '\u0000', '💀'];

function junkSetup(seed: number): unknown {
  const rng = createRng(seed);
  const pick = () => JUNK[Math.floor(rng() * JUNK.length)];
  const base: Record<string, unknown> = {
    formatVersion: 1,
    id: 'g',
    name: 'n',
    createdAt: '2026',
    players: [
      { id: 'a', name: 'A' },
      { id: 'b', name: 'B' },
    ],
    assignments: { a: 'loup-garou', b: 'villageois' },
    extraCards: [],
    variants: {},
    customRoles: [],
  };
  const keys = Object.keys(base);
  for (let k = 0; k < 1 + Math.floor(rng() * 3); k++) {
    const key = keys[Math.floor(rng() * keys.length)];
    if (rng() < 0.5) base[key] = pick();
    else if (key === 'players') (base.players as unknown[]).push(rng() < 0.5 ? pick() : { id: 'a', name: 'Doublon' });
    else if (key === 'assignments') (base.assignments as Record<string, unknown>).a = pick();
    else if (key === 'customRoles') base.customRoles = [pick()];
    else base[key] = pick();
  }
  return rng() < 0.05 ? pick() : base;
}

describe.each(seeds(1, 600))('validateurs, entrée aléatoire %i', (seed) => {
  it('configuration : refus explicite (DataError) ou configuration complète', () => {
    let s;
    try {
      s = parseSetup(junkSetup(seed));
    } catch (e) {
      expect(e).toBeInstanceOf(DataError);
      return;
    }
    expect(typeof s.id).toBe('string');
    expect(s.players.length).toBeGreaterThan(0);
    expect(new Set(s.players.map((p) => p.id)).size).toBe(s.players.length);
    for (const p of s.players) expect(typeof s.assignments[p.id]).toBe('string');
  });

  it('historique : refus explicite ou actions bien formées', () => {
    const rng = createRng(seed + 1);
    const pick = () => JUNK[Math.floor(rng() * JUNK.length)];
    const input = rng() < 0.2 ? pick() : Array.from({ length: Math.floor(rng() * 4) }, () => (rng() < 0.5 ? { action: { type: pick() } } : { action: { type: 'mj/note', text: pick() } }));
    try {
      const a = parseActions(input);
      for (const x of a) expect(typeof x.action.type).toBe('string');
    } catch (e) {
      expect(e).toBeInstanceOf(DataError);
    }
  });

  it('paramètres : toujours normalisés et idempotents', () => {
    const rng = createRng(seed + 2);
    const keys = Object.keys(normalizeSettings(undefined));
    const input: Record<string, unknown> = {};
    for (const k of keys) if (rng() < 0.4) input[k] = JUNK[Math.floor(rng() * JUNK.length)];
    const out = normalizeSettings(rng() < 0.1 ? JUNK[Math.floor(rng() * JUNK.length)] : input);
    expect(normalizeSettings(out)).toEqual(out);
    for (const k of keys) expect(typeof out[k as keyof typeof out]).toBe(typeof normalizeSettings(undefined)[k as keyof typeof out]);
  });
});
