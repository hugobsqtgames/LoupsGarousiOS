import type { CustomNightAction, CustomOnDeath, CustomRoleDef, CustomSchedule, CustomWinCondition, Team } from '../types';

/**
 * Rôles personnalisés : définition purement déclarative.
 * Aucune expression ni code utilisateur n'est évalué ; seuls des choix
 * parmi des listes fermées sont acceptés.
 */

export const CUSTOM_ACTIONS: readonly CustomNightAction[] = ['none', 'inspect', 'protect', 'kill', 'mark'];
export const CUSTOM_SCHEDULES: readonly CustomSchedule[] = ['every_night', 'first_night', 'even_nights', 'odd_nights'];
export const CUSTOM_ON_DEATH: readonly CustomOnDeath[] = ['none', 'shoot'];
const TEAMS: readonly Team[] = ['village', 'wolves', 'solo'];
export const CUSTOM_WIN_CONDITIONS: readonly CustomWinCondition[] = ['camp', 'last-survivor', 'all-marked', 'first-round-death', 'opposite-group'];

/** Conditions de victoire calquées sur les rôles officiels (entre parenthèses : le modèle). */
export const CUSTOM_WIN_LABELS: Record<CustomWinCondition, string> = {
  camp: 'Gagne avec son camp (comme un Villageois ou un Loup-Garou)',
  'last-survivor': 'Seul survivant (comme le Loup-Garou blanc)',
  'all-marked': 'Tous les autres survivants marqués par lui (comme le Joueur de flûte)',
  'first-round-death': 'Éliminé au premier tour, sinon devient villageois (comme l’Ange)',
  'opposite-group': 'Tout le groupe opposé éliminé (comme l’Abominable sectaire)',
};

/** Condition effective (les anciens rôles n'en avaient pas). */
export function effectiveWinCondition(def: Pick<CustomRoleDef, 'team' | 'winCondition'>): CustomWinCondition {
  if (def.winCondition) return def.winCondition;
  return def.team === 'solo' ? 'last-survivor' : 'camp';
}

export const CUSTOM_ACTION_LABELS: Record<CustomNightAction, string> = {
  none: 'Aucune action nocturne',
  inspect: 'Découvrir le rôle d’un joueur',
  protect: 'Protéger un joueur des attaques nocturnes',
  kill: 'Éliminer un joueur',
  mark: 'Marquer un joueur (marque permanente, comme le charme du Joueur de flûte)',
};

export const CUSTOM_SCHEDULE_LABELS: Record<CustomSchedule, string> = {
  every_night: 'Chaque nuit',
  first_night: 'Première nuit seulement',
  even_nights: 'Nuits paires',
  odd_nights: 'Nuits impaires',
};

export const CUSTOM_ON_DEATH_LABELS: Record<CustomOnDeath, string> = {
  none: 'Aucun effet',
  shoot: 'Emporte un joueur avec lui (comme le Chasseur)',
};

export interface ValidationIssue {
  field: string;
  message: string;
}

export function slugify(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

/** Valide une définition inconnue (ex. : issue d'un import JSON). */
export function validateCustomRole(input: unknown): { ok: true; role: CustomRoleDef } | { ok: false; issues: ValidationIssue[] } {
  const issues: ValidationIssue[] = [];
  if (typeof input !== 'object' || input === null) {
    return { ok: false, issues: [{ field: 'root', message: 'Définition absente ou invalide.' }] };
  }
  const o = input as Record<string, unknown>;
  const str = (k: string) => (typeof o[k] === 'string' ? (o[k] as string) : null);

  const id = str('id');
  if (!id || !/^custom:[a-z0-9-]{1,40}$/.test(id)) issues.push({ field: 'id', message: 'Identifiant invalide (custom:<lettres-chiffres>).' });
  const name = str('name')?.trim() ?? '';
  if (name.length < 2 || name.length > 32) issues.push({ field: 'name', message: 'Le nom doit contenir entre 2 et 32 caractères.' });
  const description = str('description') ?? '';
  if (description.length > 500) issues.push({ field: 'description', message: 'Description limitée à 500 caractères.' });
  const team = str('team') as Team | null;
  if (!team || !TEAMS.includes(team)) issues.push({ field: 'team', message: 'Camp invalide.' });
  const nightAction = str('nightAction') as CustomNightAction | null;
  if (!nightAction || !CUSTOM_ACTIONS.includes(nightAction)) issues.push({ field: 'nightAction', message: 'Action nocturne invalide.' });
  const schedule = str('schedule') as CustomSchedule | null;
  if (!schedule || !CUSTOM_SCHEDULES.includes(schedule)) issues.push({ field: 'schedule', message: 'Fréquence invalide.' });
  const onDeath = str('onDeath') as CustomOnDeath | null;
  if (!onDeath || !CUSTOM_ON_DEATH.includes(onDeath)) issues.push({ field: 'onDeath', message: 'Effet au décès invalide.' });
  const uses = o.uses;
  if (!(uses === null || (typeof uses === 'number' && Number.isInteger(uses) && uses >= 1 && uses <= 20))) {
    issues.push({ field: 'uses', message: 'Utilisations : illimité ou entier entre 1 et 20.' });
  }
  if (typeof o.canTargetSelf !== 'boolean') issues.push({ field: 'canTargetSelf', message: 'Valeur booléenne attendue.' });
  const winRaw = o.winCondition;
  const winCondition = winRaw === undefined ? undefined : (winRaw as CustomWinCondition);
  if (winCondition !== undefined && !CUSTOM_WIN_CONDITIONS.includes(winCondition)) {
    issues.push({ field: 'winCondition', message: 'Condition de victoire invalide.' });
  } else if (team && TEAMS.includes(team)) {
    const effective = effectiveWinCondition({ team, winCondition });
    if (team === 'solo' && effective === 'camp') issues.push({ field: 'winCondition', message: 'Un solitaire n’a pas de camp : choisissez une condition de victoire propre.' });
    if (team !== 'solo' && effective !== 'camp') issues.push({ field: 'winCondition', message: 'Un rôle du village ou des loups gagne avec son camp ; choisissez « Solitaire » pour une condition propre.' });
    if (effective === 'all-marked' && nightAction !== 'mark') issues.push({ field: 'winCondition', message: 'Cette condition nécessite l’action nocturne « Marquer un joueur ».' });
  }
  const wakeOrder = o.wakeOrder;
  if (!(typeof wakeOrder === 'number' && Number.isInteger(wakeOrder) && wakeOrder >= 0 && wakeOrder <= 100)) {
    issues.push({ field: 'wakeOrder', message: 'Ordre de réveil : entier entre 0 et 100.' });
  }
  if (issues.length > 0) return { ok: false, issues };
  return {
    ok: true,
    role: {
      id: id as CustomRoleDef['id'],
      name,
      description,
      team: team as Team,
      nightAction: nightAction as CustomNightAction,
      schedule: schedule as CustomSchedule,
      uses: uses as number | null,
      canTargetSelf: o.canTargetSelf as boolean,
      onDeath: onDeath as CustomOnDeath,
      wakeOrder: wakeOrder as number,
      ...(winCondition ? { winCondition } : {}),
    },
  };
}

export function customWakesOnNight(def: CustomRoleDef, night: number): boolean {
  if (def.nightAction === 'none') return false;
  switch (def.schedule) {
    case 'every_night':
      return true;
    case 'first_night':
      return night === 1;
    case 'even_nights':
      return night % 2 === 0;
    case 'odd_nights':
      return night % 2 === 1;
  }
}
