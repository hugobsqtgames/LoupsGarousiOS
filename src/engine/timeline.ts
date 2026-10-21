import { applyAction, startGame } from './reducer';
import { cloneState, replaceAction, type DispatchResult, type ReplayFailure } from './replay';
import { RuleError, type GameAction, type GameRecord, type GameState } from './types';

const CHECKPOINT_EVERY = 20;

/**
 * Historique de partie avec points de contrôle mémoire : l'annulation et le
 * retour arrière ne rejouent que les actions depuis le dernier point de
 * contrôle, ce qui garde ces opérations rapides même sur de longues parties.
 */
export class Timeline {
  private _record: GameRecord;
  private _state: GameState;
  /** Clé : nombre d'actions appliquées. */
  private checkpoints = new Map<number, GameState>();

  private constructor(record: GameRecord, state: GameState) {
    this._record = record;
    this._state = state;
  }

  get record(): GameRecord {
    return this._record;
  }

  get state(): GameState {
    return this._state;
  }

  get length(): number {
    return this._record.actions.length;
  }

  /** Reconstruit depuis un enregistrement ; s'arrête à la première action invalide. */
  static load(record: GameRecord): { timeline: Timeline; failure: ReplayFailure | null } {
    let state = startGame(record.setup);
    const t = new Timeline({ setup: record.setup, actions: [] }, state);
    t.checkpoints.set(0, state);
    for (let i = 0; i < record.actions.length; i++) {
      const next = cloneState(state);
      try {
        applyAction(next, record.actions[i].action);
      } catch (e) {
        t._record = { setup: record.setup, actions: record.actions.slice(0, i) };
        t._state = state;
        return {
          timeline: t,
          failure: { index: i, action: record.actions[i].action, message: e instanceof Error ? e.message : String(e), code: e instanceof RuleError ? e.code : 'internal' },
        };
      }
      state = next;
      if ((i + 1) % CHECKPOINT_EVERY === 0) t.checkpoints.set(i + 1, state);
    }
    t._record = { setup: record.setup, actions: [...record.actions] };
    t._state = state;
    return { timeline: t, failure: null };
  }

  dispatch(action: GameAction, at = new Date().toISOString()): DispatchResult {
    const next = cloneState(this._state);
    try {
      applyAction(next, action);
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e), code: e instanceof RuleError ? e.code : 'internal' };
    }
    this._record = { setup: this._record.setup, actions: [...this._record.actions, { action, at }] };
    this._state = next;
    if (this.length % CHECKPOINT_EVERY === 0) this.checkpoints.set(this.length, next);
    return { ok: true, record: this._record, state: next };
  }

  /** Revient à l'état après `count` actions (troncature de l'historique). */
  rewindTo(count: number): void {
    const target = Math.max(0, Math.min(count, this.length));
    let base = 0;
    for (const k of this.checkpoints.keys()) if (k <= target && k > base) base = k;
    let state = this.checkpoints.get(base)!;
    for (let i = base; i < target; i++) {
      const next = cloneState(state);
      applyAction(next, this._record.actions[i].action);
      state = next;
    }
    for (const k of [...this.checkpoints.keys()]) if (k > target) this.checkpoints.delete(k);
    this._record = { setup: this._record.setup, actions: this._record.actions.slice(0, target) };
    this._state = state;
  }

  undo(): boolean {
    if (this.length === 0) return false;
    this.rewindTo(this.length - 1);
    return true;
  }

  /** Corrige une action passée ; en cas d'échec, l'historique n'est pas modifié. */
  replace(index: number, action: GameAction): { ok: true } | { ok: false; failure: ReplayFailure } {
    const res = replaceAction(this._record, index, action);
    if (!res.ok) return { ok: false, failure: res.failure };
    const { timeline } = Timeline.load(res.record);
    this._record = timeline._record;
    this._state = timeline._state;
    this.checkpoints = timeline.checkpoints;
    return { ok: true };
  }
}
