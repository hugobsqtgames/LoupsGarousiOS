import type { GameSummary } from '@/storage/repository';
import { computeStats } from './stats';

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
