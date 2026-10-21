/**
 * Copie profonde de données JSON (objets simples, tableaux, primitives).
 * Évite de dépendre de `structuredClone`, dont la disponibilité varie selon
 * les moteurs JavaScript embarqués.
 */
export function deepClone<T>(value: T): T {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map((v) => deepClone(v)) as unknown as T;
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(value as Record<string, unknown>)) {
    out[key] = deepClone((value as Record<string, unknown>)[key]);
  }
  return out as T;
}
