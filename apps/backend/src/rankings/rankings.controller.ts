import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
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
}
