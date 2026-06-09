import { Reflector } from '@nestjs/core';
import { Role, UserStatus } from '@prisma/client';
import { ROLES_KEY } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { AdminController } from './admin.controller';

describe('AdminController authorization', () => {
  it('requires ADMIN role metadata for all admin routes', () => {
    const reflector = new Reflector();

    expect(reflector.get<Role[]>(ROLES_KEY, AdminController)).toEqual([
      Role.ADMIN,
    ]);
  });

  it('rejects non-admin users through RolesGuard', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue([Role.ADMIN]),
    };
    const guard = new RolesGuard(reflector as never);
    const context = executionContext({
      id: 'user-1',
      email: 'user@example.com',
      name: 'User',
      role: Role.USER,
      status: UserStatus.ACTIVE,
    });

    expect(() => guard.canActivate(context as never)).toThrow(
      'Insufficient permissions',
    );
  });

  it('allows admin users through RolesGuard', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue([Role.ADMIN]),
    };
    const guard = new RolesGuard(reflector as never);
    const context = executionContext({
      id: 'admin-1',
      email: 'admin@example.com',
      name: 'Admin',
      role: Role.ADMIN,
      status: UserStatus.ACTIVE,
    });

    expect(guard.canActivate(context as never)).toBe(true);
  });

  function executionContext(user: unknown) {
    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    };
  }
});
