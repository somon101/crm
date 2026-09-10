import { Role } from '@prisma/client';

export interface JwtPayload {
  sub: string;
  role: Role;
  email: string;
}

/** Shape attached to `request.user` by JwtAuthGuard after the per-request isActive check. */
export interface AuthenticatedUser {
  id: string;
  role: Role;
  email: string;
  firstName: string;
  lastName: string;
}
