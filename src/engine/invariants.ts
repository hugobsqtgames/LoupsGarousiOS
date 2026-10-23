import { countBallot } from './ballot';
import { computeNightSteps } from './night/steps';
import type { GameState } from './types';

/**
 * Invariants métier vérifiés après chaque action dans les tests aléatoires
 * (et exposés pour l'écran de diagnostic). Renvoie la liste des violations.
 */
export function checkInvariants(state: GameState): string[] {
  const errors: string[] = [];
  const ids = new Set(state.players.map((p) => p.id));
  if (ids.size !== state.players.length) errors.push('Identifiants de joueurs dupliqués.');

  for (const p of state.players) {
    if (p.alive && p.death) errors.push(`${p.name} est vivant(e) mais possède une cause de mort.`);
    if (!p.alive && !p.death) errors.push(`${p.name} est mort(e) sans cause.`);
    for (const [k, v] of Object.entries(p.uses)) {
      if (k !== 'custom' && v < 0) errors.push(`${p.name} : utilisations négatives (${k}).`);
      if (k === 'custom' && v < -1) errors.push(`${p.name} : compteur personnalisé invalide.`);
    }
  }
  // Morts et retours en jeu doivent alterner pour chaque joueur.
  const deadNow = new Set<string>();
  for (const e of state.log) {
    if (e.event.type === 'death') {
      if (deadNow.has(e.event.playerId)) errors.push('Un joueur est mort deux fois sans revenir en jeu.');
      deadNow.add(e.event.playerId);
    } else if (e.event.type === 'revived') {
      if (!deadNow.has(e.event.playerId)) errors.push('Retour en jeu d’un joueur vivant.');
      deadNow.delete(e.event.playerId);
    }
  }
  const dead = state.players.filter((p) => !p.alive).length;
  if (dead !== deadNow.size) errors.push(`Morts enregistrées (${deadNow.size}) ≠ joueurs morts (${dead}).`);
  if (state.mayorAbolished && state.mayorId) errors.push('Un maire existe alors que le poste est aboli.');
  const drawnIds = state.events.map((e) => e.cardId);
  if (new Set(drawnIds).size !== drawnIds.length) errors.push('Une carte Événement a été tirée deux fois.');

  if (state.lovers) {
    const [a, b] = state.lovers;
    if (a === b) errors.push('Un joueur est amoureux de lui-même.');
    if (!ids.has(a) || !ids.has(b)) errors.push('Amoureux inconnus.');
    const pa = state.players.find((p) => p.id === a);
    const pb = state.players.find((p) => p.id === b);
    if (pa && pb && pa.alive !== pb.alive && state.pending.length === 0) errors.push('Un Amoureux survit à l’autre.');
  }
  if (state.mayorId) {
    const m = state.players.find((p) => p.id === state.mayorId);
    if (!m) errors.push('Maire inconnu.');
    else if (!m.alive && !state.pending.some((d) => d.kind === 'mayor-succession')) errors.push('Le maire est mort sans succession en attente.');
  }

  const openBallots = state.ballots.filter((b) => b.status === 'open' || b.status === 'closed');
  if (openBallots.length > 1) errors.push('Plusieurs scrutins actifs simultanément.');
  for (const b of state.ballots) {
    const c = countBallot(b);
    for (const [target, v] of Object.entries(c.tallies)) {
      if (v < 0) errors.push(`Scrutin ${b.id} : voix négatives pour ${target}.`);
    }
    for (const [target, v] of Object.entries(c.anonymous)) {
      if (v < 0) errors.push(`Scrutin ${b.id} : compteur anonyme négatif (${target}).`);
    }
    if (state.setup.variants.strictVoterCount && c.cast > b.voters.length) errors.push(`Scrutin ${b.id} : plus de bulletins que de votants.`);
    for (const voter of Object.keys(c.byVoter)) {
      if (!b.voters.includes(voter)) errors.push(`Scrutin ${b.id} : votant non autorisé.`);
    }
  }

  if (state.phase.kind === 'night') {
    if (!state.night) errors.push('Nuit sans enregistrement.');
    const keys = new Set(computeNightSteps(state).map((s) => s.key));
    for (const k of Object.keys(state.night?.choices ?? {})) {
      if (!keys.has(k)) errors.push(`Choix orphelin : ${k}.`);
    }
  }
  if (state.phase.kind === 'ended' && !state.victory) errors.push('Partie terminée sans résultat.');
  if (state.victory && state.pending.length > 0) errors.push('Victoire déclarée avec des décisions en attente.');
  return errors;
}
