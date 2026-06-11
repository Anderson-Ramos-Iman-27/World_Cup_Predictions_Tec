import { Injectable, NotFoundException } from '@nestjs/common';
import { AuthenticatedUser } from '../common/types/authenticated-user.type';
import { CacheService } from '../cache/cache.service';
import { PrismaService } from '../prisma/prisma.service';

type RankedPrediction = {
  userId: string;
  submittedAt: Date;
  user: {
    name: string;
    email: string;
  };
  score: {
    totalPoints: number;
  } | null;
};

type RoomScoredPrediction = {
  userId: string;
  submittedAt: Date;
  score: {
    totalPoints: number;
  } | null;
};

type RoomRankingMember = {
  userId: string;
  user: {
    name: string;
    email: string;
  };
};

type RankingEntry = {
  position: number;
  userId: string;
  name: string;
  email: string;
  totalPoints: number;
  predictionsCount: number;
  firstPredictionAt?: string | null;
};

@Injectable()
export class RankingsService {
  private readonly cacheTtlSeconds = 60;

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
  ) {}

  async getGlobalRanking() {
    const cacheKey = 'rankings:global';
    const cached = await this.cacheService.getJson<RankingEntry[]>(cacheKey);

    if (cached) {
      return cached;
    }

    const predictions = (await this.prisma.prediction.findMany({
      where: {
        roomId: null,
        score: { isNot: null },
      },
      include: {
        user: true,
        score: true,
      },
    })) as RankedPrediction[];

    const ranking = this.buildRanking(
      predictions.map((prediction) => ({
        userId: prediction.userId,
        name: prediction.user.name,
        email: prediction.user.email,
        points: prediction.score?.totalPoints ?? 0,
        firstPredictionAt: prediction.submittedAt,
      })),
    );

    await this.cacheService.setJson(cacheKey, ranking, this.cacheTtlSeconds);
    return ranking;
  }

  async getRoomRanking(roomId: string) {
    const cacheKey = `rankings:rooms:${roomId}`;
    const cached = await this.cacheService.getJson<RankingEntry[]>(cacheKey);

    if (cached) {
      return cached;
    }

    const room = await this.prisma.room.findUnique({
      where: { id: roomId },
      include: {
        members: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!room) {
      throw new NotFoundException('Room not found');
    }

    const predictions = (await this.prisma.prediction.findMany({
      where: {
        roomId,
        score: { isNot: null },
      },
      include: {
        score: true,
      },
    })) as RoomScoredPrediction[];

    const pointsByUser = new Map<
      string,
      { points: number; count: number; firstPredictionAt: Date | null }
    >();

    for (const prediction of predictions) {
      const current = pointsByUser.get(prediction.userId) ?? {
        points: 0,
        count: 0,
        firstPredictionAt: null,
      };

      current.points += prediction.score?.totalPoints ?? 0;
      current.count += 1;
      if (
        !current.firstPredictionAt ||
        prediction.submittedAt < current.firstPredictionAt
      ) {
        current.firstPredictionAt = prediction.submittedAt;
      }
      pointsByUser.set(prediction.userId, current);
    }

    const ranking = this.positionRanking(
      (room.members as RoomRankingMember[]).map((member) => {
        const points = pointsByUser.get(member.userId);

        return {
          userId: member.userId,
          name: member.user.name,
          email: member.user.email,
          totalPoints: points?.points ?? 0,
          predictionsCount: points?.count ?? 0,
          firstPredictionAt: points?.firstPredictionAt?.toISOString() ?? null,
        };
      }),
    );

    await this.cacheService.setJson(cacheKey, ranking, this.cacheTtlSeconds);
    return ranking;
  }

  async getRoomPodium(roomId: string) {
    const cacheKey = `rankings:rooms:${roomId}:podium`;
    const cached = await this.cacheService.getJson<RankingEntry[]>(cacheKey);

    if (cached) {
      return cached;
    }

    const podium = (await this.getRoomRanking(roomId)).slice(0, 3);
    await this.cacheService.setJson(cacheKey, podium, this.cacheTtlSeconds);
    return podium;
  }

  async getUserHistory(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const predictions = await this.prisma.prediction.findMany({
      where: {
        userId,
        roomId: null,
      },
      include: {
        room: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
        match: {
          include: {
            homeTeam: true,
            awayTeam: true,
          },
        },
        score: true,
      },
      orderBy: {
        match: {
          utcDate: 'desc',
        },
      },
    });

    return {
      user,
      predictions,
    };
  }

  async getRoomUserHistory(
    roomId: string,
    userId: string,
    viewer: AuthenticatedUser,
  ) {
    await this.ensureCanViewRoom(roomId, viewer);

    const room = await this.prisma.room.findUnique({
      where: { id: roomId },
      select: {
        id: true,
        name: true,
        color: true,
        code: true,
      },
    });

    if (!room) {
      throw new NotFoundException('Room not found');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const predictions = await this.prisma.prediction.findMany({
      where: {
        userId,
        roomId,
      },
      include: {
        room: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
        match: {
          include: {
            homeTeam: true,
            awayTeam: true,
          },
        },
        score: true,
      },
      orderBy: {
        match: {
          utcDate: 'desc',
        },
      },
    });

    return {
      room,
      user,
      predictions,
    };
  }

  async invalidateGlobalRanking() {
    await this.cacheService.del(['rankings:global']);
  }

  async invalidateRoomRankings(roomIds: string[]) {
    const uniqueRoomIds = [...new Set(roomIds)];
    const keys = uniqueRoomIds.flatMap((roomId) => [
      `rankings:rooms:${roomId}`,
      `rankings:rooms:${roomId}:podium`,
    ]);

    await this.cacheService.del(['rankings:global', ...keys]);
  }

  private buildRanking(
    entries: Array<{
      userId: string;
      name: string;
      email: string;
      points: number;
      firstPredictionAt: Date;
    }>,
  ) {
    const grouped = new Map<
      string,
      Omit<RankingEntry, 'position'> & { totalPoints: number }
    >();

    for (const entry of entries) {
      const current = grouped.get(entry.userId) ?? {
        userId: entry.userId,
        name: entry.name,
        email: entry.email,
        totalPoints: 0,
        predictionsCount: 0,
        firstPredictionAt: null,
      };

      current.totalPoints += entry.points;
      current.predictionsCount += 1;
      const entryTimestamp = entry.firstPredictionAt.toISOString();
      if (!current.firstPredictionAt || entryTimestamp < current.firstPredictionAt) {
        current.firstPredictionAt = entryTimestamp;
      }
      grouped.set(entry.userId, current);
    }

    return this.positionRanking([...grouped.values()]);
  }

  private positionRanking(
    entries: Array<Omit<RankingEntry, 'position'>>,
  ): RankingEntry[] {
    return entries
      .sort((first, second) => {
        if (second.totalPoints !== first.totalPoints) {
          return second.totalPoints - first.totalPoints;
        }

        const firstTime = first.firstPredictionAt
          ? new Date(first.firstPredictionAt).getTime()
          : Number.POSITIVE_INFINITY;
        const secondTime = second.firstPredictionAt
          ? new Date(second.firstPredictionAt).getTime()
          : Number.POSITIVE_INFINITY;

        if (firstTime !== secondTime) {
          return firstTime - secondTime;
        }

        return first.name.localeCompare(second.name);
      })
      .map((entry, index) => ({
        position: index + 1,
        ...entry,
      }));
  }

  private async ensureCanViewRoom(roomId: string, user: AuthenticatedUser) {
    if (user.role === 'ADMIN') {
      const room = await this.prisma.room.findUnique({
        where: { id: roomId },
      });

      if (!room) {
        throw new NotFoundException('Room not found');
      }

      return;
    }

    const member = await this.prisma.roomMember.findUnique({
      where: {
        roomId_userId: {
          roomId,
          userId: user.id,
        },
      },
    });

    if (!member) {
      throw new NotFoundException('Room not found');
    }
  }
}
