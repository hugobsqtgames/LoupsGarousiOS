import { deepClone } from './clone';
import { applyAction, startGame } from './reducer';
import { RuleError, type GameAction, type GameRecord, type GameState, type TimedAction } from './types';

/**
 * Copie un état avant mutation. Les parties immuables sont partagées :
 * configuration, entrées du journal (ajout seul) et instantané de début de nuit.
 */
export function cloneState(state: GameState): GameState {
  const { setup, log, dawnReport, night, ...rest } = state;
  return {
    ...deepClone(rest),
    setup,
    log: [...log],
    dawnReport: [...dawnReport],
    night: night ? { ...night, choices: deepClone(night.choices), startComedianCards: [...night.startComedianCards] } : null,
  };
}

export interface ReplayFailure {
  index: number;
  action: GameAction;
  message: string;
  code: string;
}

export interface ReplayResult {
  state: GameState;
  /** Nombre d'actions appliquées avec succès. */
  applied: number;
  failure: ReplayFailure | null;
}

/**
 * Rejoue une partie depuis sa configuration. S'arrête à la première action
 * invalide et renvoie l'état cohérent obtenu juste avant.
 */
export function replay(record: GameRecord): ReplayResult {
  let state = startGame(record.setup);
  for (let i = 0; i < record.actions.length; i++) {
    const next = cloneState(state);
    try {
      applyAction(next, record.actions[i].action);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      const code = e instanceof RuleError ? e.code : 'internal';
      return { state, applied: i, failure: { index: i, action: record.actions[i].action, message, code } };
    }
    state = next;
  }
  return { state, applied: record.actions.length, failure: null };
}

/** Résultat d'une tentative d'action : nouvel enregistrement et nouvel état, ou erreur. */
export type DispatchResult = { ok: true; record: GameRecord; state: GameState } | { ok: false; error: string; code: string };

export function dispatch(record: GameRecord, state: GameState, action: GameAction, at = new Date().toISOString()): DispatchResult {
  const next = cloneState(state);
  try {
    applyAction(next, action);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e), code: e instanceof RuleError ? e.code : 'internal' };
  }
  const timed: TimedAction = { action, at };
  return { ok: true, record: { setup: record.setup, actions: [...record.actions, timed] }, state: next };
}

/** Annule la dernière action. */
export function undo(record: GameRecord): { record: GameRecord; state: GameState } | null {
  if (record.actions.length === 0) return null;
  const r = { setup: record.setup, actions: record.actions.slice(0, -1) };
  const res = replay(r);
  if (res.failure) throw new Error(`Historique incohérent après annulation : ${res.failure.message}`);
  return { record: r, state: res.state };
}

/** Revient à l'état obtenu après `count` actions. */
export function rewindTo(record: GameRecord, count: number): { record: GameRecord; state: GameState } {
  const r = { setup: record.setup, actions: record.actions.slice(0, Math.max(0, count)) };
  const res = replay(r);
  if (res.failure) throw new Error(`Historique incohérent : ${res.failure.message}`);
  return { record: r, state: res.state };
}

export type ReplaceResult =
  | { ok: true; record: GameRecord; state: GameState }
  | { ok: false; failure: ReplayFailure; /** Enregistrement tronqué juste avant l'action devenue invalide. */ truncated: GameRecord };

/**
 * Corrige une action passée puis rejoue toutes les suivantes. Si une action
 * ultérieure devient invalide, rien n'est appliqué : l'appelant peut proposer
 * de tronquer l'historique à partir de cette action.
 */
export function replaceAction(record: GameRecord, index: number, action: GameAction): ReplaceResult {
  if (index < 0 || index >= record.actions.length) throw new Error('Index d’action invalide');
  const actions = record.actions.map((a, i) => (i === index ? { action, at: a.at } : a));
  const r = { setup: record.setup, actions };
  const res = replay(r);
  if (res.failure) {
    return { ok: false, failure: res.failure, truncated: { setup: record.setup, actions: actions.slice(0, res.failure.index) } };
  }
  return { ok: true, record: r, state: res.state };
}
