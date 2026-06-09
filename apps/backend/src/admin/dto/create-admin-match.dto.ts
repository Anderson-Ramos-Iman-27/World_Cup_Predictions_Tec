import { MatchStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateAdminMatchDto {
  @IsString()
  homeTeamId!: string;

  @IsString()
  awayTeamId!: string;

  @Type(() => Date)
  @IsDate()
  utcDate!: Date;

  @IsOptional()
  @IsEnum(MatchStatus)
  status?: MatchStatus;
}
