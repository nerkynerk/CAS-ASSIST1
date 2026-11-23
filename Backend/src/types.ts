import type { Request } from 'express';

export type AppRole = 'student' | 'faculty' | 'staff' | 'super_admin';
export type AccountState = 'active' | 'archived_read_only';
export type VerificationStatus = 'pending' | 'verified' | 'rejected';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: AppRole;
  state: AccountState;
  verificationStatus: VerificationStatus;
}

export interface AuthenticatedRequest extends Request {
  authUser: AuthenticatedUser;
}
