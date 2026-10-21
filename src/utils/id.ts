/** Identifiants locaux uniques (horodatage + aléa), sans dépendance réseau. */
let counter = 0;

export function makeId(prefix: string): string {
  counter = (counter + 1) % 1_000_000;
  const rand = Math.floor(Math.random() * 0xffffffff).toString(36);
  return `${prefix}-${Date.now().toString(36)}-${counter.toString(36)}-${rand}`;
}
