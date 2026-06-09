import { Role, UserStatus } from '@prisma/client';

export type AuthenticatedUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
  status: UserStatus;
  tokenVersion?: number;
};
