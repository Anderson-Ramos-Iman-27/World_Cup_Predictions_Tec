import { PredictionOutcome, PredictionType } from '@prisma/client';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateIf,
} from 'class-validator';

export class CreatePredictionDto {
  @IsString()
  matchId!: string;

  @IsOptional()
  @IsString()
  roomId?: string;

  @IsEnum(PredictionType)
  predictionType!: PredictionType;

  @ValidateIf((dto: CreatePredictionDto) => dto.predictionType === PredictionType.EXACT_SCORE)
  @IsInt()
  @Min(0)
  homeScore?: number;

  @ValidateIf((dto: CreatePredictionDto) => dto.predictionType === PredictionType.EXACT_SCORE)
  @IsInt()
  @Min(0)
  awayScore?: number;

  @ValidateIf(
    (dto: CreatePredictionDto) =>
      dto.predictionType === PredictionType.WINNER ||
      dto.predictionType === PredictionType.GOAL_DIFFERENCE,
  )
  @IsEnum(PredictionOutcome)
  predictedWinner?: PredictionOutcome;

  @ValidateIf(
    (dto: CreatePredictionDto) =>
      dto.predictionType === PredictionType.GOAL_DIFFERENCE &&
      dto.predictedWinner !== PredictionOutcome.DRAW,
  )
  @IsInt()
  @Min(1)
  goalDifference?: number;
}
