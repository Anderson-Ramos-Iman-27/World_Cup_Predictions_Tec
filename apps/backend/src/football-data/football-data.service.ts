import { Injectable } from '@nestjs/common';
import { MatchSource, MatchStatus, SyncStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ScoringService } from '../scoring/scoring.service';
import { FootballDataClient } from './football-data.client';
import { FootballDataMatch } from './types/football-data-match.type';

const knockoutStages = new Set([
  'LAST_32',
  'LAST_16',
  'QUARTER_FINALS',
  'SEMI_FINALS',
  'THIRD_PLACE',
  'FINAL',
]);

export interface FootballDataSyncResult {
  status: SyncStatus;
  totalMatches?: number;
  finishedMatches?: number;
  skippedMatches?: number;
  message?: string;
}

@Injectable()
export class FootballDataService {
  private currentSync: Promise<FootballDataSyncResult> | null = null;

  constructor(
    private readonly footballDataClient: FootballDataClient,
    private readonly prisma: PrismaService,
    private readonly scoringService: ScoringService,
  ) {}

  async syncMatches(): Promise<FootballDataSyncResult> {
    if (this.currentSync) {
      return this.currentSync;
    }

    this.currentSync = this.performSyncMatches().finally(() => {
      this.currentSync = null;
    });

    return this.currentSync;
  }

  queueSyncMatches() {
    void this.syncMatches();

    return {
      message: 'Sincronización iniciada en segundo plano.',
    };
  }

  private async performSyncMatches(): Promise<FootballDataSyncResult> {
    const startedAt = new Date();

    try {
      const response = await this.footballDataClient.getMatches();
      let finishedMatches = 0;
      let skippedMatches = 0;

      for (const externalMatch of response.matches) {
        const syncedMatch = await this.upsertMatch(externalMatch);

        if (!syncedMatch) {
          skippedMatches += 1;
          continue;
        }

        if (syncedMatch.status === MatchStatus.FINISHED) {
          finishedMatches += 1;
        }
      }

      let updatedScores = 0;

      if (finishedMatches > 0) {
        const recalculation = await this.scoringService.recalculateAllScores();
        updatedScores = recalculation.updatedScores;
      }

      const syncLog = await this.prisma.syncLog.create({
        data: {
          provider: 'football-data.org',
          status: skippedMatches > 0 ? SyncStatus.PARTIAL : SyncStatus.SUCCESS,
          message:
            skippedMatches > 0
              ? `Sincronizados ${response.matches.length - skippedMatches} partidos, ${skippedMatches} omitidos por datos incompletos`
              : `Sincronizados ${response.matches.length} partidos`,
          startedAt,
          finishedAt: new Date(),
          metadata: {
            totalMatches: response.matches.length,
            finishedMatches,
            skippedMatches,
            updatedScores,
          },
        },
      });

      return {
        status: syncLog.status,
        totalMatches: response.matches.length,
        finishedMatches,
        skippedMatches,
        message:
          finishedMatches > 0
            ? `Sincronizados ${response.matches.length - skippedMatches} partidos, ${skippedMatches} omitidos por datos incompletos. Puntajes recalculados para ${updatedScores} predicciones.`
            : syncLog.message ?? undefined,
      };
    } catch (error) {
      const syncLog = await this.prisma.syncLog.create({
        data: {
          provider: 'football-data.org',
          status: SyncStatus.ERROR,
          message: error instanceof Error ? error.message : 'Unknown sync error',
          startedAt,
          finishedAt: new Date(),
        },
      });

      return {
        status: syncLog.status,
        message: syncLog.message ?? undefined,
      };
    }
  }

  async getLastSyncStatus() {
    return this.prisma.syncLog.findFirst({
      where: { provider: 'football-data.org' },
      orderBy: { startedAt: 'desc' },
    });
  }

  async getGroupStandings() {
    const response = await this.footballDataClient.getStandings();

    return response.standings
      .filter((standing) => standing.type === 'TOTAL')
      .map((standing) => ({
        group: standing.group,
        table: standing.table,
      }));
  }

  async getKnockoutMatches() {
    const matches = await this.prisma.match.findMany({
      where: {
        stage: { in: Array.from(knockoutStages) },
      },
      include: {
        homeTeam: {
          select: {
            externalId: true,
            name: true,
            shortName: true,
            crestUrl: true,
          },
        },
        awayTeam: {
          select: {
            externalId: true,
            name: true,
            shortName: true,
            crestUrl: true,
          },
        },
      },
      orderBy: {
        utcDate: 'asc',
      },
    });

    if (!matches.length) {
      const response = await this.footballDataClient.getMatches();

      return response.matches
        .filter((match) => match.stage && knockoutStages.has(match.stage))
        .map((match) => ({
          id: match.id,
          utcDate: match.utcDate,
          status: match.status,
          stage: match.stage,
          homeTeam: match.homeTeam,
          awayTeam: match.awayTeam,
          score: match.score,
        }));
    }

    return matches.map((match) => ({
      id: match.externalId ?? 0,
      utcDate: match.utcDate.toISOString(),
      status: match.status,
      stage: match.stage ?? undefined,
      homeTeam: {
        id: match.homeTeam.externalId ?? 0,
        name: match.homeTeam.name,
        shortName: match.homeTeam.shortName,
        crest: match.homeTeam.crestUrl,
      },
      awayTeam: {
        id: match.awayTeam.externalId ?? 0,
        name: match.awayTeam.name,
        shortName: match.awayTeam.shortName,
        crest: match.awayTeam.crestUrl,
      },
      score: {
        fullTime: {
          home: match.homeScore,
          away: match.awayScore,
        },
      },
    }));
  }

  private async upsertMatch(externalMatch: FootballDataMatch) {
    if (
      !externalMatch.id ||
      !this.isValidTeam(externalMatch.homeTeam) ||
      !this.isValidTeam(externalMatch.awayTeam)
    ) {
      return null;
    }

    const homeTeam = await this.upsertTeam(externalMatch.homeTeam);
    const awayTeam = await this.upsertTeam(externalMatch.awayTeam);
    const status = this.mapStatus(externalMatch.status);
    const score = externalMatch.score?.fullTime;

    return this.prisma.match.upsert({
      where: { externalId: externalMatch.id },
      update: {
        homeTeamId: homeTeam.id,
        awayTeamId: awayTeam.id,
        utcDate: new Date(externalMatch.utcDate),
        stage: externalMatch.stage ?? null,
        status,
        homeScore: score?.home ?? null,
        awayScore: score?.away ?? null,
        source: MatchSource.FOOTBALL_DATA,
      },
      create: {
        externalId: externalMatch.id,
        homeTeamId: homeTeam.id,
        awayTeamId: awayTeam.id,
        utcDate: new Date(externalMatch.utcDate),
        stage: externalMatch.stage ?? null,
        status,
        homeScore: score?.home ?? null,
        awayScore: score?.away ?? null,
        source: MatchSource.FOOTBALL_DATA,
      },
    });
  }

  private async upsertTeam(team: FootballDataMatch['homeTeam']) {
    return this.prisma.team.upsert({
      where: { externalId: team.id as number },
      update: {
        name: team.name as string,
        shortName: team.shortName ?? team.tla,
        crestUrl: team.crest,
      },
      create: {
        externalId: team.id as number,
        name: team.name as string,
        shortName: team.shortName ?? team.tla,
        crestUrl: team.crest,
      },
    });
  }

  private isValidTeam(team: FootballDataMatch['homeTeam']) {
    return Boolean(team?.id && team.name);
  }

  private mapStatus(status: string): MatchStatus {
    switch (status) {
      case 'SCHEDULED':
      case 'TIMED':
        return MatchStatus.SCHEDULED;
      case 'IN_PLAY':
      case 'PAUSED':
        return MatchStatus.LIVE;
      case 'FINISHED':
        return MatchStatus.FINISHED;
      case 'POSTPONED':
      case 'SUSPENDED':
        return MatchStatus.POSTPONED;
      case 'CANCELLED':
        return MatchStatus.CANCELLED;
      default:
        return MatchStatus.SCHEDULED;
    }
  }
}
