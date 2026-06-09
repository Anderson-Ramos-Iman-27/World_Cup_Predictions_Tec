import { RankingsService } from './rankings.service';

describe('RankingsService', () => {
  const prisma = {
    prediction: {
      findMany: jest.fn(),
    },
    room: {
      findUnique: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  };
  const cacheService = {
    getJson: jest.fn(),
    setJson: jest.fn(),
    del: jest.fn(),
  };

  let service: RankingsService;

  beforeEach(() => {
    jest.clearAllMocks();
    cacheService.getJson.mockResolvedValue(null);
    service = new RankingsService(prisma as never, cacheService as never);
  });

  it('builds global ranking by summing all scored predictions', async () => {
    prisma.prediction.findMany.mockResolvedValue([
      prediction('user-1', 'Ana', 5),
      prediction('user-1', 'Ana', 3),
      prediction('user-2', 'Luis', 10),
    ]);

    await expect(service.getGlobalRanking()).resolves.toEqual([
      expect.objectContaining({
        position: 1,
        userId: 'user-2',
        totalPoints: 10,
        predictionsCount: 1,
      }),
      expect.objectContaining({
        position: 2,
        userId: 'user-1',
        totalPoints: 8,
        predictionsCount: 2,
      }),
    ]);
    expect(cacheService.setJson).toHaveBeenCalledWith(
      'rankings:global',
      expect.any(Array),
      60,
    );
  });

  it('returns cached global ranking when available', async () => {
    cacheService.getJson.mockResolvedValue([
      {
        position: 1,
        userId: 'cached-user',
        name: 'Cached',
        email: 'cached@example.com',
        totalPoints: 99,
        predictionsCount: 4,
      },
    ]);

    await expect(service.getGlobalRanking()).resolves.toMatchObject([
      { userId: 'cached-user', totalPoints: 99 },
    ]);
    expect(prisma.prediction.findMany).not.toHaveBeenCalled();
  });

  it('builds room ranking with members that have zero points', async () => {
    prisma.room.findUnique.mockResolvedValue({
      id: 'room-1',
      members: [
        member('user-1', 'Ana'),
        member('user-2', 'Luis'),
        member('user-3', 'Marta'),
      ],
    });
    prisma.prediction.findMany.mockResolvedValue([
      roomPrediction('user-1', 7),
      roomPrediction('user-2', 3),
    ]);

    await expect(service.getRoomRanking('room-1')).resolves.toEqual([
      expect.objectContaining({ position: 1, userId: 'user-1', totalPoints: 7 }),
      expect.objectContaining({ position: 2, userId: 'user-2', totalPoints: 3 }),
      expect.objectContaining({ position: 3, userId: 'user-3', totalPoints: 0 }),
    ]);
  });

  it('returns top 3 as room podium', async () => {
    prisma.room.findUnique.mockResolvedValue({
      id: 'room-1',
      members: [
        member('user-1', 'Ana'),
        member('user-2', 'Luis'),
        member('user-3', 'Marta'),
        member('user-4', 'Pedro'),
      ],
    });
    prisma.prediction.findMany.mockResolvedValue([
      roomPrediction('user-1', 9),
      roomPrediction('user-2', 7),
      roomPrediction('user-3', 5),
      roomPrediction('user-4', 3),
    ]);

    await expect(service.getRoomPodium('room-1')).resolves.toHaveLength(3);
  });

  it('invalidates global, room ranking and room podium cache keys', async () => {
    await service.invalidateRoomRankings(['room-1', 'room-1', 'room-2']);

    expect(cacheService.del).toHaveBeenCalledWith([
      'rankings:global',
      'rankings:rooms:room-1',
      'rankings:rooms:room-1:podium',
      'rankings:rooms:room-2',
      'rankings:rooms:room-2:podium',
    ]);
  });

  function prediction(userId: string, name: string, totalPoints: number) {
    return {
      userId,
      user: {
        id: userId,
        name,
        email: `${userId}@example.com`,
      },
      score: {
        totalPoints,
      },
    };
  }

  function member(userId: string, name: string) {
    return {
      userId,
      user: {
        id: userId,
        name,
        email: `${userId}@example.com`,
      },
    };
  }

  function roomPrediction(userId: string, totalPoints: number) {
    return {
      userId,
      score: {
        totalPoints,
      },
    };
  }
});
