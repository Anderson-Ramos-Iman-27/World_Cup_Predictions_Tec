export type UserRole = 'USER' | 'ADMIN';
export type UserStatus = 'PENDING_VERIFICATION' | 'ACTIVE' | 'INACTIVE' | 'BLOCKED';

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  status?: UserStatus;
};

export type AuthResponse = {
  user: AuthUser;
};
