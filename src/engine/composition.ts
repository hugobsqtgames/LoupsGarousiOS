import { BUILTIN_ROLES, COMEDIAN_ALLOWED } from './roles/catalog';
import { createRng, shuffle } from './rng';
import { MAX_PLAYERS, MIN_PLAYERS } from './setup';
import type { BuiltinRoleId, Expansion, RoleId } from './types';

/**
 * Composition automatique.
 *
 * Règles (documentées dans docs/RULES.md#composition-automatique) :
 *  1. Nombre de loups selon la table officielle (8–18 joueurs) étendue :
 *     5–6 → 1, 7–11 → 2, 12–17 → 3, 18–23 → 4, 24–29 → 5, 30+ → 6.
 *  2. La Voyante est toujours présente (rôle d'information central).
 *  3. Les rôles spéciaux sont tirés, par ordre de priorité puis au hasard
 *     (graine reproductible), parmi les extensions choisies et le niveau
 *     de complexité, jusqu'au quota de rôles spéciaux.
 *  4. Chaque ajout est refusé s'il fait sortir l'équilibre (somme des poids
 *     heuristiques) de la plage [-tolérance ; +tolérance].
 *  5. Le reste est complété par de Simples Villageois.
 *  6. Une passe de correction remplace un rôle trop favorable à un camp
 *     tant que l'équilibre reste hors plage.
 */

export type Complexity = 'decouverte' | 'equilibre' | 'riche';

export interface AutoCompositionOptions {
  playerCount: number;
  expansions: Expansion[];
  complexity: Complexity;
  seed: number;
  include?: RoleId[];
  exclude?: RoleId[];
  allowSolo?: boolean;
}

export interface AutoComposition {
  roles: RoleId[];
  extraCards: RoleId[];
  balance: number;
  explanations: string[];
}

export function recommendedWolves(n: number): number {
  if (n <= 6) return 1;
  if (n <= 11) return 2;
  if (n <= 17) return 3;
  if (n <= 23) return 4;
  if (n <= 29) return 5;
  return 6;
}

const TIERS: Record<Complexity, BuiltinRoleId[][]> = {
  decouverte: [['sorciere', 'chasseur'], ['cupidon', 'petite-fille']],
  equilibre: [
    ['sorciere', 'chasseur'],
    ['cupidon', 'salvateur', 'petite-fille'],
    ['ancien', 'idiot', 'renard', 'corbeau', 'montreur-ours', 'bouc-emissaire', 'chevalier'],
  ],
  riche: [
    ['sorciere', 'chasseur'],
    ['cupidon', 'salvateur', 'petite-fille', 'ancien'],
    ['idiot', 'renard', 'corbeau', 'montreur-ours', 'bouc-emissaire', 'chevalier', 'juge-begue', 'servante'],
    ['deux-soeurs', 'trois-freres', 'enfant-sauvage', 'chien-loup', 'villageois-villageois'],
  ],
};

const SPECIAL_WOLVES: BuiltinRoleId[] = ['grand-mechant-loup', 'infect', 'loup-blanc'];
const SOLOS: BuiltinRoleId[] = ['joueur-de-flute', 'ange'];

function specialQuota(n: number, c: Complexity): number {
  if (c === 'decouverte') return Math.min(3, n - recommendedWolves(n) - 1);
  if (c === 'equilibre') return Math.max(2, Math.round(n * 0.4));
  return Math.max(3, Math.round(n * 0.55));
}

function weight(id: RoleId): number {
  return BUILTIN_ROLES.get(id as BuiltinRoleId)?.balance ?? 0;
}

function copiesOf(id: RoleId): number {
  return BUILTIN_ROLES.get(id as BuiltinRoleId)?.exactCopies ?? 1;
}

export function balanceOf(roles: readonly RoleId[]): number {
  return roles.reduce((s, r) => s + weight(r), 0);
}

export function generateComposition(opts: AutoCompositionOptions): AutoComposition {
  const n = Math.max(MIN_PLAYERS, Math.min(MAX_PLAYERS, Math.floor(opts.playerCount)));
  const rng = createRng(opts.seed);
  const explanations: string[] = [];
  const exclude = new Set(opts.exclude ?? []);
  const allowed = (id: BuiltinRoleId) => {
    const def = BUILTIN_ROLES.get(id);
    return Boolean(def && opts.expansions.includes(def.expansion) && !exclude.has(id));
  };
  const tolerance = Math.max(3, Math.round(n / 3));
  const roles: RoleId[] = [];
  const has = (id: RoleId) => roles.includes(id);

  const wolves = recommendedWolves(n);
  explanations.push(`${wolves} loup(s) pour ${n} joueurs (table de répartition).`);
  for (let i = 0; i < wolves; i++) roles.push('loup-garou');

  if (opts.complexity === 'riche' && n >= 10) {
    const special = shuffle(SPECIAL_WOLVES.filter(allowed), rng)[0];
    if (special) {
      roles[0] = special;
      explanations.push(`Un loup spécial (${BUILTIN_ROLES.get(special)!.name}) remplace un Loup-Garou (complexité riche, 10 joueurs ou plus).`);
    }
  }

  for (const forced of opts.include ?? []) {
    if (forced === 'voleur' || forced === 'comedien') continue;
    const copies = copiesOf(forced);
    if (!has(forced) && roles.length + copies <= n) {
      for (let i = 0; i < copies; i++) roles.push(forced);
      explanations.push(`${BUILTIN_ROLES.get(forced as BuiltinRoleId)?.name ?? forced} ajouté(e) à votre demande.`);
    }
  }

  if (allowed('voyante') && !has('voyante')) {
    roles.push('voyante');
    explanations.push('La Voyante est toujours incluse : c’est la principale source d’information du village.');
  }

  const quota = specialQuota(n, opts.complexity);
  let specials = roles.filter((r) => r !== 'loup-garou' && r !== 'villageois' && !SPECIAL_WOLVES.includes(r as BuiltinRoleId)).length;
  const pool: BuiltinRoleId[] = [];
  for (const tier of TIERS[opts.complexity]) pool.push(...shuffle(tier.filter(allowed), rng));
  if (opts.allowSolo && opts.complexity !== 'decouverte' && n >= 10) pool.splice(Math.min(pool.length, 4), 0, ...shuffle(SOLOS.filter(allowed), rng).slice(0, 1));

  for (const id of pool) {
    if (specials >= quota) break;
    if (has(id)) continue;
    const copies = copiesOf(id);
    if (roles.length + copies > n - 1) continue; // garder au moins un Simple Villageois
    const projected = balanceOf([...roles, ...Array(copies).fill(id), ...Array(Math.max(0, n - roles.length - copies)).fill('villageois')]);
    if (Math.abs(projected) > tolerance && Math.abs(projected) > Math.abs(balanceOf([...roles, ...Array(n - roles.length).fill('villageois')]))) {
      explanations.push(`${BUILTIN_ROLES.get(id)!.name} écarté(e) : déséquilibre trop important.`);
      continue;
    }
    for (let i = 0; i < copies; i++) roles.push(id);
    specials += 1;
  }

  while (roles.length < n) roles.push('villageois');

  // Correction de l'équilibre.
  for (let guard = 0; guard < n; guard++) {
    const b = balanceOf(roles);
    if (Math.abs(b) <= tolerance) break;
    if (b > tolerance) {
      // Village trop fort : retirer le rôle villageois le plus puissant (sauf Voyante).
      const candidates = roles
        .map((r, i) => ({ r, i }))
        .filter(({ r }) => weight(r) > 1 && r !== 'voyante' && copiesOf(r) === 1)
        .sort((a, c) => weight(c.r) - weight(a.r));
      if (candidates.length === 0) break;
      explanations.push(`${BUILTIN_ROLES.get(candidates[0].r as BuiltinRoleId)!.name} remplacé(e) par un Simple Villageois pour rééquilibrer.`);
      roles[candidates[0].i] = 'villageois';
    } else {
      const special = roles.findIndex((r) => SPECIAL_WOLVES.includes(r as BuiltinRoleId));
      if (special >= 0) {
        explanations.push(`${BUILTIN_ROLES.get(roles[special] as BuiltinRoleId)!.name} remplacé par un Loup-Garou pour rééquilibrer.`);
        roles[special] = 'loup-garou';
        continue;
      }
      const villager = roles.indexOf('villageois');
      const boost = (['sorciere', 'chasseur', 'salvateur', 'ancien', 'renard'] as BuiltinRoleId[]).find((r) => allowed(r) && !has(r));
      if (villager < 0 || !boost) break;
      explanations.push(`${BUILTIN_ROLES.get(boost)!.name} ajouté(e) pour renforcer le village.`);
      roles[villager] = boost;
    }
  }

  const extraCards: RoleId[] = [];
  const include = opts.include ?? [];
  if (include.includes('voleur') && allowed('voleur')) {
    const i = roles.indexOf('villageois');
    if (i >= 0) {
      roles[i] = 'voleur';
      extraCards.push('villageois', 'villageois');
      explanations.push('Voleur ajouté : deux Simples Villageois sont placés hors jeu pour lui.');
    }
  }
  if (include.includes('comedien') && allowed('comedien')) {
    const i = roles.indexOf('villageois');
    if (i >= 0) {
      roles[i] = 'comedien';
      const cards = COMEDIAN_ALLOWED.filter((c) => c !== 'villageois' && !roles.includes(c) && !extraCards.includes(c)).slice(0, 3);
      while (cards.length < 3) cards.push('villageois');
      extraCards.push(...cards);
      explanations.push('Comédien ajouté : trois cartes à pouvoir sont placées hors jeu pour lui.');
    }
  }

  const balance = balanceOf(roles);
  explanations.push(`Équilibre final : ${balance > 0 ? '+' : ''}${balance} (plage acceptée ±${tolerance} ; positif = avantage village).`);
  return { roles, extraCards, balance, explanations };
}
