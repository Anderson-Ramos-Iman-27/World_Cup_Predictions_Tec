import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InvitationStatus, Prisma, Role, RoomMemberRole } from '@prisma/client';
import { randomBytes } from 'crypto';
import { AuthenticatedUser } from '../common/types/authenticated-user.type';
import { PrismaService } from '../prisma/prisma.service';
import { RankingsService } from '../rankings/rankings.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { JoinRoomDto } from './dto/join-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';

@Injectable()
export class RoomsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rankingsService: RankingsService,
  ) {}

  async create(ownerId: string, createRoomDto: CreateRoomDto) {
    const code = await this.generateUniqueCode('room');

    const room = await this.prisma.room.create({
      data: {
        name: createRoomDto.name,
        description: createRoomDto.description,
        color: createRoomDto.color ?? '#1457d9',
        code,
        ownerId,
        members: {
          create: {
            userId: ownerId,
            role: RoomMemberRole.OWNER,
          },
        },
      },
      include: this.roomInclude(),
    });

    await this.rankingsService.invalidateRoomRankings([room.id]);
    return room;
  }

  async findMyRooms(userId: string) {
    return this.prisma.room.findMany({
      where: {
        members: {
          some: { userId },
        },
      },
      include: this.roomInclude(),
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOneForUser(roomId: string, user: AuthenticatedUser) {
    const room = await this.findRoomOrThrow(roomId);
    await this.ensureCanView(roomId, user);
    return room;
  }

  async update(
    roomId: string,
    user: AuthenticatedUser,
    updateRoomDto: UpdateRoomDto,
  ) {
    await this.ensureCanManage(roomId, user);

    const room = await this.prisma.room.update({
      where: { id: roomId },
      data: updateRoomDto,
      include: this.roomInclude(),
    });

    await this.rankingsService.invalidateRoomRankings([roomId]);
    return room;
  }

  async createInvitation(roomId: string, user: AuthenticatedUser) {
    await this.ensureCanManage(roomId, user);

    const code = await this.generateUniqueCode('invitation');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    return this.prisma.invitation.create({
      data: {
        roomId,
        code,
        expiresAt,
        createdById: user.id,
      },
    });
  }

  async join(userId: string, joinRoomDto: JoinRoomDto) {
    const normalizedCode = joinRoomDto.code.trim().toUpperCase();
    const room = await this.prisma.room.findFirst({
      where: {
        OR: [
          { code: normalizedCode },
          {
            invitations: {
              some: {
                code: normalizedCode,
                status: InvitationStatus.PENDING,
                expiresAt: { gt: new Date() },
              },
            },
          },
        ],
        isActive: true,
      },
      include: {
        invitations: {
          where: { code: normalizedCode },
          take: 1,
        },
      },
    });

    if (!room) {
      throw new NotFoundException('Room or invitation not found');
    }

    try {
      await this.prisma.roomMember.create({
        data: {
          roomId: room.id,
          userId,
          role: RoomMemberRole.MEMBER,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('User is already a member of this room');
      }

      throw error;
    }

    const invitation = room.invitations[0];
    if (invitation?.status === InvitationStatus.PENDING) {
      await this.prisma.invitation.update({
        where: { id: invitation.id },
        data: {
          status: InvitationStatus.USED,
          usedAt: new Date(),
        },
      });
    }

    await this.rankingsService.invalidateRoomRankings([room.id]);
    return this.findRoomOrThrow(room.id);
  }

  async findMembers(roomId: string, user: AuthenticatedUser) {
    await this.ensureCanView(roomId, user);

    return this.prisma.roomMember.findMany({
      where: { roomId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            status: true,
          },
        },
      },
      orderBy: { joinedAt: 'asc' },
    });
  }

  async removeMember(
    roomId: string,
    userIdToRemove: string,
    user: AuthenticatedUser,
  ) {
    await this.ensureCanManage(roomId, user);

    const member = await this.prisma.roomMember.findUnique({
      where: {
        roomId_userId: {
          roomId,
          userId: userIdToRemove,
        },
      },
    });

    if (!member) {
      throw new NotFoundException('Room member not found');
    }

    if (member.role === RoomMemberRole.OWNER) {
      throw new ForbiddenException('Room owner cannot be removed');
    }

    await this.prisma.roomMember.delete({
      where: {
        roomId_userId: {
          roomId,
          userId: userIdToRemove,
        },
      },
    });

    await this.rankingsService.invalidateRoomRankings([roomId]);
    return { message: 'Member removed successfully' };
  }

  private async ensureCanView(roomId: string, user: AuthenticatedUser) {
    if (user.role === Role.ADMIN) {
      await this.findRoomOrThrow(roomId);
      return;
    }

    const member = await this.prisma.roomMember.findUnique({
      where: {
        roomId_userId: {
          roomId,
          userId: user.id,
        },
      },
    });

    if (!member) {
      throw new ForbiddenException('You are not a member of this room');
    }
  }

  private async ensureCanManage(roomId: string, user: AuthenticatedUser) {
    const room = await this.findRoomOrThrow(roomId);

    if (user.role === Role.ADMIN || room.ownerId === user.id) {
      return;
    }

    throw new ForbiddenException('Only room owner or admin can manage this room');
  }

  private async findRoomOrThrow(roomId: string) {
    const room = await this.prisma.room.findUnique({
      where: { id: roomId },
      include: this.roomInclude(),
    });

    if (!room) {
      throw new NotFoundException('Room not found');
    }

    return room;
  }

  private async generateUniqueCode(type: 'room' | 'invitation') {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const code = randomBytes(4).toString('hex').toUpperCase();
      const exists =
        type === 'room'
          ? await this.prisma.room.findUnique({ where: { code } })
          : await this.prisma.invitation.findUnique({ where: { code } });

      if (!exists) {
        return code;
      }
    }

    throw new ConflictException('Could not generate a unique code');
  }

  private roomInclude() {
    return {
      owner: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      _count: {
        select: {
          members: true,
        },
      },
    };
  }
}
