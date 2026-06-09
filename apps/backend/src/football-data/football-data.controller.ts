import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { FootballDataService } from './football-data.service';

@Controller('admin/sync/football-data')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class FootballDataController {
  constructor(private readonly footballDataService: FootballDataService) {}

  @Post()
  syncNow() {
    return this.footballDataService.syncMatches();
  }

  @Get('status')
  getStatus() {
    return this.footballDataService.getLastSyncStatus();
  }
}
