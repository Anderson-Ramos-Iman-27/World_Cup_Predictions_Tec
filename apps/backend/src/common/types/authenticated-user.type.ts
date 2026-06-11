import { UserStatus } from '@prisma/client';

export type UserRole = 'USER' | 'ADMIN';

export type AuthenticatedUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  tokenVersion?: number;
};
