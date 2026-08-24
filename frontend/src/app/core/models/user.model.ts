export enum UserRole {
  STUDENT = 'STUDENT',
  ADMIN = 'ADMIN',
  SYSADMIN = 'SYSADMIN',
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  deletedAt?: Date;
}

export interface AuthResponse {
  user: User;
  token: string;
}
