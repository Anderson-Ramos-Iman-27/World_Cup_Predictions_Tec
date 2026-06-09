import { IsOptional, IsString, Length, Matches } from 'class-validator';

export class UpdateRoomDto {
  @IsOptional()
  @IsString()
  @Length(3, 80)
  name?: string;

  @IsOptional()
  @IsString()
  @Length(0, 240)
  description?: string;

  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/)
  color?: string;
}
