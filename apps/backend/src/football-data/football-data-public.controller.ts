import { Controller, Get } from '@nestjs/common';
import { FootballDataService } from './football-data.service';

@Controller('football-data')
export class FootballDataPublicController {
  constructor(private readonly footballDataService: FootballDataService) {}

  @Get('standings')
  getStandings() {
    return this.footballDataService.getGroupStandings();
  }

  @Get('knockout')
  getKnockoutMatches() {
    return this.footballDataService.getKnockoutMatches();
  }
}
