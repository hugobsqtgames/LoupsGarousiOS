import { DEFAULT_VARIANTS } from './variants';
import { dispatch } from './replay';
import { startGame } from './reducer';
import type { GameAction, GameRecord, GameSetup, GameState, PlayerId, RoleId, StepPayload, Variants } from './types';
import { computeNightSteps } from './night/steps';

/** Aides de test : construction de parties et pilotage du moteur. */

export function makeSetup(roles: RoleId[], opts: { extra?: RoleId[]; variants?: Partial<Variants>; names?: string[]; sectGroups?: Record<string, 'A' | 'B'> } = {}): GameSetup {
  const players = roles.map((_, i) => ({ id: `p${i + 1}`, name: opts.names?.[i] ?? `Joueur ${i + 1}` }));
  return {
    formatVersion: 1,
    id: 'g-test',
    name: 'Test',
    createdAt: '2026-01-01T00:00:00.000Z',
    players,
    assignments: Object.fromEntries(players.map((p, i) => [p.id, roles[i]])),
    extraCards: opts.extra ?? [],
    variants: { ...DEFAULT_VARIANTS, ...opts.variants },
    customRoles: [],
    sectGroups: opts.sectGroups,
  };
}

export class GameDriver {
  record: GameRecord;
  state: GameState;

  constructor(setup: GameSetup) {
    this.record = { setup, actions: [] };
    this.state = startGame(setup);
  }

  /** Applique une action ; lève une erreur si elle est refusée. */
  act(action: GameAction): this {
    const r = dispatch(this.record, this.state, action, '2026-01-01T00:00:00.000Z');
    if (!r.ok) throw new Error(`${r.code}: ${r.error}`);
    this.record = r.record;
    this.state = r.state;
    return this;
  }

  /** Tente une action ; renvoie le code d'erreur ou null. */
  tryAct(action: GameAction): string | null {
    const r = dispatch(this.record, this.state, action);
    if (!r.ok) return r.code;
    this.record = r.record;
    this.state = r.state;
    return null;
  }

  steps() {
    return computeNightSteps(this.state);
  }

  stepKey(kind: string): string {
    const s = this.steps().find((x) => x.kind === kind && x.payload === undefined) ?? this.steps().find((x) => x.kind === kind);
    if (!s) throw new Error(`Étape ${kind} absente : ${this.steps().map((x) => x.key).join(', ')}`);
    return s.key;
  }

  submit(kind: string, payload: StepPayload = {}): this {
    return this.act({ type: 'night/submit', stepKey: this.stepKey(kind), payload });
  }

  /** Renseigne toutes les étapes restantes avec « aucune action », puis résout. */
  finishNight(overrides: Record<string, StepPayload> = {}): this {
    for (let guard = 0; guard < 60; guard++) {
      const pending = this.steps().find((s) => s.payload === undefined);
      if (!pending) break;
      const payload = overrides[pending.kind] ?? defaultPayload(this.state, pending.kind, pending.actorIds);
      this.act({ type: 'night/submit', stepKey: pending.key, payload });
    }
    return this.act({ type: 'night/resolve' });
  }

  player(id: PlayerId) {
    const p = this.state.players.find((x) => x.id === id);
    if (!p) throw new Error(`joueur ${id}`);
    return p;
  }

  /** Vote complet en mode compteur : liste de cibles (une voix chacune). */
  eliminationVote(targets: PlayerId[], opts: { mayorVote?: PlayerId } = {}): this {
    this.act({ type: 'ballot/open', kind: 'elimination', mode: 'tally' });
    for (const t of targets) this.act({ type: 'ballot/vote', target: t });
    if (opts.mayorVote && this.state.mayorId) this.act({ type: 'ballot/vote', target: opts.mayorVote, voterId: this.state.mayorId });
    this.act({ type: 'ballot/close' });
    return this.act({ type: 'ballot/confirm' });
  }

  resolvePending(payload: { target?: PlayerId | null; targets?: PlayerId[]; accept?: boolean }): this {
    const d = this.state.pending[0];
    if (!d) throw new Error('aucune décision en attente');
    return this.act({ type: 'decision/resolve', decisionId: d.id, payload });
  }
}

function defaultPayload(state: GameState, kind: string, actorIds: PlayerId[]): StepPayload {
  switch (kind) {
    case 'wolfhound':
      return { team: 'village' };
    case 'cupid': {
      const ids = state.players.filter((p) => p.alive).map((p) => p.id);
      return { targets: [ids[0], ids[1]] };
    }
    case 'wild-child': {
      const other = state.players.find((p) => p.alive && !actorIds.includes(p.id));
      return { target: other?.id ?? null };
    }
    case 'piper': {
      const cands = state.players.filter((p) => p.alive && !p.charmed && !actorIds.includes(p.id)).slice(0, 2);
      return { targets: cands.map((p) => p.id) };
    }
    case 'witch':
      return { heal: null, poison: null };
    case 'infect':
      return { infect: false };
    case 'thief':
      return { cardIndex: state.setup.extraCards.slice(0, 2).every((c) => c === 'loup-garou') ? 0 : null };
    case 'comedian':
      return { cardIndex: null };
    default:
      return { target: null };
  }
}
