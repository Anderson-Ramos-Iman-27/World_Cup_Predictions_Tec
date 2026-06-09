import { ForbiddenException } from '@nestjs/common';
import { Role, UserStatus } from '@prisma/client';
import { RoomsService } from './rooms.service';

describe('RoomsService', () => {
  const prisma = {
    room: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    roomMember: {
      findUnique: jest.fn(),
    },
  };
  const rankingsService = {
    invalidateRoomRankings: jest.fn(),
  };

  let service: RoomsService;

  const owner = {
    id: 'owner-1',
    email: 'owner@example.com',
    name: 'Owner',
    role: Role.USER,
    status: UserStatus.ACTIVE,
  };

  const member = {
    id: 'member-1',
    email: 'member@example.com',
    name: 'Member',
    role: Role.USER,
    status: UserStatus.ACTIVE,
  };

  const admin = {
    id: 'admin-1',
    email: 'admin@example.com',
    name: 'Admin',
    role: Role.ADMIN,
    status: UserStatus.ACTIVE,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new RoomsService(prisma as never, rankingsService as never);
  });

  it('allows room owner to update room', async () => {
    prisma.room.findUnique.mockResolvedValue({
      id: 'room-1',
      ownerId: owner.id,
    });
    prisma.room.update.mockResolvedValue({
      id: 'room-1',
      name: 'Nueva sala',
    });

    await expect(
      service.update('room-1', owner, { name: 'Nueva sala' }),
    ).resolves.toMatchObject({
      id: 'room-1',
      name: 'Nueva sala',
    });
  });

  it('allows admin to update any room', async () => {
    prisma.room.findUnique.mockResolvedValue({
      id: 'room-1',
      ownerId: owner.id,
    });
    prisma.room.update.mockResolvedValue({
      id: 'room-1',
      color: '#00AAFF',
    });

    await expect(
      service.update('room-1', admin, { color: '#00AAFF' }),
    ).resolves.toMatchObject({
      id: 'room-1',
      color: '#00AAFF',
    });
  });

  it('rejects non-owner user when updating room', async () => {
    prisma.room.findUnique.mockResolvedValue({
      id: 'room-1',
      ownerId: owner.id,
    });

    await expect(
      service.update('room-1', member, { name: 'No permitido' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.room.update).not.toHaveBeenCalled();
  });
});
