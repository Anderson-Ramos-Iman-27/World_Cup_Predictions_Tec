import { MatchStatus } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';

export class ListMatchesQueryDto {
  @IsOptional()
  @IsEnum(MatchStatus)
  status?: MatchStatus;
}
