import { NotFoundException } from '@nestjs/common';
import { MatchStatus } from '@prisma/client';
import { MatchesService } from './matches.service';

describe('MatchesService', () => {
  const prisma = {
    match: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
  };

  let service: MatchesService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new MatchesService(prisma as never);
  });

  it('lists matches ordered by date and filtered by status', async () => {
    prisma.match.findMany.mockResolvedValue([]);

    await service.findAll({ status: MatchStatus.SCHEDULED });

    expect(prisma.match.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: MatchStatus.SCHEDULED },
        orderBy: { utcDate: 'asc' },
      }),
    );
  });

  it('returns match detail', async () => {
    prisma.match.findUnique.mockResolvedValue({
      id: 'match-1',
      status: MatchStatus.SCHEDULED,
    });

    await expect(service.findOne('match-1')).resolves.toMatchObject({
      id: 'match-1',
    });
  });

  it('throws when match does not exist', async () => {
    prisma.match.findUnique.mockResolvedValue(null);

    await expect(service.findOne('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
