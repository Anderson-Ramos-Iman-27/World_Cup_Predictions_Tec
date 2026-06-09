import { MatchStatus, SyncStatus } from '@prisma/client';
import { FootballDataService } from './football-data.service';

describe('FootballDataService', () => {
  const footballDataClient = {
    getMatches: jest.fn(),
  };

  const prisma = {
    team: {
      upsert: jest.fn(),
    },
    match: {
      upsert: jest.fn(),
    },
    syncLog: {
      create: jest.fn(),
      findFirst: jest.fn(),
    },
  };

  const scoringService = {
    recalculateMatchScores: jest.fn(),
  };

  let service: FootballDataService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new FootballDataService(
      footballDataClient as never,
      prisma as never,
      scoringService as never,
    );
  });

  it('syncs matches and triggers scoring for finished matches', async () => {
    footballDataClient.getMatches.mockResolvedValue({
      matches: [
        {
          id: 100,
          utcDate: '2026-06-11T20:00:00Z',
          status: 'FINISHED',
          homeTeam: { id: 1, name: 'Peru', shortName: 'PER' },
          awayTeam: { id: 2, name: 'Argentina', shortName: 'ARG' },
          score: { fullTime: { home: 2, away: 1 } },
        },
      ],
    });
    prisma.team.upsert
      .mockResolvedValueOnce({ id: 'team-home' })
      .mockResolvedValueOnce({ id: 'team-away' });
    prisma.match.upsert.mockResolvedValue({
      id: 'match-1',
      status: MatchStatus.FINISHED,
    });
    prisma.syncLog.create.mockResolvedValue({
      status: SyncStatus.SUCCESS,
    });

    await expect(service.syncMatches()).resolves.toMatchObject({
      status: SyncStatus.SUCCESS,
      totalMatches: 1,
      finishedMatches: 1,
    });
    expect(prisma.match.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { externalId: 100 },
        update: expect.objectContaining({
          status: MatchStatus.FINISHED,
          homeScore: 2,
          awayScore: 1,
        }),
      }),
    );
    expect(scoringService.recalculateMatchScores).toHaveBeenCalledWith('match-1');
  });

  it('registers sync errors and keeps local system available', async () => {
    footballDataClient.getMatches.mockRejectedValue(new Error('API unavailable'));
    prisma.syncLog.create.mockResolvedValue({
      status: SyncStatus.ERROR,
      message: 'API unavailable',
    });

    await expect(service.syncMatches()).resolves.toEqual({
      status: SyncStatus.ERROR,
      message: 'API unavailable',
    });
  });
});
