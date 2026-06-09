import { Module } from '@nestjs/common';
import { RankingsModule } from '../rankings/rankings.module';
import { ScoringService } from './scoring.service';

@Module({
  imports: [RankingsModule],
  providers: [ScoringService],
  exports: [ScoringService],
})
export class ScoringModule {}
