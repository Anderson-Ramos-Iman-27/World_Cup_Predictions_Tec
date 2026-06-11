import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FootballDataService } from './football-data.service';

@Injectable()
export class FootballDataScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(FootballDataScheduler.name);
  private syncInterval: NodeJS.Timeout | null = null;

  constructor(
    private readonly footballDataService: FootballDataService,
    private readonly configService: ConfigService,
  ) {}

  onModuleInit() {
    const intervalMinutes = Number(
      this.configService.get<string>('FOOTBALL_DATA_SYNC_INTERVAL_MINUTES', '5'),
    );

    if (!Number.isFinite(intervalMinutes) || intervalMinutes <= 0) {
      this.logger.log(
        'Automated Football-Data sync disabled because FOOTBALL_DATA_SYNC_INTERVAL_MINUTES is not a positive number.',
      );
      return;
    }

    const intervalMs = intervalMinutes * 60 * 1000;
    this.syncInterval = setInterval(() => {
      void this.syncPeriodically();
    }, intervalMs);

    this.logger.log(
      `Automated Football-Data sync enabled every ${intervalMinutes} minute(s).`,
    );
  }

  onModuleDestroy() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  async syncPeriodically() {
    try {
      const result = await this.footballDataService.syncMatches();

      this.logger.log(
        `Scheduled Football-Data sync completed with status ${result.status}.`,
      );
    } catch (error) {
      this.logger.warn(
        `Scheduled Football-Data sync failed: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
    }
  }
}
