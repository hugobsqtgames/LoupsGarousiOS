import { nameKey, type GameOutcomeSample, type RoleId, type Winner } from '@/engine';
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

export interface PlayerStats {
  /** Clé d'identité : nom normalisé (insensible à la casse et aux accents). */
  key: string;
  name: string;
  games: number;
  /** Parties terminées avec un vainqueur. */
  decided: number;
  wins: number;
  winRate: number | null;
  survived: number;
  firstNightDeaths: number;
  mayorTimes: number;
  roles: { roleId: RoleId; count: number }[];
  lastPlayed: string;
}

/**
 * Statistiques par joueur. Sans compte ni identifiant, un joueur est reconnu
 * par son nom (même nom = même personne, à la casse et aux accents près).
 */
export function computePlayerStats(games: GameSummary[]): PlayerStats[] {
  const map = new Map<string, PlayerStats & { roleMap: Map<RoleId, number> }>();
  for (const g of games) {
    for (const p of g.players ?? []) {
      const key = nameKey(p.name);
      if (!key) continue;
      let s = map.get(key);
      if (!s) {
        s = { key, name: p.name, games: 0, decided: 0, wins: 0, winRate: null, survived: 0, firstNightDeaths: 0, mayorTimes: 0, roles: [], lastPlayed: '', roleMap: new Map() };
        map.set(key, s);
      }
      s.games += 1;
      const decided = g.status === 'ended' && g.winner !== null && g.winner !== 'abandoned';
      if (decided) {
        s.decided += 1;
        if (p.won) s.wins += 1;
        if (p.alive) s.survived += 1;
      }
      if (p.firstNightDeath) s.firstNightDeaths += 1;
      s.mayorTimes += p.mayorTimes;
      s.roleMap.set(p.roleId, (s.roleMap.get(p.roleId) ?? 0) + 1);
      if (g.updatedAt > s.lastPlayed) {
        s.lastPlayed = g.updatedAt;
        s.name = p.name;
      }
    }
  }
  return [...map.values()]
    .map(({ roleMap, ...s }) => ({
      ...s,
      winRate: s.decided > 0 ? s.wins / s.decided : null,
      roles: [...roleMap].map(([roleId, count]) => ({ roleId, count })).sort((a, b) => b.count - a.count),
    }))
    .sort((a, b) => b.games - a.games || a.name.localeCompare(b.name));
}

/** Échantillons pour l'équilibrage appris (parties terminées avec un vainqueur). */
export function balanceSamples(games: GameSummary[]): GameOutcomeSample[] {
  return games
    .filter((g) => g.status === 'ended' && g.winner && g.winner !== 'abandoned' && g.winner !== 'none')
    .map((g) => ({ roles: g.roles, villageWon: g.winner === 'village' }));
}
