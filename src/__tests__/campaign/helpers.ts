import {
  buildTimeline,
  checkInvariants,
  createRng,
  currentPhaseLabel,
  dawnAnnouncement,
  describeAction,
  describeEntry,
  expectedVoters,
  fuzzPlay,
  reminders,
  type GameRecord,
  type GameState,
} from '@/engine';
import { ANNOUNCEMENT_STYLES } from '@/engine/narration';
import { parseActions, parseSetup } from '@/storage/validation';

/**
 * Outils partagés de la campagne de tests de l'audit QA. Tout est déterminé
 * par une graine : un échec se rejoue avec la graine indiquée dans son nom.
 */

const cache = new Map<string, { record: GameRecord; state: GameState }>();

/** Partie aléatoire (mise en cache par graine et longueur). */
export function playedGame(seed: number, maxActions = 300) {
  const key = `${seed}:${maxActions}`;
  let g = cache.get(key);
  if (!g) {
    const { report, record, state } = fuzzPlay(seed, maxActions);
    if (report.violations.length) throw new Error(`graine ${seed} : ${report.violations.join(' | ')}`);
    g = { record, state };
    cache.set(key, g);
  }
  return g;
}

/** Ce qui est réellement écrit sur disque puis relu (JSON + validateurs de chargement). */
export function persistRoundTrip(record: GameRecord): GameRecord {
  const setup = parseSetup(JSON.parse(JSON.stringify(record.setup)));
  const actions = parseActions(JSON.parse(JSON.stringify(record.actions)));
  return { setup, actions };
}

/** Toutes les fonctions d'affichage dérivées d'un état : aucune ne doit lever d'exception. */
export function renderDerived(state: GameState): number {
  let n = 0;
  for (const e of state.log) {
    describeEntry(state, e, false);
    describeEntry(state, e, true);
    n += 2;
  }
  for (const style of ANNOUNCEMENT_STYLES) {
    for (const revealRoles of [true, false]) {
      const a = dawnAnnouncement(state, style.value, { revealRoles });
      if (typeof a !== 'object' || a === null) throw new Error('annonce vide');
      n += 1;
    }
  }
  buildTimeline(state);
  reminders(state);
  currentPhaseLabel(state);
  expectedVoters(state);
  return n + 4;
}

export function describeAll(record: GameRecord, state: GameState): void {
  for (const a of record.actions) describeAction(state, a.action);
}

export function invariantsOf(state: GameState): string[] {
  return checkInvariants(state);
}

const JUNK: unknown[] = [null, 0, -1, 1.5, 1e9, '', 'zz', 'p1', 'p999', 'blank', true, false, {}, [], ['p1', 'p1'], { x: 1 }];

/** Mutation aléatoire d'un historique (simulation de données altérées). */
export function mutateActions(actions: unknown[], seed: number): { actions: unknown[]; kind: string } {
  const rng = createRng(seed);
  const out = JSON.parse(JSON.stringify(actions)) as Record<string, unknown>[];
  if (out.length === 0) return { actions: out, kind: 'vide' };
  const i = Math.floor(rng() * out.length);
  const r = rng();
  const pickJunk = () => JUNK[Math.floor(rng() * JUNK.length)];
  if (r < 0.1) {
    out.splice(i, 1);
    return { actions: out, kind: 'suppression' };
  }
  if (r < 0.2) {
    out.splice(i, 0, JSON.parse(JSON.stringify(out[i])));
    return { actions: out, kind: 'doublon' };
  }
  if (r < 0.3) {
    const j = Math.floor(rng() * out.length);
    [out[i], out[j]] = [out[j], out[i]];
    return { actions: out, kind: 'permutation' };
  }
  const action = out[i].action as Record<string, unknown>;
  const keys = Object.keys(action).filter((k) => k !== 'type');
  if (keys.length === 0 || r < 0.35) {
    action.extra = pickJunk();
    return { actions: out, kind: 'champ-ajouté' };
  }
  const k = keys[Math.floor(rng() * keys.length)];
  if (r < 0.5) {
    delete action[k];
    return { actions: out, kind: `champ-supprimé:${k}` };
  }
  const v = action[k];
  if (v && typeof v === 'object' && !Array.isArray(v) && rng() < 0.6) {
    // Altération en profondeur (contenu d'une étape de nuit, par exemple).
    const inner = v as Record<string, unknown>;
    const ik = Object.keys(inner);
    if (ik.length) inner[ik[Math.floor(rng() * ik.length)]] = pickJunk();
    else inner.target = pickJunk();
    return { actions: out, kind: `profond:${k}` };
  }
  action[k] = pickJunk();
  return { actions: out, kind: `valeur:${k}` };
}

/** Plage de graines [from, to]. */
export function seeds(from: number, to: number): number[] {
  return Array.from({ length: to - from + 1 }, (_, i) => from + i);
}
