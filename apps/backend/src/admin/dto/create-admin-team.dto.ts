import { IsOptional, IsString, IsUrl, MaxLength, MinLength } from 'class-validator';

export class CreateAdminTeamDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  shortName?: string;

  @IsOptional()
  @IsUrl()
  crestUrl?: string;
}
