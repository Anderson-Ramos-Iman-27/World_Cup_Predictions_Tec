import { Module } from '@nestjs/common';
import { CacheModule } from '../cache/cache.module';
import { UsersModule } from '../users/users.module';
import { RankingsController } from './rankings.controller';
import { RankingsService } from './rankings.service';

@Module({
  imports: [CacheModule, UsersModule],
  controllers: [RankingsController],
  providers: [RankingsService],
  exports: [RankingsService],
})
export class RankingsModule {}
