import { countBallot } from './ballot';
import { generateComposition, type Complexity } from './composition';
import { checkInvariants } from './invariants';
import { computeNightSteps } from './night/steps';
import { replay } from './replay';
import { Timeline } from './timeline';
import { createRng, pick, shuffle } from './rng';
import { activeBallot } from './selectors';
import { DEFAULT_VARIANTS } from './variants';
import type { GameAction, GameRecord, GameSetup, GameState, PlayerId, StepPayload, Variants } from './types';

/**
 * Générateur de parties aléatoires pour les tests de robustesse (« monkey
 * testing » du moteur). Chaque partie est entièrement déterminée par sa graine.
 */

export interface FuzzReport {
  seed: number;
  actionsTried: number;
  actionsApplied: number;
  rejected: number;
  undos: number;
  finished: boolean;
  winner: string | null;
  violations: string[];
}

function randomSetup(seed: number): GameSetup {
  const rng = createRng(seed);
  const n = 5 + Math.floor(rng() * 20);
  const complexity = pick<Complexity>(['decouverte', 'equilibre', 'riche'], rng);
  const include = rng() < 0.3 ? ['voleur' as const] : rng() < 0.2 ? ['comedien' as const] : [];
  const comp = generateComposition({ playerCount: n, expansions: ['base', 'nouvelle-lune', 'personnages'], complexity, seed, allowSolo: rng() < 0.5, include });
  const roles = shuffle(comp.roles, rng);
  const players = roles.map((_, i) => ({ id: `p${i + 1}`, name: `J${i + 1}` }));
  const variants: Variants = {
    ...DEFAULT_VARIANTS,
    mayorEnabled: rng() < 0.8,
    mayorVoteWeight: rng() < 0.8 ? 2 : 1,
    mayorTie: pick(['runoff_then_mj', 'mj_decides', 'no_mayor'] as const, rng),
    mayorSuccession: rng() < 0.7 ? 'designate' : 'election',
    eliminationTie: pick(['mayor_then_runoff', 'runoff', 'none'] as const, rng),
    scapegoatOnTie: rng() < 0.8,
    voteMode: rng() < 0.5 ? 'tally' : 'nominal',
    allowBlankVotes: rng() < 0.7,
    strictVoterCount: rng() < 0.9,
    callInactiveRoles: rng() < 0.7,
    salvateurSelf: rng() < 0.7,
    witchSelfHeal: rng() < 0.7,
    elderVengeance: rng() < 0.6 ? 'village' : 'vote_only',
    angelWindow: rng() < 0.6 ? 'first_round' : 'first_vote',
    angelStartsWithDay: rng() < 0.8,
    wildChildTrigger: rng() < 0.6 ? 'any_death' : 'wolves_only',
    cupidWinsWithMixedLovers: rng() < 0.3,
    servantEnabled: rng() < 0.8,
    idiotDiesSecondTime: rng() < 0.8,
  };
  return {
    formatVersion: 1,
    id: `fuzz-${seed}`,
    name: `Fuzz ${seed}`,
    createdAt: '2026-01-01T00:00:00.000Z',
    players,
    assignments: Object.fromEntries(players.map((p, i) => [p.id, roles[i]])),
    extraCards: comp.extraCards,
    variants,
    customRoles: [],
    sectGroups: Object.fromEntries(players.map((p, i) => [p.id, i % 2 === 0 ? 'A' : 'B'])),
  };
}

function randomPlayer(state: GameState, rng: () => number, aliveBias = 0.9): PlayerId | null {
  if (rng() < 0.08) return null;
  const pool = rng() < aliveBias ? state.players.filter((p) => p.alive) : state.players;
  return pool.length ? pick(pool, rng).id : null;
}

function randomPayload(state: GameState, kind: string, rng: () => number): StepPayload {
  const t = () => randomPlayer(state, rng);
  switch (kind) {
    case 'thief':
    case 'comedian':
      return { cardIndex: rng() < 0.3 ? null : Math.floor(rng() * 3) };
    case 'wolfhound':
      return { team: rng() < 0.5 ? 'village' : 'wolves' };
    case 'cupid':
      return { targets: [t(), t()].filter((x): x is string => x !== null) };
    case 'piper':
      return { targets: [t(), t()].filter((x): x is string => x !== null).slice(0, Math.floor(rng() * 3)) };
    case 'witch':
      return { heal: rng() < 0.3 ? t() : null, poison: rng() < 0.2 ? t() : null };
    case 'infect':
      return { infect: rng() < 0.3 };
    case 'wolves':
      return { target: t(), littleGirlCaught: rng() < 0.05 };
    default:
      return { target: t() };
  }
}

function candidateAction(state: GameState, rng: () => number): GameAction {
  const r = rng();
  if (state.victory) return r < 0.85 ? { type: 'game/finish' } : { type: 'mj/note', text: 'note' };
  if (state.pending.length > 0) {
    const d = state.pending[0];
    const targets = shuffle(state.players.filter((p) => p.alive), rng)
      .slice(0, 1 + Math.floor(rng() * 3))
      .map((p) => p.id);
    const target = d.kind === 'mayor-tiebreak' || d.kind === 'mj-tiebreak' ? (rng() < 0.85 ? pick(d.candidates, rng) : randomPlayer(state, rng)) : randomPlayer(state, rng);
    return { type: 'decision/resolve', decisionId: rng() < 0.95 ? d.id : 'bogus', payload: { target, targets, accept: rng() < 0.5 } };
  }
  switch (state.phase.kind) {
    case 'night': {
      const steps = computeNightSteps(state);
      const pending = steps.find((s) => s.payload === undefined);
      if (!pending || r < 0.05) return { type: 'night/resolve' };
      const step = r < 0.12 ? pick(steps, rng) : pending;
      return { type: 'night/submit', stepKey: rng() < 0.02 ? 'bogus' : step.key, payload: randomPayload(state, step.kind, rng) };
    }
    case 'dawn':
      return r < 0.05 ? { type: 'mj/eliminate', playerId: randomPlayer(state, rng) ?? 'p1' } : { type: 'dawn/confirm' };
    case 'day': {
      const b = activeBallot(state);
      if (!b || b.status === 'confirmed' || b.status === 'cancelled') {
        if (r < 0.15) return { type: 'day/end' };
        if (r < 0.2) return { type: 'judge/second-vote' };
        if (r < 0.23) return { type: 'mj/eliminate', playerId: randomPlayer(state, rng) ?? 'p1' };
        const kind = !state.mayorId && state.setup.variants.mayorEnabled && rng() < 0.6 ? 'mayor' : 'elimination';
        return { type: 'ballot/open', kind, mode: rng() < 0.5 ? 'tally' : 'nominal', candidates: kind === 'mayor' && rng() < 0.5 ? shuffle(state.players.filter((p) => p.alive), rng).slice(0, 3).map((p) => p.id) : undefined };
      }
      if (b.status === 'closed') {
        if (r < 0.15) return { type: 'ballot/reopen' };
        if (r < 0.2) return { type: 'ballot/cancel' };
        return { type: 'ballot/confirm' };
      }
      const count = countBallot(b);
      if (r < 0.1 || count.cast >= b.voters.length) return { type: 'ballot/close' };
      if (r < 0.12) return { type: 'ballot/cancel' };
      if (b.kind === 'mayor' && r < 0.17) return { type: 'ballot/candidate', playerId: randomPlayer(state, rng) ?? 'p1', add: rng() < 0.6 };
      const target = rng() < 0.05 ? 'blank' : rng() < 0.85 ? pick(b.candidates, rng) : (randomPlayer(state, rng, 0.5) ?? 'p1');
      const voterId = b.mode === 'nominal' ? (rng() < 0.95 ? pick(b.voters.length ? b.voters : ['p1'], rng) : (randomPlayer(state, rng, 0.5) ?? 'p1')) : rng() < 0.15 ? state.mayorId : null;
      return rng() < 0.2 ? { type: 'ballot/unvote', target, voterId } : { type: 'ballot/vote', target, voterId };
    }
    case 'ended':
      return { type: 'game/finish' };
  }
}

export function fuzzGame(seed: number, maxActions = 600): FuzzReport {
  const rng = createRng(seed * 7919 + 13);
  const setup = randomSetup(seed);
  const timeline = Timeline.load({ setup, actions: [] }).timeline;
  let record: GameRecord = timeline.record;
  let state = timeline.state;
  const report: FuzzReport = { seed, actionsTried: 0, actionsApplied: 0, rejected: 0, undos: 0, finished: false, winner: null, violations: [] };
  const check = (label: string) => {
    for (const v of checkInvariants(state)) report.violations.push(`[${label}] ${v}`);
  };
  check('initial');

  for (let i = 0; i < maxActions && state.phase.kind !== 'ended'; i++) {
    if (record.actions.length > 0 && rng() < 0.04) {
      if (rng() < 0.8) timeline.undo();
      else timeline.rewindTo(Math.floor(rng() * record.actions.length));
      record = timeline.record;
      state = timeline.state;
      report.undos += 1;
      check(`undo#${i}`);
      continue;
    }
    const action = candidateAction(state, rng);
    report.actionsTried += 1;
    const res = timeline.dispatch(action, '2026-01-01T00:00:00.000Z');
    if (!res.ok) {
      report.rejected += 1;
      if (res.code === 'internal') report.violations.push(`[#${i}] erreur interne sur ${action.type} : ${res.error}`);
      continue;
    }
    record = res.record;
    state = res.state;
    report.actionsApplied += 1;
    check(`#${i} ${action.type}`);
    if (report.violations.length > 0) break;
  }

  const rep = replay(record);
  if (rep.failure) report.violations.push(`Rejeu impossible à l'action ${rep.failure.index} : ${rep.failure.message}`);
  else if (JSON.stringify(rep.state) !== JSON.stringify(state)) report.violations.push('Le rejeu ne reproduit pas le même état (non-déterminisme).');
  report.finished = state.phase.kind === 'ended';
  report.winner = state.victory?.winner ?? null;
  return report;
}
