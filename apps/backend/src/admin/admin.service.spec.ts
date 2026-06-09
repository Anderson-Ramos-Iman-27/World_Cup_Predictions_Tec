import { BadRequestException } from '@nestjs/common';
import { MatchSource, MatchStatus, Role, UserStatus } from '@prisma/client';
import { AdminService } from './admin.service';

describe('AdminService', () => {
  const prisma = {
    user: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    room: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    match: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    team: {
      findMany: jest.fn(),
    },
    syncLog: {
      findMany: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
  };
  const scoringService = {
    recalculateMatchScores: jest.fn(),
    recalculateAllScores: jest.fn(),
  };

  let service: AdminService;

  const admin = {
    id: 'admin-1',
    email: 'admin@example.com',
    name: 'Admin',
    role: Role.ADMIN,
    status: UserStatus.ACTIVE,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AdminService(prisma as never, scoringService as never);
  });

  it('does not allow an admin to remove their own admin role', async () => {
    prisma.user.findUnique.mockResolvedValue(admin);

    await expect(
      service.updateUserRole(admin, admin.id, { role: Role.USER }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('updates user role and writes audit log', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      role: Role.USER,
    });
    prisma.user.update.mockResolvedValue({
      id: 'user-1',
      role: Role.ADMIN,
    });
    prisma.auditLog.create.mockResolvedValue({});

    await expect(
      service.updateUserRole(admin, 'user-1', { role: Role.ADMIN }),
    ).resolves.toMatchObject({ role: Role.ADMIN });
    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'UPDATE_USER_ROLE',
          adminId: admin.id,
          entity: 'User',
          entityId: 'user-1',
        }),
      }),
    );
  });

  it('creates manual match only with different existing teams', async () => {
    prisma.team.findMany.mockResolvedValue([{ id: 'team-1' }, { id: 'team-2' }]);
    prisma.match.create.mockResolvedValue({
      id: 'match-1',
      source: MatchSource.MANUAL,
    });
    prisma.auditLog.create.mockResolvedValue({});

    await expect(
      service.createMatch(admin, {
        homeTeamId: 'team-1',
        awayTeamId: 'team-2',
        utcDate: new Date('2026-06-10T20:00:00.000Z'),
      }),
    ).resolves.toMatchObject({ id: 'match-1' });
  });

  it('rejects manual match with same home and away team', async () => {
    await expect(
      service.createMatch(admin, {
        homeTeamId: 'team-1',
        awayTeamId: 'team-1',
        utcDate: new Date('2026-06-10T20:00:00.000Z'),
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.match.create).not.toHaveBeenCalled();
  });

  it('saves manual result, recalculates scores and writes audit log', async () => {
    prisma.match.findUnique.mockResolvedValue({
      id: 'match-1',
      homeTeamId: 'team-1',
      awayTeamId: 'team-2',
    });
    prisma.match.update.mockResolvedValue({
      id: 'match-1',
      status: MatchStatus.FINISHED,
      homeScore: 2,
      awayScore: 1,
      source: MatchSource.MANUAL,
    });
    scoringService.recalculateMatchScores.mockResolvedValue({
      status: 'recalculated',
    });
    prisma.auditLog.create.mockResolvedValue({});

    await expect(
      service.updateMatchResult(admin, 'match-1', {
        homeScore: 2,
        awayScore: 1,
      }),
    ).resolves.toMatchObject({
      match: {
        status: MatchStatus.FINISHED,
        homeScore: 2,
        awayScore: 1,
      },
      recalculation: {
        status: 'recalculated',
      },
    });
    expect(scoringService.recalculateMatchScores).toHaveBeenCalledWith(
      'match-1',
    );
    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'UPDATE_MATCH_RESULT',
        }),
      }),
    );
  });
});
