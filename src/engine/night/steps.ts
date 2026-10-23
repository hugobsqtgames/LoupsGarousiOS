import { NIGHT_ORDER } from '../roles/catalog';
import { customWakesOnNight } from '../roles/custom';
import { alivePlayers, bigBadWolfBlocked, effectiveRole, hasPowers, isWolfSide, registryOf, whiteWolfNight } from '../selectors';
import type { GameState, PlayerId, PlayerState, RoleId, StepKind, StepPayload } from '../types';

/** Une étape du guide de nuit, recalculée à chaque modification. */
export interface NightStep {
  key: string;
  kind: StepKind;
  roleId: RoleId | null;
  actorIds: PlayerId[];
  /** Rôle absent, mort ou privé de pouvoir : le MJ l'appelle pour la forme. */
  bluff: boolean;
  order: number;
  /** Étape appliquée immédiatement (modifie les étapes suivantes). */
  immediate: boolean;
  payload: StepPayload | undefined;
}

const IMMEDIATE: ReadonlySet<StepKind> = new Set<StepKind>(['thief', 'comedian', 'wolfhound', 'cupid', 'wild-child']);

const FIRST_NIGHT_ONLY: ReadonlySet<StepKind> = new Set<StepKind>(['thief', 'wolfhound', 'cupid', 'lovers', 'wild-child', 'sisters', 'brothers', 'judge', 'bear-tamer']);

/** Rôle principal associé à chaque étape (pour les appels « pour la forme »). */
const STEP_ROLE: Partial<Record<StepKind, RoleId>> = {
  thief: 'voleur',
  comedian: 'comedien',
  wolfhound: 'chien-loup',
  cupid: 'cupidon',
  'wild-child': 'enfant-sauvage',
  sisters: 'deux-soeurs',
  brothers: 'trois-freres',
  salvateur: 'salvateur',
  seer: 'voyante',
  fox: 'renard',
  infect: 'infect',
  'white-wolf': 'loup-blanc',
  'big-bad-wolf': 'grand-mechant-loup',
  witch: 'sorciere',
  gypsy: 'gitane',
  piper: 'joueur-de-flute',
  raven: 'corbeau',
};

function compositionRoles(state: GameState): Set<RoleId> {
  const s = new Set<RoleId>();
  for (const p of state.players) {
    s.add(p.originalRoleId);
    s.add(p.roleId);
  }
  for (const r of state.setup.extraCards) s.add(r);
  return s;
}

function byRole(state: GameState, roleId: RoleId, opts: { effective?: boolean } = {}): PlayerState[] {
  return state.players.filter((p) => (opts.effective ? effectiveRole(p) : p.roleId) === roleId);
}

function activeActors(state: GameState, roleId: RoleId): PlayerState[] {
  return byRole(state, roleId, { effective: true }).filter((p) => hasPowers(state, p));
}

/**
 * Calcule l'ordre des appels de la nuit en cours, à partir de l'état courant
 * (qui intègre déjà les choix « immédiats » : Voleur, Cupidon, etc.).
 */
export function computeNightSteps(state: GameState): NightStep[] {
  const night = state.night;
  if (!night || state.phase.kind !== 'night') return [];
  const n = night.number;
  const steps: NightStep[] = [];
  const composition = compositionRoles(state);
  const covered = new Set<StepKind>();

  const push = (kind: StepKind, actors: PlayerState[], key: string, roleId: RoleId | null, order: number) => {
    covered.add(kind);
    steps.push({
      key,
      kind,
      roleId,
      actorIds: actors.map((a) => a.id),
      bluff: false,
      order,
      immediate: IMMEDIATE.has(kind),
      payload: night.choices[key],
    });
  };
  const perActor = (kind: StepKind, roleId: RoleId, actors: PlayerState[]) => {
    for (const a of actors) push(kind, [a], `${kind}:${a.id}`, roleId, NIGHT_ORDER[kind as keyof typeof NIGHT_ORDER]);
  };

  if (n === 1) {
    const thief = state.players.filter((p) => p.originalRoleId === 'voleur' && p.alive);
    perActor('thief', 'voleur', thief);
  }
  if (state.comedianCards.length > 0 || night.startComedianCards.length > 0) {
    const comedians = state.players.filter((p) => p.roleId === 'comedien' && hasPowers(state, p));
    if (night.startComedianCards.length > 0) perActor('comedian', 'comedien', comedians);
  }
  // Rôles joués « comme une première nuit » : nuit 1, ou nuit suivant la reprise par la Servante.
  const firstNightOf = (roleId: RoleId) => byRole(state, roleId).filter((p) => p.alive && p.firstNight === n);
  perActor('wolfhound', 'chien-loup', firstNightOf('chien-loup'));
  const couplePossible = !state.lovers || night.startLovers === null || !state.players.some((p) => night.startLovers?.includes(p.id) && p.alive);
  const cupids = activeActors(state, 'cupidon').filter((p) => p.firstNight === n && (n === 1 || couplePossible));
  perActor('cupid', 'cupidon', cupids);
  if (state.lovers && (n === 1 || cupids.length > 0)) {
    const lovers = state.players.filter((p) => state.lovers?.includes(p.id) && p.alive);
    push('lovers', lovers, 'lovers', null, NIGHT_ORDER.lovers);
  }
  const judges = activeActors(state, 'juge-begue').filter((p) => p.firstNight === n);
  if (judges.length > 0) push('judge', judges, 'judge', 'juge-begue', NIGHT_ORDER.judge);
  const siblingsNight = (roleId: RoleId) => {
    const all = byRole(state, roleId).filter((p) => p.alive);
    if (all.length === 0) return [];
    if (n === 1 || all.some((p) => p.firstNight === n)) return all;
    if (state.setup.variants.siblingsWakeLater && n % 2 === 0 && all.length > 1) return all;
    return [];
  };
  const sisters = siblingsNight('deux-soeurs');
  if (sisters.length > 0) push('sisters', sisters, 'sisters', 'deux-soeurs', NIGHT_ORDER.sisters);
  const brothers = siblingsNight('trois-freres');
  if (brothers.length > 0) push('brothers', brothers, 'brothers', 'trois-freres', NIGHT_ORDER.brothers);
  perActor('wild-child', 'enfant-sauvage', firstNightOf('enfant-sauvage').filter((p) => p.team === 'village'));
  const tamers = byRole(state, 'montreur-ours').filter((p) => p.alive && p.firstNight === n);
  if (tamers.length > 0) push('bear-tamer', tamers, 'bear-tamer', 'montreur-ours', NIGHT_ORDER['bear-tamer']);

  perActor('salvateur', 'salvateur', activeActors(state, 'salvateur'));
  perActor('seer', 'voyante', activeActors(state, 'voyante'));
  perActor('fox', 'renard', activeActors(state, 'renard').filter((p) => p.comedianRole === 'renard' || !p.foxPowerLost));

  const wolves = alivePlayers(state).filter(isWolfSide);
  if (wolves.length > 0) push('wolves', wolves, 'wolves', 'loup-garou', NIGHT_ORDER.wolves);

  perActor('infect', 'infect', state.players.filter((p) => p.roleId === 'infect' && p.alive && p.team === 'wolves' && (p.uses.infect ?? 0) > 0));
  if (whiteWolfNight(state, n)) perActor('white-wolf', 'loup-blanc', state.players.filter((p) => p.roleId === 'loup-blanc' && p.alive && (p.firstNight === 1 || n > p.firstNight)));
  if (!bigBadWolfBlocked(state)) {
    perActor('big-bad-wolf', 'grand-mechant-loup', state.players.filter((p) => p.roleId === 'grand-mechant-loup' && p.alive && p.team === 'wolves'));
  }
  perActor(
    'witch',
    'sorciere',
    activeActors(state, 'sorciere').filter((p) => (p.uses.heal ?? 0) > 0 || (p.uses.poison ?? 0) > 0),
  );
  perActor('gypsy', 'gitane', activeActors(state, 'gitane').filter((p) => (p.uses.spirit ?? 0) > 0));
  const pipers = activeActors(state, 'joueur-de-flute');
  perActor('piper', 'joueur-de-flute', pipers);
  if (pipers.length > 0) {
    const newly = new Set<PlayerId>();
    for (const p of pipers) for (const t of night.choices[`piper:${p.id}`]?.targets ?? []) newly.add(t);
    const charmed = state.players.filter((p) => p.alive && (p.charmed || newly.has(p.id)));
    push('charmed', charmed, 'charmed', null, NIGHT_ORDER.charmed);
  }
  perActor('raven', 'corbeau', activeActors(state, 'corbeau'));

  const reg = registryOf(state);
  for (const def of state.setup.customRoles) {
    if (!customWakesOnNight(def, n)) continue;
    const actors = state.players.filter((p) => p.roleId === def.id && hasPowers(state, p) && (p.uses.custom ?? 0) !== 0);
    for (const a of actors) push('custom', [a], `custom:${a.id}`, def.id, def.wakeOrder);
    if (actors.length === 0 && state.setup.variants.callInactiveRoles && composition.has(def.id) && reg.has(def.id)) {
      steps.push({ key: `bluff:${def.id}`, kind: 'bluff', roleId: def.id, actorIds: [], bluff: true, order: def.wakeOrder, immediate: false, payload: night.choices[`bluff:${def.id}`] });
    }
  }

  if (state.setup.variants.callInactiveRoles) {
    for (const [kind, roleId] of Object.entries(STEP_ROLE) as [StepKind, RoleId][]) {
      if (covered.has(kind)) continue;
      if (!composition.has(roleId)) continue;
      if (FIRST_NIGHT_ONLY.has(kind) && n !== 1) continue;
      if (kind === 'white-wolf' && !whiteWolfNight(state, n)) continue;
      if (kind === 'comedian' && night.startComedianCards.length === 0) continue;
      if (kind === 'big-bad-wolf' && bigBadWolfBlocked(state)) continue;
      const key = `bluff:${roleId}`;
      steps.push({ key, kind: 'bluff', roleId, actorIds: [], bluff: true, order: NIGHT_ORDER[kind as keyof typeof NIGHT_ORDER], immediate: false, payload: night.choices[key] });
    }
  }

  return steps.sort((a, b) => a.order - b.order || a.key.localeCompare(b.key));
}

export function pendingSteps(state: GameState): NightStep[] {
  return computeNightSteps(state).filter((s) => s.payload === undefined);
}

export function currentStep(state: GameState): NightStep | null {
  return pendingSteps(state)[0] ?? null;
}

export function isImmediate(kind: StepKind): boolean {
  return IMMEDIATE.has(kind);
}
