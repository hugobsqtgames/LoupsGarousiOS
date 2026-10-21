import { deepClone } from '../clone';
import { assert } from '../core';
import { initialUses } from '../setup';
import { findPlayer, getPlayer, isWolfSide, registryOf } from '../selectors';
import type { GameState, PlayerId, PlayerState, StepPayload } from '../types';
import { computeNightSteps, type NightStep } from './steps';

/** Victimes des attaques de loups déclarées cette nuit (pour la potion de vie). */
export function attackedThisNight(state: GameState, choices: Record<string, StepPayload>): PlayerId[] {
  const out = new Set<PlayerId>();
  const wolves = choices.wolves;
  const packTarget = packVictim(state, wolves);
  const infected = Object.entries(choices).some(([k, c]) => k.startsWith('infect:') && c.infect === true);
  if (packTarget && !infected) out.add(packTarget);
  for (const [k, c] of Object.entries(choices)) {
    if ((k.startsWith('big-bad-wolf:') || k.startsWith('white-wolf:')) && c.target) out.add(c.target);
  }
  return [...out];
}

/** Victime de la meute (la Petite Fille surprise remplace la cible). */
export function packVictim(state: GameState, wolves: StepPayload | undefined): PlayerId | null {
  if (!wolves) return null;
  if (wolves.littleGirlCaught) {
    const girl = state.players.find((p) => p.alive && p.roleId === 'petite-fille' && !isWolfSide(p));
    return girl ? girl.id : (wolves.target ?? null);
  }
  return wolves.target ?? null;
}

export function protectedThisNight(state: GameState, choices: Record<string, StepPayload>): Set<PlayerId> {
  const out = new Set<PlayerId>();
  for (const [k, c] of Object.entries(choices)) {
    if (k.startsWith('salvateur:') && c.target) out.add(c.target);
    if (k.startsWith('custom:') && c.target) {
      const actor = findPlayer(state, k.slice('custom:'.length));
      const def = actor ? registryOf(state).getCustom(actor.roleId) : null;
      if (def?.nightAction === 'protect') out.add(c.target);
    }
  }
  return out;
}

function aliveTarget(state: GameState, id: PlayerId | null | undefined, label: string): PlayerState | null {
  if (id === null || id === undefined) return null;
  const p = findPlayer(state, id);
  assert(p, 'unknown-player', `${label} : joueur inconnu.`);
  assert(p.alive, 'dead-target', `${label} : ${p.name} est déjà éliminé(e).`);
  return p;
}

/**
 * Vérifie qu'un choix est admissible pour une étape, compte tenu des choix
 * déjà validés pour les étapes précédentes. Lève une RuleError sinon.
 */
export function validateStepPayload(state: GameState, step: NightStep, payload: StepPayload, prior: Record<string, StepPayload>): void {
  const actor = step.actorIds.length === 1 ? getPlayer(state, step.actorIds[0]) : null;
  const v = state.setup.variants;
  switch (step.kind) {
    case 'bluff':
    case 'lovers':
    case 'sisters':
    case 'brothers':
    case 'charmed':
      return;
    case 'thief': {
      const cards = state.setup.extraCards.slice(0, 2);
      const idx = payload.cardIndex ?? null;
      assert(idx === null || idx === 0 || idx === 1, 'thief-card', 'Carte du Voleur invalide.');
      if (cards.length === 2 && cards.every((c) => c === 'loup-garou')) {
        assert(idx !== null, 'thief-must-take', 'Les deux cartes sont des loups : le Voleur doit en prendre une.');
      }
      return;
    }
    case 'comedian': {
      const idx = payload.cardIndex ?? null;
      const available = state.night?.startComedianCards ?? [];
      assert(idx === null || (Number.isInteger(idx) && idx >= 0 && idx < available.length), 'comedian-card', 'Carte du Comédien invalide.');
      return;
    }
    case 'wolfhound':
      assert(payload.team === 'village' || payload.team === 'wolves', 'wolfhound-team', 'Le Chien-loup doit choisir un camp.');
      return;
    case 'cupid': {
      const t = payload.targets ?? [];
      assert(t.length === 2 && t[0] !== t[1], 'cupid-two', 'Cupidon doit désigner deux joueurs distincts.');
      aliveTarget(state, t[0], 'Cupidon');
      aliveTarget(state, t[1], 'Cupidon');
      return;
    }
    case 'wild-child': {
      const t = aliveTarget(state, payload.target, 'Enfant sauvage');
      assert(t, 'wild-model', 'L’Enfant sauvage doit choisir un modèle.');
      assert(t.id !== actor?.id, 'wild-self', 'L’Enfant sauvage ne peut pas se choisir.');
      return;
    }
    case 'salvateur': {
      const t = aliveTarget(state, payload.target, 'Salvateur');
      if (!t || !actor) return;
      if (!v.salvateurSelf) assert(t.id !== actor.id, 'salvateur-self', 'Le Salvateur ne peut pas se protéger (variante).');
      if (v.salvateurNoRepeat) assert(t.id !== actor.lastProtected, 'salvateur-repeat', `${t.name} a déjà été protégé(e) la nuit dernière.`);
      return;
    }
    case 'seer': {
      const t = aliveTarget(state, payload.target, 'Voyante');
      if (t && actor) assert(t.id !== actor.id, 'seer-self', 'La Voyante ne peut pas se sonder.');
      return;
    }
    case 'fox':
    case 'raven':
      aliveTarget(state, payload.target, step.kind === 'fox' ? 'Renard' : 'Corbeau');
      return;
    case 'wolves': {
      if (payload.littleGirlCaught) {
        const girl = state.players.find((p) => p.alive && p.roleId === 'petite-fille' && !isWolfSide(p));
        assert(girl, 'no-girl', 'Aucune Petite Fille vivante dans la partie.');
        return;
      }
      const t = aliveTarget(state, payload.target, 'Loups');
      if (t) assert(!isWolfSide(t), 'wolf-on-wolf', 'Un loup ne peut pas dévorer un autre loup.');
      return;
    }
    case 'infect': {
      if (!payload.infect) return;
      assert(actor && (actor.uses.infect ?? 0) > 0, 'infect-used', 'Le pouvoir d’infection a déjà été utilisé.');
      const victim = packVictim(state, prior.wolves);
      assert(victim, 'infect-no-victim', 'Aucune victime à infecter cette nuit.');
      assert(!protectedThisNight(state, prior).has(victim), 'infect-protected', 'La victime est protégée : l’infection est impossible.');
      return;
    }
    case 'white-wolf': {
      const t = aliveTarget(state, payload.target, 'Loup-Garou blanc');
      if (t && actor) {
        assert(isWolfSide(t), 'white-not-wolf', 'Le Loup-Garou blanc ne peut dévorer qu’un loup.');
        assert(t.id !== actor.id, 'white-self', 'Le Loup-Garou blanc ne peut pas se dévorer.');
      }
      return;
    }
    case 'big-bad-wolf': {
      const t = aliveTarget(state, payload.target, 'Grand Méchant Loup');
      if (t) assert(!isWolfSide(t), 'bbw-wolf', 'Le Grand Méchant Loup ne peut pas dévorer un loup.');
      if (t) assert(t.id !== packVictim(state, prior.wolves), 'bbw-same', 'Cette victime est déjà celle de la meute.');
      return;
    }
    case 'witch': {
      assert(actor, 'witch-actor', 'Sorcière introuvable.');
      const heal = payload.heal ?? null;
      const poison = payload.poison ?? null;
      if (heal) {
        assert((actor.uses.heal ?? 0) > 0, 'heal-used', 'La potion de vie a déjà été utilisée.');
        assert(attackedThisNight(state, prior).includes(heal), 'heal-not-attacked', 'La potion de vie ne peut sauver qu’une victime attaquée cette nuit.');
        if (!v.witchSelfHeal) assert(heal !== actor.id, 'heal-self', 'La Sorcière ne peut pas se sauver (variante).');
      }
      if (poison) {
        assert((actor.uses.poison ?? 0) > 0, 'poison-used', 'La potion de mort a déjà été utilisée.');
        aliveTarget(state, poison, 'Potion de mort');
        assert(poison !== heal, 'heal-poison-same', 'Impossible de sauver et d’empoisonner la même personne.');
      }
      return;
    }
    case 'piper': {
      const t = payload.targets ?? [];
      assert(t.length <= 2 && new Set(t).size === t.length, 'piper-two', 'Le Joueur de flûte charme deux joueurs au plus.');
      for (const id of t) {
        const p = aliveTarget(state, id, 'Joueur de flûte');
        assert(p && p.id !== actor?.id, 'piper-self', 'Le Joueur de flûte ne se charme pas lui-même.');
        assert(!p.charmed, 'piper-charmed', `${p.name} est déjà charmé(e).`);
      }
      const candidates = state.players.filter((p) => p.alive && !p.charmed && p.id !== actor?.id).length;
      assert(t.length === Math.min(2, candidates), 'piper-count', `Le Joueur de flûte doit charmer ${Math.min(2, candidates)} joueur(s).`);
      return;
    }
    case 'custom': {
      assert(actor, 'custom-actor', 'Acteur introuvable.');
      const def = registryOf(state).getCustom(actor.roleId);
      assert(def, 'custom-def', 'Rôle personnalisé introuvable.');
      const t = aliveTarget(state, payload.target, def.name);
      if (t && !def.canTargetSelf) assert(t.id !== actor.id, 'custom-self', `${def.name} ne peut pas se cibler.`);
      return;
    }
  }
}

/** Applique un choix « immédiat » qui modifie l'état de la nuit. */
function applyImmediate(state: GameState, step: NightStep, payload: StepPayload): void {
  const actor = step.actorIds[0] ? getPlayer(state, step.actorIds[0]) : null;
  const reg = registryOf(state);
  switch (step.kind) {
    case 'thief': {
      if (!actor || payload.cardIndex === null || payload.cardIndex === undefined) return;
      const card = state.setup.extraCards[payload.cardIndex];
      const def = reg.get(card);
      actor.roleId = card;
      actor.team = def.team;
      actor.uses = initialUses(card, reg);
      return;
    }
    case 'comedian': {
      if (!actor || payload.cardIndex === null || payload.cardIndex === undefined || !state.night) return;
      const card = state.night.startComedianCards[payload.cardIndex];
      actor.comedianRole = card;
      if (card === 'sorciere') actor.uses = { ...actor.uses, heal: 1, poison: 1 };
      state.comedianCards = state.night.startComedianCards.filter((_, i) => i !== payload.cardIndex);
      return;
    }
    case 'wolfhound':
      if (!actor || !payload.team) return;
      actor.team = payload.team;
      actor.transformed = payload.team === 'wolves';
      return;
    case 'cupid': {
      const t = payload.targets;
      if (!t || t.length !== 2) return;
      state.lovers = [t[0], t[1]];
      return;
    }
    case 'wild-child':
      if (!actor || !payload.target) return;
      actor.wildChildModel = payload.target;
      return;
    default:
      return;
  }
}

export interface RebuildResult {
  dropped: string[];
}

/**
 * Recalcule l'état de la nuit à partir de l'instantané de début de nuit et de
 * l'ensemble des choix. Les choix devenus invalides (après une correction
 * d'une étape antérieure) sont retirés et signalés.
 */
export function rebuildNight(state: GameState, choices: Record<string, StepPayload>): RebuildResult {
  const night = state.night;
  if (!night) return { dropped: [] };
  state.players = deepClone(night.startPlayers);
  state.lovers = night.startLovers ? [night.startLovers[0], night.startLovers[1]] : null;
  state.comedianCards = [...night.startComedianCards];
  night.choices = {};

  const valid: Record<string, StepPayload> = {};
  const processed = new Set<string>();
  // Les étapes peuvent changer après un choix immédiat : on recalcule jusqu'à stabilité.
  for (let pass = 0; pass < 50; pass++) {
    const steps = computeNightSteps(state);
    let changed = false;
    for (const step of steps) {
      if (processed.has(step.key)) continue;
      const c = choices[step.key];
      if (c === undefined) continue;
      processed.add(step.key);
      try {
        validateStepPayload(state, step, c, valid);
      } catch {
        continue;
      }
      valid[step.key] = c;
      night.choices = { ...valid };
      if (step.immediate) {
        applyImmediate(state, step, c);
        changed = true;
        break;
      }
    }
    if (!changed) break;
  }
  night.choices = valid;
  const dropped = Object.keys(choices).filter((k) => !(k in valid));
  return { dropped };
}
