import { phaseLabel } from './selectors';
import { RuleError, type GameEvent, type GameState } from './types';

/** Utilitaires internes de mutation d'un brouillon d'état (déjà cloné). */

export function emit(state: GameState, event: GameEvent, secret = false): void {
  state.log.push({
    seq: state.log.length,
    actionIndex: state.actionCount,
    phaseLabel: phaseLabel(state.phase),
    event,
    secret,
  });
}

export function nextId(state: GameState, prefix: string): string {
  state.idCounter += 1;
  return `${prefix}${state.idCounter}`;
}

export function fail(code: string, message: string): never {
  throw new RuleError(code, message);
}

export function assert(cond: unknown, code: string, message: string): asserts cond {
  if (!cond) fail(code, message);
}
