import { MatchStatus, PredictionOutcome, PredictionType } from '@prisma/client';
import { ScoringService } from './scoring.service';

describe('ScoringService', () => {
  type PredictionFixture = {
    id: string;
    userId: string;
    roomId: string | null;
    predictionType: PredictionType;
    predictedWinner: PredictionOutcome | null;
    goalDifference: number | null;
    homeScore: number | null;
    awayScore: number | null;
    submittedAt: Date;
    match: typeof finishedMatch;
  };

  const prisma = {
    match: {
      findUnique: jest.fn(),
    },
    prediction: {
      findMany: jest.fn(),
    },
    score: {
      upsert: jest.fn(),
    },
    roomMember: {
      findMany: jest.fn(),
    },
  };
  const rankingsService = {
    invalidateGlobalRanking: jest.fn(),
    invalidateRoomRankings: jest.fn(),
  };

  let service: ScoringService;

  const finishedMatch = {
    id: 'match-1',
    utcDate: new Date('2026-06-10T20:00:00.000Z'),
    status: MatchStatus.FINISHED,
    homeScore: 2,
    awayScore: 1,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ScoringService(prisma as never, rankingsService as never);
  });

  it('assigns 5 base points for an exact result', () => {
    const calculation = service.calculatePredictionScore(
      prediction({ homeScore: 2, awayScore: 1 }),
      1,
    );

    expect(calculation.basePoints).toBe(5);
    expect(calculation.totalPoints).toBe(5);
    expect(calculation.reason).toContain('resultado exacto');
  });

  it('assigns 3 base points for a correct winner prediction', () => {
    const calculation = service.calculatePredictionScore(
      prediction({
        predictionType: PredictionType.WINNER,
        predictedWinner: PredictionOutcome.HOME,
        homeScore: null,
        awayScore: null,
        goalDifference: null,
      }),
      1,
    );

    expect(calculation.basePoints).toBe(3);
    expect(calculation.totalPoints).toBe(3);
    expect(calculation.reason).toContain('ganador correcto');
  });

  it('assigns 2 base points for a correct goal difference prediction', () => {
    const calculation = service.calculatePredictionScore(
      prediction({
        predictionType: PredictionType.GOAL_DIFFERENCE,
        predictedWinner: PredictionOutcome.HOME,
        goalDifference: 1,
        homeScore: null,
        awayScore: null,
      }),
      1,
    );

    expect(calculation.basePoints).toBe(2);
    expect(calculation.reason).toContain('diferencia de goles correcta');
  });

  it('assigns no base points when winner is incorrect', () => {
    const calculation = service.calculatePredictionScore(
      prediction({ homeScore: 0, awayScore: 1, predictedWinner: PredictionOutcome.AWAY }),
      0,
    );

    expect(calculation.basePoints).toBe(0);
    expect(calculation.totalPoints).toBe(0);
    expect(calculation.reason).toContain('sin acierto base');
  });

  it('adds 1 bonus point for predictions submitted more than 24 hours before kickoff', () => {
    const calculation = service.calculatePredictionScore(
      prediction({
        homeScore: 2,
        awayScore: 1,
        submittedAt: new Date('2026-06-09T19:59:59.000Z'),
      }),
      1,
    );

    expect(calculation.bonusPoints).toBe(1);
    expect(calculation.totalPoints).toBe(6);
    expect(calculation.reason).toContain('prediccion anticipada');
  });

  it('does not grant anticipation bonus when the prediction is wrong', () => {
    const calculation = service.calculatePredictionScore(
      prediction({
        homeScore: 0,
        awayScore: 1,
        submittedAt: new Date('2026-06-09T19:59:59.000Z'),
      }),
      1,
    );

    expect(calculation.basePoints).toBe(0);
    expect(calculation.bonusPoints).toBe(0);
    expect(calculation.totalPoints).toBe(0);
  });

  it('adds 2 streak bonus points on each third consecutive correct hit', () => {
    const calculation = service.calculatePredictionScore(
      prediction({
        predictionType: PredictionType.WINNER,
        predictedWinner: PredictionOutcome.HOME,
        homeScore: null,
        awayScore: null,
        goalDifference: null,
      }),
      2,
    );

    expect(calculation.basePoints).toBe(3);
    expect(calculation.bonusPoints).toBe(2);
    expect(calculation.totalPoints).toBe(5);
    expect(calculation.reason).toContain('bonus por racha');
  });

  it('recalculates a user chronologically and persists scores', async () => {
    prisma.prediction.findMany.mockResolvedValue([
      prediction({
        id: 'prediction-1',
        match: { ...finishedMatch, id: 'match-1', utcDate: new Date('2026-06-10T20:00:00.000Z') },
      }),
      prediction({
        id: 'prediction-2',
        match: { ...finishedMatch, id: 'match-2', utcDate: new Date('2026-06-11T20:00:00.000Z') },
      }),
      prediction({
        id: 'prediction-3',
        match: { ...finishedMatch, id: 'match-3', utcDate: new Date('2026-06-12T20:00:00.000Z') },
      }),
    ]);
    prisma.score.upsert.mockResolvedValue({});

    await expect(
      service.recalculateUserScores('user-1'),
    ).resolves.toBe(3);

    expect(prisma.score.upsert).toHaveBeenCalledTimes(3);
    expect(prisma.score.upsert).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: { predictionId: 'prediction-3' },
        update: expect.objectContaining({
          basePoints: 5,
          bonusPoints: 3,
          totalPoints: 8,
        }),
      }),
    );
  });

  it('keeps streak bonuses isolated per scope so room predictions do not inherit global streaks', async () => {
    prisma.prediction.findMany.mockResolvedValue([
      prediction({
        id: 'prediction-global-1',
        roomId: null,
        submittedAt: new Date('2026-06-10T18:00:00.000Z'),
      }),
      prediction({
        id: 'prediction-room-1',
        roomId: 'room-1',
        submittedAt: new Date('2026-06-10T19:00:00.000Z'),
      }),
      prediction({
        id: 'prediction-room-2',
        roomId: 'room-1',
        submittedAt: new Date('2026-06-10T20:00:00.000Z'),
      }),
    ]);
    prisma.score.upsert.mockResolvedValue({});

    await expect(service.recalculateUserScores('user-1')).resolves.toBe(3);

    expect(prisma.score.upsert).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        where: { predictionId: 'prediction-room-2' },
        update: expect.objectContaining({
          basePoints: 5,
          bonusPoints: 0,
          totalPoints: 5,
        }),
      }),
    );
  });

  it('recalculates all affected users for a finished match', async () => {
    prisma.match.findUnique.mockResolvedValue({
      id: 'match-1',
      status: MatchStatus.FINISHED,
      homeScore: 2,
      awayScore: 1,
    });
    prisma.prediction.findMany
      .mockResolvedValueOnce([
        { userId: 'user-1' },
        { userId: 'user-2' },
      ])
      .mockResolvedValueOnce([
        prediction({ id: 'prediction-1', userId: 'user-1', roomId: 'room-1' }),
      ])
      .mockResolvedValueOnce([
        prediction({ id: 'prediction-2', userId: 'user-2', roomId: 'room-1' }),
      ]);
    prisma.score.upsert.mockResolvedValue({});
    prisma.roomMember.findMany.mockResolvedValue([{ roomId: 'room-1' }]);

    await expect(service.recalculateMatchScores('match-1')).resolves.toEqual({
      matchId: 'match-1',
      status: 'recalculated',
      recalculatedGroups: 2,
      updatedScores: 2,
    });
  });

  function prediction(overrides: Partial<PredictionFixture> = {}) {
    return {
      id: 'prediction-1',
      userId: 'user-1',
      roomId: 'room-1',
      predictionType: PredictionType.EXACT_SCORE,
      predictedWinner: PredictionOutcome.HOME,
      goalDifference: 1,
      homeScore: 2,
      awayScore: 1,
      submittedAt: new Date('2026-06-10T19:00:00.000Z'),
      match: finishedMatch,
      ...overrides,
    };
  }
});
