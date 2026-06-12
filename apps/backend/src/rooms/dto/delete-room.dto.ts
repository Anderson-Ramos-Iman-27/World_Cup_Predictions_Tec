import { IsString, Length } from 'class-validator';

export class DeleteRoomDto {
  @IsString()
  @Length(3, 80)
  confirmName!: string;
}
