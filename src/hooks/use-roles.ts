import { useMemo } from 'react';
import { BUILTIN_ROLE_LIST, customToDefinition, RoleRegistry, type RoleDefinition } from '@/engine';
import { useAppStore } from '@/state/app-store';

/** Registre des rôles (intégrés + personnalisés) pour l'interface. */
export function useRoleRegistry(): { registry: RoleRegistry; all: RoleDefinition[] } {
  const customRoles = useAppStore((s) => s.customRoles);
  return useMemo(
    () => ({ registry: new RoleRegistry(customRoles), all: [...BUILTIN_ROLE_LIST, ...customRoles.map(customToDefinition)] }),
    [customRoles],
  );
}
