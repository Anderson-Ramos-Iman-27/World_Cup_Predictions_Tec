import {
  ConflictException,
  ForbiddenException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { MatchStatus, PredictionOutcome, PredictionType, Prisma } from '@prisma/client';
import { PredictionsService } from './predictions.service';

describe('PredictionsService', () => {
  const prisma = {
    roomMember: {
      findUnique: jest.fn(),
    },
    match: {
      findUnique: jest.fn(),
    },
    prediction: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
  };

  let service: PredictionsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PredictionsService(prisma as never);
  });

  it('creates one global prediction before match starts', async () => {
    prisma.match.findUnique.mockResolvedValue({
      id: 'match-1',
      status: MatchStatus.SCHEDULED,
      utcDate: new Date(Date.now() + 60 * 60 * 1000),
    });
    prisma.prediction.create.mockResolvedValue({ id: 'prediction-1' });

    await expect(
      service.create('user-1', {
        matchId: 'match-1',
        predictionType: PredictionType.EXACT_SCORE,
        homeScore: 2,
        awayScore: 1,
      }),
    ).resolves.toEqual({ id: 'prediction-1' });
  });

  it('rejects prediction after match is no longer scheduled', async () => {
    prisma.match.findUnique.mockResolvedValue({
      id: 'match-1',
      status: MatchStatus.LIVE,
      utcDate: new Date(Date.now() + 60 * 60 * 1000),
    });

    await expect(
      service.create('user-1', {
        matchId: 'match-1',
        predictionType: PredictionType.EXACT_SCORE,
        homeScore: 2,
        awayScore: 1,
      }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('rejects duplicate prediction', async () => {
    prisma.match.findUnique.mockResolvedValue({
      id: 'match-1',
      status: MatchStatus.SCHEDULED,
      utcDate: new Date(Date.now() + 60 * 60 * 1000),
    });
    prisma.prediction.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: 'test',
      }),
    );

    await expect(
      service.create('user-1', {
        matchId: 'match-1',
        predictionType: PredictionType.WINNER,
        predictedWinner: PredictionOutcome.HOME,
        homeScore: 2,
        awayScore: 1,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects editing another user prediction', async () => {
    prisma.prediction.findUnique.mockResolvedValue({
      id: 'prediction-1',
      userId: 'other-user',
      match: {
        status: MatchStatus.SCHEDULED,
        utcDate: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    await expect(
      service.update('prediction-1', 'user-1', {
        homeScore: 1,
        awayScore: 1,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
