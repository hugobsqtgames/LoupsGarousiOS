import type { GameSummary } from '@/storage/repository';
import { balanceSamples, computePlayerStats, computeStats } from './stats';

const g = (over: Partial<GameSummary>): GameSummary => ({
  id: 'x', name: 'x', createdAt: '', updatedAt: '', status: 'ended', phaseLabel: '', playerCount: 8, aliveCount: 2, winner: 'village', winners: [], roles: ['loup-garou', 'voyante'], winnerRoles: ['voyante'], nights: 3, days: 3, actionCount: 10, ...over,
});

describe('statistiques', () => {
  it('exclut parties en cours et abandons des victoires', () => {
    const s = computeStats([g({}), g({ winner: 'wolves', winnerRoles: ['loup-garou'], nights: 5 }), g({ status: 'active', winner: null }), g({ winner: 'abandoned', winnerRoles: [] })]);
    expect(s).toMatchObject({ total: 4, active: 1, decided: 2, abandoned: 1, avgNights: 4 });
    expect(s.winsByCamp).toEqual([{ winner: 'village', count: 1 }, { winner: 'wolves', count: 1 }]);
    expect(s.roleWins.find((r) => r.roleId === 'voyante')).toEqual({ roleId: 'voyante', played: 2, won: 1 });
  });

  it('aucune donnée : pas de moyenne inventée', () => {
    expect(computeStats([])).toMatchObject({ total: 0, avgPlayers: null, avgNights: null, winsByCamp: [] });
  });
});

describe('statistiques par joueur', () => {
  const pl = (name: string, over: Partial<NonNullable<GameSummary['players']>[number]> = {}) => ({
    name, roleId: 'villageois' as const, finalRoleId: 'villageois' as const, team: 'village', won: false, alive: false, deathPhase: null, firstNightDeath: false, mayorTimes: 0, ...over,
  });

  it('regroupe par nom (casse et accents ignorés) et calcule les taux', () => {
    const games = [
      g({ updatedAt: '2026-01-01', players: [pl('Élodie', { won: true, alive: true, mayorTimes: 1 }), pl('Marc', { roleId: 'loup-garou', firstNightDeath: true })] }),
      g({ updatedAt: '2026-02-01', players: [pl('elodie', { roleId: 'voyante' }), pl('Marc', { roleId: 'loup-garou', won: true })] }),
      g({ status: 'active', winner: null, updatedAt: '2026-03-01', players: [pl('ELODIE')] }),
    ];
    const stats = computePlayerStats(games);
    const elodie = stats.find((s) => s.key === 'elodie')!;
    expect(elodie).toMatchObject({ games: 3, decided: 2, wins: 1, winRate: 0.5, survived: 1, mayorTimes: 1, name: 'ELODIE' });
    expect(elodie.roles[0]).toEqual({ roleId: 'villageois', count: 2 });
    const marc = stats.find((s) => s.key === 'marc')!;
    expect(marc).toMatchObject({ games: 2, wins: 1, firstNightDeaths: 1 });
  });

  it('résumés anciens sans détail : ignorés sans erreur', () => {
    expect(computePlayerStats([g({})])).toEqual([]);
  });

  it('échantillons d’équilibrage : parties décidées seulement', () => {
    expect(balanceSamples([g({}), g({ winner: 'wolves' }), g({ winner: 'abandoned' }), g({ status: 'active', winner: null })])).toEqual([
      { roles: ['loup-garou', 'voyante'], villageWon: true },
      { roles: ['loup-garou', 'voyante'], villageWon: false },
    ]);
  });
});
