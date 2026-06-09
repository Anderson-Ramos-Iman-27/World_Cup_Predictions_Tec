import { Controller, Get, Param, Query } from '@nestjs/common';
import { ListMatchesQueryDto } from './dto/list-matches-query.dto';
import { MatchesService } from './matches.service';

@Controller('matches')
export class MatchesController {
  constructor(private readonly matchesService: MatchesService) {}

  @Get()
  findAll(@Query() query: ListMatchesQueryDto) {
    return this.matchesService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') matchId: string) {
    return this.matchesService.findOne(matchId);
  }
}
