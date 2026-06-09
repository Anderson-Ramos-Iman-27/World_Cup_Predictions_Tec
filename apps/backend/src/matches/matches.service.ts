import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ListMatchesQueryDto } from './dto/list-matches-query.dto';

@Injectable()
export class MatchesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: ListMatchesQueryDto) {
    return this.prisma.match.findMany({
      where: {
        ...(query.status ? { status: query.status } : {}),
      },
      include: this.matchInclude(),
      orderBy: {
        utcDate: 'asc',
      },
    });
  }

  async findOne(matchId: string) {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      include: this.matchInclude(),
    });

    if (!match) {
      throw new NotFoundException('Match not found');
    }

    return match;
  }

  private matchInclude() {
    return {
      homeTeam: {
        select: {
          id: true,
          externalId: true,
          name: true,
          shortName: true,
          crestUrl: true,
        },
      },
      awayTeam: {
        select: {
          id: true,
          externalId: true,
          name: true,
          shortName: true,
          crestUrl: true,
        },
      },
    };
  }
}
