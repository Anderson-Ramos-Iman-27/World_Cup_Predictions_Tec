import { Injectable, Logger, UnprocessableEntityException } from '@nestjs/common';
import { MatchStatus, PredictionOutcome, PredictionType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RankingsService } from '../rankings/rankings.service';

type FinishedPrediction = {
  id: string;
  userId: string;
  roomId: string | null;
  predictionType: PredictionType;
  predictedWinner: PredictionOutcome | null;
  goalDifference: number | null;
  homeScore: number | null;
  awayScore: number | null;
  submittedAt: Date;
  match: {
    id: string;
    utcDate: Date;
    status: MatchStatus;
    homeScore: number | null;
    awayScore: number | null;
  };
};

export type ScoreCalculation = {
  basePoints: number;
  bonusPoints: number;
  totalPoints: number;
  reason: string;
  winnerCorrect: boolean;
};

@Injectable()
export class ScoringService {
  private readonly logger = new Logger(ScoringService.name);
  private readonly anticipationThresholdMs = 24 * 60 * 60 * 1000;

  constructor(
    private readonly prisma: PrismaService,
    private readonly rankingsService: RankingsService,
  ) {}

  calculatePredictionScore(
    prediction: FinishedPrediction,
    consecutiveWinnerHits: number,
  ): ScoreCalculation {
    const { match } = prediction;

    if (match.status !== MatchStatus.FINISHED) {
      throw new UnprocessableEntityException('Match is not finished yet');
    }

    if (match.homeScore === null || match.awayScore === null) {
      throw new UnprocessableEntityException('Finished match has no final score');
    }

    const actualDifference = match.homeScore - match.awayScore;
    const actualOutcome = this.getOutcomeFromDifference(actualDifference);
    const predictedOutcome =
      prediction.predictedWinner ??
      (prediction.homeScore !== null && prediction.awayScore !== null
        ? this.getOutcomeFromDifference(prediction.homeScore - prediction.awayScore)
        : null);
    const predictedDifference =
      prediction.goalDifference ??
      (prediction.homeScore !== null && prediction.awayScore !== null
        ? Math.abs(prediction.homeScore - prediction.awayScore)
        : null);
    const exactResult =
      prediction.homeScore === match.homeScore &&
      prediction.awayScore === match.awayScore;
    const winnerCorrect = predictedOutcome === actualOutcome;
    const differenceCorrect =
      winnerCorrect &&
      predictedDifference === Math.abs(actualDifference);
    const earlyPrediction =
      match.utcDate.getTime() - prediction.submittedAt.getTime() >
      this.anticipationThresholdMs;

    const basePoints = this.getBasePointsForPrediction(
      prediction.predictionType,
      exactResult,
      winnerCorrect,
      differenceCorrect,
    );
    const streakBonus =
      winnerCorrect && consecutiveWinnerHits > 0 && consecutiveWinnerHits % 3 === 0
        ? 2
        : 0;
    const anticipationBonus = earlyPrediction ? 1 : 0;
    const bonusPoints = streakBonus + anticipationBonus;
    const reasons = [];

    if (prediction.predictionType === PredictionType.EXACT_SCORE && exactResult) {
      reasons.push('resultado exacto');
    } else if (prediction.predictionType === PredictionType.WINNER && winnerCorrect) {
      reasons.push('ganador correcto');
    } else if (
      prediction.predictionType === PredictionType.GOAL_DIFFERENCE &&
      differenceCorrect
    ) {
      reasons.push('diferencia de goles correcta');
    } else {
      reasons.push('sin acierto base');
    }

    if (streakBonus > 0) {
      reasons.push('bonus por racha');
    }

    if (anticipationBonus > 0) {
      reasons.push('prediccion anticipada');
    }

    return {
      basePoints,
      bonusPoints,
      totalPoints: basePoints + bonusPoints,
      reason: reasons.join(', '),
      winnerCorrect,
    };
  }

  private getBasePointsForPrediction(
    predictionType: PredictionType,
    exactResult: boolean,
    winnerCorrect: boolean,
    differenceCorrect: boolean,
  ) {
    if (predictionType === PredictionType.EXACT_SCORE) {
      return exactResult ? 5 : 0;
    }

    if (predictionType === PredictionType.WINNER) {
      return winnerCorrect ? 3 : 0;
    }

    if (predictionType === PredictionType.GOAL_DIFFERENCE) {
      return differenceCorrect ? 2 : 0;
    }

    return 0;
  }

  private getOutcomeFromDifference(difference: number) {
    if (difference > 0) {
      return PredictionOutcome.HOME;
    }

    if (difference < 0) {
      return PredictionOutcome.AWAY;
    }

    return PredictionOutcome.DRAW;
  }

  async recalculateMatchScores(matchId: string) {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      select: {
        id: true,
        status: true,
        homeScore: true,
        awayScore: true,
      },
    });

    if (!match) {
      throw new UnprocessableEntityException('Match not found');
    }

    if (match.status !== MatchStatus.FINISHED) {
      return {
        matchId,
        status: 'skipped',
        reason: 'match-not-finished',
        recalculatedGroups: 0,
        updatedScores: 0,
      };
    }

    if (match.homeScore === null || match.awayScore === null) {
      throw new UnprocessableEntityException('Finished match has no final score');
    }

    const groups = await this.prisma.prediction.findMany({
      distinct: ['userId'],
      where: { matchId },
      select: {
        userId: true,
      },
    });

    let updatedScores = 0;

    for (const group of groups) {
      updatedScores += await this.recalculateUserScores(group.userId);
    }

    await this.invalidateRankingCachesForUsers(groups.map((group) => group.userId));

    return {
      matchId,
      status: 'recalculated',
      recalculatedGroups: groups.length,
      updatedScores,
    };
  }

  async recalculateAllScores() {
    const groups = await this.prisma.prediction.findMany({
      distinct: ['userId'],
      where: {
        match: {
          status: MatchStatus.FINISHED,
          homeScore: { not: null },
          awayScore: { not: null },
        },
      },
      select: {
        userId: true,
      },
    });

    let updatedScores = 0;

    for (const group of groups) {
      updatedScores += await this.recalculateUserScores(group.userId);
    }

    await this.invalidateRankingCachesForUsers(groups.map((group) => group.userId));

    return {
      status: 'recalculated',
      recalculatedGroups: groups.length,
      updatedScores,
    };
  }

  async recalculateUserScores(userId: string) {
    const predictions = await this.prisma.prediction.findMany({
      where: {
        userId,
        match: {
          status: MatchStatus.FINISHED,
          homeScore: { not: null },
          awayScore: { not: null },
        },
      },
      include: {
        match: true,
      },
      orderBy: [
        {
          match: {
            utcDate: 'asc',
          },
        },
        {
          submittedAt: 'asc',
        },
      ],
    });

    let consecutiveWinnerHits = 0;
    const predictionsByMatch = this.groupPredictionsByMatch(predictions);

    for (const matchPredictions of predictionsByMatch) {
      const actualDifference =
        matchPredictions[0].match.homeScore! - matchPredictions[0].match.awayScore!;
      const actualOutcome = this.getOutcomeFromDifference(actualDifference);
      const hasWinnerHit = matchPredictions.some((prediction) => {
        const predictedOutcome =
          prediction.predictedWinner ??
          (prediction.homeScore !== null && prediction.awayScore !== null
            ? this.getOutcomeFromDifference(prediction.homeScore - prediction.awayScore)
            : null);

        return predictedOutcome === actualOutcome;
      });

      consecutiveWinnerHits = hasWinnerHit ? consecutiveWinnerHits + 1 : 0;

      for (const prediction of matchPredictions) {
        const calculation = this.calculatePredictionScore(
          prediction,
          consecutiveWinnerHits,
        );

        await this.prisma.score.upsert({
          where: { predictionId: prediction.id },
          update: {
            basePoints: calculation.basePoints,
            bonusPoints: calculation.bonusPoints,
            totalPoints: calculation.totalPoints,
            reason: calculation.reason,
            calculatedAt: new Date(),
          },
          create: {
            predictionId: prediction.id,
            basePoints: calculation.basePoints,
            bonusPoints: calculation.bonusPoints,
            totalPoints: calculation.totalPoints,
            reason: calculation.reason,
          },
        });
      }
    }

    return predictions.length;
  }

  private async invalidateRankingCachesForUsers(userIds: string[]) {
    const memberships = await this.prisma.roomMember.findMany({
      where: {
        userId: {
          in: [...new Set(userIds)],
        },
      },
      select: {
        roomId: true,
      },
    });

    await this.invalidateRankingCaches(memberships.map((member) => member.roomId));
  }

  private groupPredictionsByMatch<T extends { match: { id: string } }>(
    predictions: T[],
  ) {
    const groups = new Map<string, T[]>();

    for (const prediction of predictions) {
      const current = groups.get(prediction.match.id) ?? [];
      current.push(prediction);
      groups.set(prediction.match.id, current);
    }

    return [...groups.values()];
  }

  private async invalidateRankingCaches(roomIds: string[]) {
    const uniqueRoomIds = [...new Set(roomIds)];

    await this.rankingsService.invalidateGlobalRanking();

    if (uniqueRoomIds.length === 0) {
      return;
    }

    await this.rankingsService.invalidateRoomRankings(uniqueRoomIds);
    this.logger.log(
      `Ranking cache invalidated for rooms: ${uniqueRoomIds.join(', ')}`,
    );
  }
}
