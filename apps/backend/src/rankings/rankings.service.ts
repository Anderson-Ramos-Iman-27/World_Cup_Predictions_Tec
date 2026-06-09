import { Injectable, NotFoundException } from '@nestjs/common';
import { CacheService } from '../cache/cache.service';
import { PrismaService } from '../prisma/prisma.service';

type RankingEntry = {
  position: number;
  userId: string;
  name: string;
  email: string;
  totalPoints: number;
  predictionsCount: number;
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

    const predictions = await this.prisma.prediction.findMany({
      where: {
        score: { isNot: null },
      },
      include: {
        user: true,
        score: true,
      },
    });

    const ranking = this.buildRanking(
      predictions.map((prediction) => ({
        userId: prediction.userId,
        name: prediction.user.name,
        email: prediction.user.email,
        points: prediction.score?.totalPoints ?? 0,
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

    const memberIds = room.members.map((member) => member.userId);
    const predictions = await this.prisma.prediction.findMany({
      where: {
        userId: { in: memberIds },
        score: { isNot: null },
      },
      include: {
        score: true,
      },
    });

    const pointsByUser = new Map<string, { points: number; count: number }>();

    for (const prediction of predictions) {
      const current = pointsByUser.get(prediction.userId) ?? {
        points: 0,
        count: 0,
      };

      current.points += prediction.score?.totalPoints ?? 0;
      current.count += 1;
      pointsByUser.set(prediction.userId, current);
    }

    const ranking = this.positionRanking(
      room.members.map((member) => {
        const points = pointsByUser.get(member.userId);

        return {
          userId: member.userId,
          name: member.user.name,
          email: member.user.email,
          totalPoints: points?.points ?? 0,
          predictionsCount: points?.count ?? 0,
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
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.prisma.prediction.findMany({
      where: {
        userId,
        score: { isNot: null },
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
      };

      current.totalPoints += entry.points;
      current.predictionsCount += 1;
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

        return first.name.localeCompare(second.name);
      })
      .map((entry, index) => ({
        position: index + 1,
        ...entry,
      }));
  }
}
