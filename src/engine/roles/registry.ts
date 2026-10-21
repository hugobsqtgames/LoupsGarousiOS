import type { BuiltinRoleId, CustomRoleDef, RoleId } from '../types';
import { BUILTIN_ROLES, type RoleDefinition } from './catalog';
import { CUSTOM_ACTION_LABELS, CUSTOM_ON_DEATH_LABELS, CUSTOM_SCHEDULE_LABELS } from './custom';

export function isCustomRoleId(id: string): id is `custom:${string}` {
  return id.startsWith('custom:');
}

export function customToDefinition(def: CustomRoleDef): RoleDefinition {
  const balance = def.team === 'wolves' ? -6 : def.team === 'solo' ? -3 : def.nightAction === 'none' ? 1 : 3;
  return {
    id: def.id,
    name: def.name,
    team: def.team,
    expansion: 'custom',
    icon: 'custom',
    summary: def.description || CUSTOM_ACTION_LABELS[def.nightAction],
    power: CUSTOM_ACTION_LABELS[def.nightAction],
    activation: CUSTOM_SCHEDULE_LABELS[def.schedule],
    timing: def.nightAction === 'none' ? '—' : 'Nuit',
    uses: def.uses === null ? 'Illimité' : `${def.uses} fois`,
    targets: def.canTargetSelf ? 'Un joueur vivant (lui compris)' : 'Un autre joueur vivant',
    effectDuration: def.nightAction === 'protect' ? 'La nuit en cours' : 'Immédiat',
    onDeath: CUSTOM_ON_DEATH_LABELS[def.onDeath],
    restrictions: [],
    interactions: def.nightAction === 'kill' ? ['Attaque bloquée par le Salvateur et les protections personnalisées.'] : [],
    nightOrder: def.nightAction === 'none' ? null : def.wakeOrder,
    nightStep: def.nightAction === 'none' ? null : 'custom',
    sources: ['Rôle créé par le MJ'],
    certainty: 'probable',
    uncertainties: [],
    maxCopies: 5,
    balance,
  };
}

export class RoleRegistry {
  private readonly custom = new Map<string, CustomRoleDef>();

  constructor(customRoles: readonly CustomRoleDef[] = []) {
    for (const c of customRoles) this.custom.set(c.id, c);
  }

  has(id: RoleId): boolean {
    return isCustomRoleId(id) ? this.custom.has(id) : BUILTIN_ROLES.has(id as BuiltinRoleId);
  }

  get(id: RoleId): RoleDefinition {
    if (isCustomRoleId(id)) {
      const c = this.custom.get(id);
      if (!c) throw new Error(`Rôle personnalisé inconnu : ${id}`);
      return customToDefinition(c);
    }
    const r = BUILTIN_ROLES.get(id as BuiltinRoleId);
    if (!r) throw new Error(`Rôle inconnu : ${id}`);
    return r;
  }

  getCustom(id: RoleId): CustomRoleDef | null {
    return isCustomRoleId(id) ? (this.custom.get(id) ?? null) : null;
  }
}
