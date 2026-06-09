import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../common/types/authenticated-user.type';
import { RankingsService } from '../rankings/rankings.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { JoinRoomDto } from './dto/join-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { RoomsService } from './rooms.service';

@Controller('rooms')
@UseGuards(JwtAuthGuard)
export class RoomsController {
  constructor(
    private readonly roomsService: RoomsService,
    private readonly rankingsService: RankingsService,
  ) {}

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() createRoomDto: CreateRoomDto,
  ) {
    return this.roomsService.create(user.id, createRoomDto);
  }

  @Get('my')
  findMyRooms(@CurrentUser() user: AuthenticatedUser) {
    return this.roomsService.findMyRooms(user.id);
  }

  @Post('join')
  join(@CurrentUser() user: AuthenticatedUser, @Body() joinRoomDto: JoinRoomDto) {
    return this.roomsService.join(user.id, joinRoomDto);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') roomId: string) {
    return this.roomsService.findOneForUser(roomId, user);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') roomId: string,
    @Body() updateRoomDto: UpdateRoomDto,
  ) {
    return this.roomsService.update(roomId, user, updateRoomDto);
  }

  @Post(':id/invitations')
  createInvitation(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') roomId: string,
  ) {
    return this.roomsService.createInvitation(roomId, user);
  }

  @Get(':id/members')
  findMembers(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') roomId: string,
  ) {
    return this.roomsService.findMembers(roomId, user);
  }

  @Get(':id/podium')
  getPodium(@Param('id') roomId: string) {
    return this.rankingsService.getRoomPodium(roomId);
  }

  @Delete(':id/members/:userId')
  removeMember(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') roomId: string,
    @Param('userId') userId: string,
  ) {
    return this.roomsService.removeMember(roomId, userId, user);
  }
}
