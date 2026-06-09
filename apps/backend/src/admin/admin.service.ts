import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MatchSource, MatchStatus, Prisma, Role } from '@prisma/client';
import { AuthenticatedUser } from '../common/types/authenticated-user.type';
import { PrismaService } from '../prisma/prisma.service';
import { ScoringService } from '../scoring/scoring.service';
import { UpdateRoomDto } from '../rooms/dto/update-room.dto';
import { CreateAdminMatchDto } from './dto/create-admin-match.dto';
import { CreateAdminTeamDto } from './dto/create-admin-team.dto';
import { UpdateAdminMatchDto } from './dto/update-admin-match.dto';
import { UpdateAdminTeamDto } from './dto/update-admin-team.dto';
import { UpdateMatchResultDto } from './dto/update-match-result.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scoringService: ScoringService,
  ) {}

  async findUsers() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        emailVerifiedAt: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            predictions: true,
            roomMembership: true,
            ownedRooms: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateUserRole(
    admin: AuthenticatedUser,
    userId: string,
    dto: UpdateUserRoleDto,
  ) {
    const current = await this.findUserOrThrow(userId);

    if (current.id === admin.id && dto.role !== Role.ADMIN) {
      throw new BadRequestException('Admin cannot remove their own admin role');
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { role: dto.role },
      select: this.userSelect(),
    });

    await this.createAuditLog(admin.id, 'UPDATE_USER_ROLE', 'User', userId, {
      previousRole: current.role,
      nextRole: dto.role,
    });

    return user;
  }

  async updateUserStatus(
    admin: AuthenticatedUser,
    userId: string,
    dto: UpdateUserStatusDto,
  ) {
    const current = await this.findUserOrThrow(userId);

    if (current.id === admin.id && current.status !== dto.status) {
      throw new BadRequestException('Admin cannot change their own status');
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { status: dto.status },
      select: this.userSelect(),
    });

    await this.createAuditLog(admin.id, 'UPDATE_USER_STATUS', 'User', userId, {
      previousStatus: current.status,
      nextStatus: dto.status,
    });

    return user;
  }

  async findRooms() {
    return this.prisma.room.findMany({
      include: {
        owner: {
          select: this.userSelect(),
        },
        _count: {
          select: {
            members: true,
            predictions: true,
            invitations: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateRoom(
    admin: AuthenticatedUser,
    roomId: string,
    dto: UpdateRoomDto,
  ) {
    await this.findRoomOrThrow(roomId);

    const room = await this.prisma.room.update({
      where: { id: roomId },
      data: dto,
      include: {
        owner: {
          select: this.userSelect(),
        },
      },
    });

    await this.createAuditLog(admin.id, 'UPDATE_ROOM', 'Room', roomId, {
      ...dto,
    });
    return room;
  }

  async findMatches() {
    return this.prisma.match.findMany({
      include: this.matchInclude(),
      orderBy: { utcDate: 'asc' },
    });
  }

  async findTeams() {
    return this.prisma.team.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async createTeam(admin: AuthenticatedUser, dto: CreateAdminTeamDto) {
    const team = await this.prisma.team.create({
      data: {
        name: dto.name.trim(),
        shortName: dto.shortName?.trim() || null,
        crestUrl: dto.crestUrl?.trim() || null,
      },
    });

    await this.createAuditLog(admin.id, 'CREATE_TEAM', 'Team', team.id, {
      name: team.name,
      shortName: team.shortName,
    });

    return team;
  }

  async updateTeam(
    admin: AuthenticatedUser,
    teamId: string,
    dto: UpdateAdminTeamDto,
  ) {
    await this.findTeamOrThrow(teamId);

    const team = await this.prisma.team.update({
      where: { id: teamId },
      data: {
        ...(dto.name ? { name: dto.name.trim() } : {}),
        ...(dto.shortName !== undefined
          ? { shortName: dto.shortName.trim() || null }
          : {}),
        ...(dto.crestUrl !== undefined
          ? { crestUrl: dto.crestUrl.trim() || null }
          : {}),
      },
    });

    await this.createAuditLog(admin.id, 'UPDATE_TEAM', 'Team', teamId, {
      name: team.name,
      shortName: team.shortName,
    });

    return team;
  }

  async deleteTeam(admin: AuthenticatedUser, teamId: string) {
    const team = await this.findTeamOrThrow(teamId);
    const usage = await this.prisma.match.count({
      where: {
        OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }],
      },
    });

    if (usage > 0) {
      throw new BadRequestException(
        'No se puede eliminar un equipo que ya tiene partidos registrados',
      );
    }

    await this.prisma.team.delete({ where: { id: teamId } });
    await this.createAuditLog(admin.id, 'DELETE_TEAM', 'Team', teamId, {
      name: team.name,
      shortName: team.shortName,
    });

    return { message: 'Equipo eliminado correctamente.' };
  }

  async createMatch(admin: AuthenticatedUser, dto: CreateAdminMatchDto) {
    this.ensureDifferentTeams(dto.homeTeamId, dto.awayTeamId);
    await this.ensureTeamsExist(dto.homeTeamId, dto.awayTeamId);

    const match = await this.prisma.match.create({
      data: {
        homeTeamId: dto.homeTeamId,
        awayTeamId: dto.awayTeamId,
        utcDate: dto.utcDate,
        status: dto.status ?? MatchStatus.SCHEDULED,
        source: MatchSource.MANUAL,
      },
      include: this.matchInclude(),
    });

    await this.createAuditLog(admin.id, 'CREATE_MATCH', 'Match', match.id, {
      homeTeamId: dto.homeTeamId,
      awayTeamId: dto.awayTeamId,
      utcDate: dto.utcDate.toISOString(),
      status: dto.status ?? MatchStatus.SCHEDULED,
    });

    return match;
  }

  async updateMatch(
    admin: AuthenticatedUser,
    matchId: string,
    dto: UpdateAdminMatchDto,
  ) {
    const current = await this.findMatchOrThrow(matchId);
    const homeTeamId = dto.homeTeamId ?? current.homeTeamId;
    const awayTeamId = dto.awayTeamId ?? current.awayTeamId;

    this.ensureDifferentTeams(homeTeamId, awayTeamId);
    await this.ensureTeamsExist(homeTeamId, awayTeamId);

    const data: Prisma.MatchUpdateInput = {
      ...(dto.utcDate ? { utcDate: dto.utcDate } : {}),
      ...(dto.status ? { status: dto.status } : {}),
      ...(dto.homeTeamId
        ? { homeTeam: { connect: { id: dto.homeTeamId } } }
        : {}),
      ...(dto.awayTeamId
        ? { awayTeam: { connect: { id: dto.awayTeamId } } }
        : {}),
      source: MatchSource.MANUAL,
    };

    const match = await this.prisma.match.update({
      where: { id: matchId },
      data,
      include: this.matchInclude(),
    });

    await this.createAuditLog(admin.id, 'UPDATE_MATCH', 'Match', matchId, {
      ...dto,
      ...(dto.utcDate ? { utcDate: dto.utcDate.toISOString() } : {}),
    });
    return match;
  }

  async deleteMatch(admin: AuthenticatedUser, matchId: string) {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      include: this.matchInclude(),
    });

    if (!match) {
      throw new NotFoundException('Match not found');
    }

    await this.prisma.match.delete({ where: { id: matchId } });
    await this.createAuditLog(admin.id, 'DELETE_MATCH', 'Match', matchId, {
      homeTeam: match.homeTeam.name,
      awayTeam: match.awayTeam.name,
      utcDate: match.utcDate.toISOString(),
    });

    return { message: 'Partido eliminado correctamente.' };
  }

  async updateMatchResult(
    admin: AuthenticatedUser,
    matchId: string,
    dto: UpdateMatchResultDto,
  ) {
    await this.findMatchOrThrow(matchId);

    const match = await this.prisma.match.update({
      where: { id: matchId },
      data: {
        status: MatchStatus.FINISHED,
        homeScore: dto.homeScore,
        awayScore: dto.awayScore,
        source: MatchSource.MANUAL,
      },
      include: this.matchInclude(),
    });

    const recalculation = await this.scoringService.recalculateMatchScores(matchId);

    await this.createAuditLog(admin.id, 'UPDATE_MATCH_RESULT', 'Match', matchId, {
      homeScore: dto.homeScore,
      awayScore: dto.awayScore,
      recalculation,
    });

    return {
      match,
      recalculation,
    };
  }

  async recalculateScoring(admin: AuthenticatedUser) {
    const result = await this.scoringService.recalculateAllScores();

    await this.createAuditLog(admin.id, 'RECALCULATE_SCORING', 'Score', null, {
      result,
    });

    return result;
  }

  async findSyncLogs() {
    return this.prisma.syncLog.findMany({
      orderBy: { startedAt: 'desc' },
      take: 100,
    });
  }

  async findAuditLogs() {
    return this.prisma.auditLog.findMany({
      include: {
        admin: {
          select: this.userSelect(),
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  private async findUserOrThrow(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  private async findRoomOrThrow(roomId: string) {
    const room = await this.prisma.room.findUnique({
      where: { id: roomId },
    });

    if (!room) {
      throw new NotFoundException('Room not found');
    }

    return room;
  }

  private async findMatchOrThrow(matchId: string) {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
    });

    if (!match) {
      throw new NotFoundException('Match not found');
    }

    return match;
  }

  private async findTeamOrThrow(teamId: string) {
    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
    });

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    return team;
  }

  private async ensureTeamsExist(homeTeamId: string, awayTeamId: string) {
    const teams = await this.prisma.team.findMany({
      where: {
        id: { in: [homeTeamId, awayTeamId] },
      },
      select: { id: true },
    });

    if (teams.length !== 2) {
      throw new NotFoundException('One or more teams were not found');
    }
  }

  private ensureDifferentTeams(homeTeamId: string, awayTeamId: string) {
    if (homeTeamId === awayTeamId) {
      throw new BadRequestException('Home and away teams must be different');
    }
  }

  private async createAuditLog(
    adminId: string,
    action: string,
    entity: string,
    entityId: string | null,
    metadata?: Prisma.InputJsonValue,
  ) {
    return this.prisma.auditLog.create({
      data: {
        adminId,
        action,
        entity,
        entityId,
        metadata,
      },
    });
  }

  private userSelect() {
    return {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
    };
  }

  private matchInclude() {
    return {
      homeTeam: true,
      awayTeam: true,
    };
  }
}
