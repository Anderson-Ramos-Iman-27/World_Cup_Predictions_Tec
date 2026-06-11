import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { MatchStatus, PredictionOutcome, PredictionType, Prisma, Role } from '@prisma/client';
import { AuthenticatedUser } from '../common/types/authenticated-user.type';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePredictionDto } from './dto/create-prediction.dto';
import { UpdatePredictionDto } from './dto/update-prediction.dto';

@Injectable()
export class PredictionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, createPredictionDto: CreatePredictionDto) {
    await this.ensureMatchCanBePredicted(createPredictionDto.matchId);
    if (createPredictionDto.roomId) {
      await this.ensureRoomMember(createPredictionDto.roomId, userId);
    }
    this.validatePredictionPayload(createPredictionDto);

    try {
      return await this.prisma.prediction.create({
        data: {
          userId,
          matchId: createPredictionDto.matchId,
          roomId: createPredictionDto.roomId ?? null,
          predictionType: createPredictionDto.predictionType,
          homeScore:
            createPredictionDto.predictionType === PredictionType.EXACT_SCORE
              ? createPredictionDto.homeScore
              : null,
          awayScore:
            createPredictionDto.predictionType === PredictionType.EXACT_SCORE
              ? createPredictionDto.awayScore
              : null,
          predictedWinner:
            createPredictionDto.predictionType === PredictionType.EXACT_SCORE
              ? this.getOutcomeFromScore(
                  createPredictionDto.homeScore!,
                  createPredictionDto.awayScore!,
                )
              : createPredictionDto.predictedWinner,
          goalDifference:
            createPredictionDto.predictionType === PredictionType.EXACT_SCORE
              ? Math.abs(
                  createPredictionDto.homeScore! -
                    createPredictionDto.awayScore!,
                )
              : createPredictionDto.predictionType === PredictionType.GOAL_DIFFERENCE
                ? createPredictionDto.goalDifference
                : null,
        },
        include: this.predictionInclude(),
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'Ya registraste una prediccion de esta modalidad para este partido',
        );
      }

      throw error;
    }
  }

  private validatePredictionPayload(createPredictionDto: CreatePredictionDto) {
    if (createPredictionDto.predictionType === PredictionType.EXACT_SCORE) {
      if (
        createPredictionDto.homeScore === undefined ||
        createPredictionDto.awayScore === undefined
      ) {
        throw new UnprocessableEntityException(
          'Debes ingresar el marcador exacto',
        );
      }

      return;
    }

    if (!createPredictionDto.predictedWinner) {
      throw new UnprocessableEntityException(
        'Debes seleccionar ganador o empate',
      );
    }

    if (
      createPredictionDto.predictionType === PredictionType.GOAL_DIFFERENCE &&
      createPredictionDto.predictedWinner === PredictionOutcome.DRAW
    ) {
      throw new UnprocessableEntityException(
        'La diferencia de goles requiere seleccionar un ganador',
      );
    }

    if (
      createPredictionDto.predictionType === PredictionType.GOAL_DIFFERENCE &&
      (!createPredictionDto.goalDifference ||
        createPredictionDto.goalDifference < 1)
    ) {
      throw new UnprocessableEntityException(
        'Debes ingresar una diferencia de goles mayor a cero',
      );
    }
  }

  private getOutcomeFromScore(homeScore: number, awayScore: number) {
    if (homeScore > awayScore) {
      return PredictionOutcome.HOME;
    }

    if (awayScore > homeScore) {
      return PredictionOutcome.AWAY;
    }

    return PredictionOutcome.DRAW;
  }

  async findMyPredictions(userId: string) {
    return this.prisma.prediction.findMany({
      where: {
        userId,
        roomId: null,
      },
      include: this.predictionInclude(),
      orderBy: { submittedAt: 'desc' },
    });
  }

  async findRoomPredictions(roomId: string, user: AuthenticatedUser) {
    await this.ensureRoomAccess(roomId, user);

    return this.prisma.prediction.findMany({
      where: {
        roomId,
      },
      include: this.predictionInclude(),
      orderBy: { submittedAt: 'desc' },
    });
  }

  async findRoomMemberPredictions(
    roomId: string,
    userId: string,
    viewer: AuthenticatedUser,
  ) {
    await this.ensureRoomAccess(roomId, viewer);
    await this.ensureRoomMember(roomId, userId);

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
        roomId,
        userId,
      },
      include: this.predictionInclude(),
      orderBy: { submittedAt: 'desc' },
    });

    return {
      room,
      user,
      predictions,
    };
  }

  async update(
    predictionId: string,
    userId: string,
    updatePredictionDto: UpdatePredictionDto,
  ) {
    const prediction = await this.prisma.prediction.findUnique({
      where: { id: predictionId },
      include: {
        match: true,
      },
    });

    if (!prediction) {
      throw new NotFoundException('Prediction not found');
    }

    if (prediction.userId !== userId) {
      throw new ForbiddenException('You can only edit your own predictions');
    }

    void updatePredictionDto;

    throw new ConflictException('Predictions cannot be edited after submission');
  }

  private async ensureRoomMember(roomId: string, userId: string) {
    const member = await this.prisma.roomMember.findUnique({
      where: {
        roomId_userId: {
          roomId,
          userId,
        },
      },
    });

    if (!member) {
      throw new ForbiddenException('User is not a member of this room');
    }
  }

  private async ensureRoomAccess(roomId: string, user: AuthenticatedUser) {
    if (user.role === Role.ADMIN) {
      const room = await this.prisma.room.findUnique({
        where: { id: roomId },
      });

      if (!room) {
        throw new NotFoundException('Room not found');
      }

      return;
    }

    await this.ensureRoomMember(roomId, user.id);
  }

  private async ensureMatchCanBePredicted(matchId: string) {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
    });

    if (!match) {
      throw new NotFoundException('Match not found');
    }

    this.assertMatchCanBePredicted(match);
  }

  private assertMatchCanBePredicted(match: {
    utcDate: Date;
    status: MatchStatus;
  }) {
    if (match.status !== MatchStatus.SCHEDULED || match.utcDate <= new Date()) {
      throw new UnprocessableEntityException(
        'Predictions are closed for this match',
      );
    }
  }

  private predictionInclude() {
    return {
      match: {
        include: {
          homeTeam: {
            select: {
              id: true,
              name: true,
              shortName: true,
              crestUrl: true,
            },
          },
          awayTeam: {
            select: {
              id: true,
              name: true,
              shortName: true,
              crestUrl: true,
            },
          },
        },
      },
      room: {
        select: {
          id: true,
          name: true,
          color: true,
        },
      },
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      score: true,
    };
  }
}
