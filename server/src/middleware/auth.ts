import type { NextFunction, Request, Response } from 'express';

import { adminSupabase } from '../supabase.js';
import type { AccountState, AppRole, AuthenticatedRequest } from '../types.js';

const roles = new Set<AppRole>(['student', 'faculty', 'staff', 'super_admin']);
const states = new Set<AccountState>(['active', 'archived_read_only']);

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.header('authorization');
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    res.status(401).json({ error: 'Authentication is required.' });
    return;
  }

  const { data: authData, error: authError } = await adminSupabase.auth.getUser(token);
  if (authError || !authData.user?.email) {
    res.status(401).json({ error: 'The session is invalid or expired.' });
    return;
  }

  const { data: profile, error: profileError } = await adminSupabase
    .from('users_account_registry')
    .select('id, email, role, state')
    .eq('id', authData.user.id)
    .maybeSingle();

  if (profileError || !profile || !roles.has(profile.role) || !states.has(profile.state)) {
    res.status(403).json({ error: 'A valid CAS Assist profile is required.' });
    return;
  }

  (req as AuthenticatedRequest).authUser = {
    id: profile.id,
    email: profile.email,
    role: profile.role,
    state: profile.state,
  };
  next();
}

export function allowRoles(...allowed: AppRole[]) {
  const allowedSet = new Set(allowed);
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as AuthenticatedRequest).authUser;
    if (!allowedSet.has(user.role)) {
      res.status(403).json({ error: 'Your role cannot perform this action.' });
      return;
    }
    next();
  };
}

export function requireActive(req: Request, res: Response, next: NextFunction) {
  const user = (req as AuthenticatedRequest).authUser;
  if (user.state !== 'active') {
    res.status(403).json({ error: 'This account is read-only.' });
    return;
  }
  next();
}
