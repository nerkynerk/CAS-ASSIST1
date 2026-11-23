import type { NextFunction, Request, Response } from 'express';

import { adminSupabase } from '../supabase.js';
import type { AccountState, AppRole, AuthenticatedRequest, VerificationStatus } from '../types.js';

const roles = new Set<AppRole>(['student', 'faculty', 'staff', 'super_admin']);
const states = new Set<AccountState>(['active', 'archived_read_only']);
const verificationStatuses = new Set<VerificationStatus>(['pending', 'verified', 'rejected']);
const institutionalEmail = /^[^@\s]+@neu\.edu\.ph$/i;

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.header('authorization');
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    res.status(401).json({ error: 'Authentication is required.' });
    return;
  }

  const { data: authData, error: authError } = await adminSupabase.auth.getUser(token);
  if (authError || !authData.user?.email || !institutionalEmail.test(authData.user.email)) {
    res.status(401).json({ error: 'The session is invalid or expired.' });
    return;
  }

  const { data: profile, error: profileError } = await adminSupabase
    .from('users_account_registry')
    .select('id, email, role, state, verification_status')
    .eq('id', authData.user.id)
    .maybeSingle();

  if (profileError || !profile || profile.id !== authData.user.id
    || typeof profile.email !== 'string' || profile.email.toLowerCase() !== authData.user.email.toLowerCase()
    || !roles.has(profile.role) || !states.has(profile.state)
    || !verificationStatuses.has(profile.verification_status)) {
    res.status(403).json({ error: 'A valid CAS Assist profile is required.' });
    return;
  }

  (req as AuthenticatedRequest).authUser = {
    id: profile.id,
    email: profile.email,
    role: profile.role,
    state: profile.state,
    verificationStatus: profile.verification_status,
  };
  next();
}

export function allowRoles(...allowed: AppRole[]) {
  const allowedSet = new Set(allowed);
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as AuthenticatedRequest).authUser;
    if (!user || !allowedSet.has(user.role)) {
      res.status(403).json({ error: 'Your role cannot perform this action.' });
      return;
    }
    next();
  };
}

export async function requireVerifiedCas(req: Request, res: Response, next: NextFunction) {
  const user = (req as AuthenticatedRequest).authUser;
  if (!user || user.state !== 'active' || user.verificationStatus !== 'verified') {
    res.status(403).json({ error: 'An active, verified CAS account is required.' });
    return;
  }

  // Non-student roles and verification are assigned through trusted account governance.
  // Student affiliation comes from managed memberships, never the editable profile program.
  if (user.role === 'student') {
    const today = new Date().toISOString().slice(0, 10);
    const { data: membership, error } = await adminSupabase
      .from('student_program_memberships')
      .select('id, cas_programs!inner(code)')
      .eq('student_id', user.id)
      .eq('is_current', true)
      .eq('cas_programs.is_active', true)
      .lte('started_at', today)
      .or(`ended_at.is.null,ended_at.gte.${today}`)
      .limit(1)
      .maybeSingle();

    if (error || !membership) {
      res.status(403).json({ error: 'A verified, current CAS program membership is required.' });
      return;
    }
  }
  next();
}
