import type { RoleId, Winner } from '@/engine';
import type { GameSummary } from '@/storage/repository';

export interface Stats {
  total: number;
  active: number;
  /** Parties terminées avec un vainqueur (hors abandons). */
  decided: number;
  abandoned: number;
  winsByCamp: { winner: Winner; count: number }[];
  rolesPlayed: { roleId: RoleId; count: number }[];
  roleWins: { roleId: RoleId; played: number; won: number }[];
  avgPlayers: number | null;
  avgNights: number | null;
}

/**
 * Statistiques locales calculées uniquement à partir des parties enregistrées.
 * Les parties en cours et abandonnées sont exclues des taux de victoire.
 */
export function computeStats(games: GameSummary[]): Stats {
  const ended = games.filter((g) => g.status === 'ended');
  const decided = ended.filter((g) => g.winner && g.winner !== 'abandoned');
  const wins = new Map<Winner, number>();
  for (const g of decided) wins.set(g.winner!, (wins.get(g.winner!) ?? 0) + 1);
  const played = new Map<RoleId, number>();
  for (const g of games) for (const r of g.roles) played.set(r, (played.get(r) ?? 0) + 1);
  const rolePlayedDecided = new Map<RoleId, number>();
  const roleWon = new Map<RoleId, number>();
  for (const g of decided) {
    for (const r of new Set(g.roles)) rolePlayedDecided.set(r, (rolePlayedDecided.get(r) ?? 0) + 1);
    for (const r of new Set(g.winnerRoles)) roleWon.set(r, (roleWon.get(r) ?? 0) + 1);
  }
  const avg = (xs: number[]) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : null);
  return {
    total: games.length,
    active: games.filter((g) => g.status === 'active').length,
    decided: decided.length,
    abandoned: ended.length - decided.length,
    winsByCamp: [...wins].map(([winner, count]) => ({ winner, count })).sort((a, b) => b.count - a.count),
    rolesPlayed: [...played].map(([roleId, count]) => ({ roleId, count })).sort((a, b) => b.count - a.count),
    roleWins: [...rolePlayedDecided].map(([roleId, p]) => ({ roleId, played: p, won: roleWon.get(roleId) ?? 0 })).sort((a, b) => b.played - a.played),
    avgPlayers: avg(games.map((g) => g.playerCount)),
    avgNights: avg(decided.map((g) => g.nights)),
  };
}
