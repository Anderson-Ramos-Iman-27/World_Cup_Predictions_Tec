import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { FootballDataService } from './football-data.service';

@Injectable()
export class FootballDataScheduler {
  private readonly logger = new Logger(FootballDataScheduler.name);

  constructor(private readonly footballDataService: FootballDataService) {}

  @Cron(CronExpression.EVERY_30_MINUTES)
  async syncPeriodically() {
    try {
      await this.footballDataService.syncMatches();
    } catch (error) {
      this.logger.warn(
        `Scheduled Football-Data sync failed: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
    }
  }
}
