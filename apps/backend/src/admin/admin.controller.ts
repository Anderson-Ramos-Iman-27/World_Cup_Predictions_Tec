import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { AuthenticatedUser } from '../common/types/authenticated-user.type';
import { UpdateRoomDto } from '../rooms/dto/update-room.dto';
import { AdminService } from './admin.service';
import { CreateAdminMatchDto } from './dto/create-admin-match.dto';
import { CreateAdminTeamDto } from './dto/create-admin-team.dto';
import { UpdateAdminMatchDto } from './dto/update-admin-match.dto';
import { UpdateAdminTeamDto } from './dto/update-admin-team.dto';
import { UpdateMatchResultDto } from './dto/update-match-result.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('users')
  findUsers() {
    return this.adminService.findUsers();
  }

  @Patch('users/:id/role')
  updateUserRole(
    @CurrentUser() admin: AuthenticatedUser,
    @Param('id') userId: string,
    @Body() dto: UpdateUserRoleDto,
  ) {
    return this.adminService.updateUserRole(admin, userId, dto);
  }

  @Patch('users/:id/status')
  updateUserStatus(
    @CurrentUser() admin: AuthenticatedUser,
    @Param('id') userId: string,
    @Body() dto: UpdateUserStatusDto,
  ) {
    return this.adminService.updateUserStatus(admin, userId, dto);
  }

  @Post('users/:id/reset-account')
  resetUserAccount(
    @CurrentUser() admin: AuthenticatedUser,
    @Param('id') userId: string,
  ) {
    return this.adminService.resetUserAccount(admin, userId);
  }

  @Delete('users/:id')
  deleteUser(
    @CurrentUser() admin: AuthenticatedUser,
    @Param('id') userId: string,
  ) {
    return this.adminService.deleteUser(admin, userId);
  }

  @Get('rooms')
  findRooms() {
    return this.adminService.findRooms();
  }

  @Patch('rooms/:id')
  updateRoom(
    @CurrentUser() admin: AuthenticatedUser,
    @Param('id') roomId: string,
    @Body() dto: UpdateRoomDto,
  ) {
    return this.adminService.updateRoom(admin, roomId, dto);
  }

  @Get('matches')
  findMatches() {
    return this.adminService.findMatches();
  }

  @Get('teams')
  findTeams() {
    return this.adminService.findTeams();
  }

  @Post('teams')
  createTeam(
    @CurrentUser() admin: AuthenticatedUser,
    @Body() dto: CreateAdminTeamDto,
  ) {
    return this.adminService.createTeam(admin, dto);
  }

  @Patch('teams/:id')
  updateTeam(
    @CurrentUser() admin: AuthenticatedUser,
    @Param('id') teamId: string,
    @Body() dto: UpdateAdminTeamDto,
  ) {
    return this.adminService.updateTeam(admin, teamId, dto);
  }

  @Delete('teams/:id')
  deleteTeam(
    @CurrentUser() admin: AuthenticatedUser,
    @Param('id') teamId: string,
  ) {
    return this.adminService.deleteTeam(admin, teamId);
  }

  @Post('matches')
  createMatch(
    @CurrentUser() admin: AuthenticatedUser,
    @Body() dto: CreateAdminMatchDto,
  ) {
    return this.adminService.createMatch(admin, dto);
  }

  @Patch('matches/:id')
  updateMatch(
    @CurrentUser() admin: AuthenticatedUser,
    @Param('id') matchId: string,
    @Body() dto: UpdateAdminMatchDto,
  ) {
    return this.adminService.updateMatch(admin, matchId, dto);
  }

  @Delete('matches/:id')
  deleteMatch(
    @CurrentUser() admin: AuthenticatedUser,
    @Param('id') matchId: string,
  ) {
    return this.adminService.deleteMatch(admin, matchId);
  }

  @Post('matches/:id/result')
  updateMatchResult(
    @CurrentUser() admin: AuthenticatedUser,
    @Param('id') matchId: string,
    @Body() dto: UpdateMatchResultDto,
  ) {
    return this.adminService.updateMatchResult(admin, matchId, dto);
  }

  @Post('scoring/recalculate')
  recalculateScoring(@CurrentUser() admin: AuthenticatedUser) {
    return this.adminService.recalculateScoring(admin);
  }

  @Get('sync-logs')
  findSyncLogs() {
    return this.adminService.findSyncLogs();
  }

  @Get('audit-logs')
  findAuditLogs() {
    return this.adminService.findAuditLogs();
  }
}
