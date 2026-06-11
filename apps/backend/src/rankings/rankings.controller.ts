import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../common/types/authenticated-user.type';
import { RankingsService } from './rankings.service';

@Controller('rankings')
export class RankingsController {
  constructor(private readonly rankingsService: RankingsService) {}

  @Get('global')
  getGlobalRanking() {
    return this.rankingsService.getGlobalRanking();
  }

  @Get('rooms/:roomId')
  @UseGuards(JwtAuthGuard)
  getRoomRanking(@Param('roomId') roomId: string) {
    return this.rankingsService.getRoomRanking(roomId);
  }

  @Get('rooms/:roomId/podium')
  @UseGuards(JwtAuthGuard)
  getRoomPodium(@Param('roomId') roomId: string) {
    return this.rankingsService.getRoomPodium(roomId);
  }

  @Get('users/:userId/history')
  @UseGuards(JwtAuthGuard)
  getUserHistory(@Param('userId') userId: string) {
    return this.rankingsService.getUserHistory(userId);
  }

  @Get('rooms/:roomId/users/:userId/history')
  @UseGuards(JwtAuthGuard)
  getRoomUserHistory(
    @CurrentUser() viewer: AuthenticatedUser,
    @Param('roomId') roomId: string,
    @Param('userId') userId: string,
  ) {
    return this.rankingsService.getRoomUserHistory(roomId, userId, viewer);
  }
}
