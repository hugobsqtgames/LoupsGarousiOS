import { RoleRegistry, normalizeVariants, validateCustomRole } from '@/engine';
import type { CustomRoleDef, GameAction, GameRecord, GameSetup, TimedAction } from '@/engine';

/**
 * Validation structurelle des données lues sur disque ou importées.
 * Toute donnée inconnue est rejetée avant d'atteindre le moteur.
 */

export class DataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DataError';
  }
}

const ACTION_TYPES = new Set<GameAction['type']>([
  'night/submit',
  'night/resolve',
  'dawn/confirm',
  'day/end',
  'ballot/open',
  'ballot/candidate',
  'ballot/vote',
  'ballot/unvote',
  'ballot/close',
  'ballot/reopen',
  'ballot/confirm',
  'ballot/cancel',
  'judge/second-vote',
  'decision/resolve',
  'mj/eliminate',
  'mj/note',
  'mj/revive',
  'mj/set-team',
  'mj/grant-use',
  'mj/extra-vote',
  'mj/remove-mayor',
  'event/draw',
  'ballot/set-count',
  'game/finish',
  'game/abandon',
]);

type FieldKind = 'string' | 'object' | 'boolean' | 'count';

/** Champs obligatoires de chaque action : une action altérée est refusée à la lecture. */
const REQUIRED_FIELDS: Partial<Record<GameAction['type'], [string, FieldKind][]>> = {
  'night/submit': [
    ['stepKey', 'string'],
    ['payload', 'object'],
  ],
  'ballot/open': [['kind', 'string']],
  'ballot/candidate': [
    ['playerId', 'string'],
    ['add', 'boolean'],
  ],
  'ballot/vote': [['target', 'string']],
  'ballot/unvote': [['target', 'string']],
  'decision/resolve': [
    ['decisionId', 'string'],
    ['payload', 'object'],
  ],
  'mj/eliminate': [['playerId', 'string']],
  'mj/note': [['text', 'string']],
  'mj/revive': [
    ['playerId', 'string'],
    ['asVillager', 'boolean'],
  ],
  'mj/set-team': [
    ['playerId', 'string'],
    ['team', 'string'],
  ],
  'mj/grant-use': [
    ['playerId', 'string'],
    ['key', 'string'],
  ],
  'event/draw': [['cardId', 'string']],
  'ballot/set-count': [
    ['target', 'string'],
    ['count', 'count'],
  ],
};

function fieldOk(v: unknown, kind: FieldKind): boolean {
  switch (kind) {
    case 'string':
      return typeof v === 'string' && v.length <= 2000;
    case 'object':
      return isObj(v);
    case 'boolean':
      return typeof v === 'boolean';
    case 'count':
      return typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= 1000;
  }
}

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function str(v: unknown, field: string, max = 200): string {
  if (typeof v !== 'string' || v.length > max) throw new DataError(`Champ invalide : ${field}`);
  return v;
}

export function parseCustomRoles(input: unknown): CustomRoleDef[] {
  if (input === undefined) return [];
  if (!Array.isArray(input)) throw new DataError('Rôles personnalisés invalides.');
  return input.map((r) => {
    const res = validateCustomRole(r);
    if (!res.ok) throw new DataError(`Rôle personnalisé invalide : ${res.issues.map((i) => i.message).join(' ')}`);
    return res.role;
  });
}

export function parseSetup(input: unknown): GameSetup {
  if (!isObj(input)) throw new DataError('Configuration de partie absente.');
  if (input.formatVersion !== 1) throw new DataError(`Format de partie non pris en charge : ${String(input.formatVersion)}`);
  const customRoles = parseCustomRoles(input.customRoles);
  const reg = new RoleRegistry(customRoles);
  if (!Array.isArray(input.players) || input.players.length === 0 || input.players.length > 60) throw new DataError('Liste de joueurs invalide.');
  const players = input.players.map((p, i) => {
    if (!isObj(p)) throw new DataError(`Joueur ${i + 1} invalide.`);
    return { id: str(p.id, 'player.id', 64), name: str(p.name, 'player.name', 64) };
  });
  if (new Set(players.map((p) => p.id)).size !== players.length) throw new DataError('Identifiants de joueurs dupliqués.');
  if (!isObj(input.assignments)) throw new DataError('Attributions invalides.');
  const assignments: GameSetup['assignments'] = {};
  for (const p of players) {
    const r = input.assignments[p.id];
    if (typeof r !== 'string' || !reg.has(r as never)) throw new DataError(`Rôle invalide pour ${p.name}.`);
    assignments[p.id] = r as never;
  }
  if (!Array.isArray(input.extraCards)) throw new DataError('Cartes hors jeu invalides.');
  const extraCards = input.extraCards.map((c) => {
    if (typeof c !== 'string' || !reg.has(c as never)) throw new DataError('Carte hors jeu inconnue.');
    return c as never;
  });
  let sectGroups: GameSetup['sectGroups'];
  if (input.sectGroups !== undefined) {
    if (!isObj(input.sectGroups)) throw new DataError('Groupes du Sectaire invalides.');
    sectGroups = {};
    for (const [k, v] of Object.entries(input.sectGroups)) {
      if (v !== 'A' && v !== 'B') throw new DataError('Groupe du Sectaire invalide.');
      sectGroups[k] = v;
    }
  }
  return {
    formatVersion: 1,
    id: str(input.id, 'id', 64),
    name: str(input.name, 'name', 80),
    createdAt: str(input.createdAt, 'createdAt', 40),
    players,
    assignments,
    extraCards,
    // Les variantes absentes (ancien format) reçoivent leur valeur par défaut.
    variants: normalizeVariants(input.variants),
    customRoles,
    ...(input.dealMode === 'phone' ? { dealMode: 'phone' as const } : {}),
    sectGroups,
  };
}

export function parseActions(input: unknown): TimedAction[] {
  if (!Array.isArray(input)) throw new DataError('Historique invalide.');
  if (input.length > 100_000) throw new DataError('Historique anormalement long.');
  return input.map((a, i) => {
    if (!isObj(a) || !isObj(a.action) || typeof a.action.type !== 'string' || !ACTION_TYPES.has(a.action.type as GameAction['type'])) {
      throw new DataError(`Action ${i + 1} invalide.`);
    }
    for (const [field, kind] of REQUIRED_FIELDS[a.action.type as GameAction['type']] ?? []) {
      if (!fieldOk(a.action[field], kind)) throw new DataError(`Action ${i + 1} invalide (${a.action.type} : ${field}).`);
    }
    return { action: a.action as unknown as GameAction, at: typeof a.at === 'string' ? a.at : '' };
  });
}

export function parseRecord(setupInput: unknown, actionsInput: unknown): GameRecord {
  return { setup: parseSetup(setupInput), actions: parseActions(actionsInput) };
}

export function safeJsonParse(text: string, what: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    throw new DataError(`Données illisibles (${what}).`);
  }
}
