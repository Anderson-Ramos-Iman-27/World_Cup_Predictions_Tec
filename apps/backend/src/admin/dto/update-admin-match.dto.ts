import { MatchStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateAdminMatchDto {
  @IsOptional()
  @IsString()
  homeTeamId?: string;

  @IsOptional()
  @IsString()
  awayTeamId?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  utcDate?: Date;

  @IsOptional()
  @IsEnum(MatchStatus)
  status?: MatchStatus;
}
