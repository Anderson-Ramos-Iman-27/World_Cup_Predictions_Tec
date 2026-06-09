import { Module } from '@nestjs/common';
import { ScoringModule } from '../scoring/scoring.module';
import { UsersModule } from '../users/users.module';
import { FootballDataClient } from './football-data.client';
import { FootballDataController } from './football-data.controller';
import { FootballDataPublicController } from './football-data-public.controller';
import { FootballDataScheduler } from './football-data.scheduler';
import { FootballDataService } from './football-data.service';

@Module({
  imports: [ScoringModule, UsersModule],
  controllers: [FootballDataController, FootballDataPublicController],
  providers: [FootballDataClient, FootballDataService, FootballDataScheduler],
  exports: [FootballDataService],
})
export class FootballDataModule {}
