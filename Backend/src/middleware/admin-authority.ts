import type { Request, RequestHandler } from 'express';
import { z } from 'zod';

import { adminSupabase } from '../supabase.js';

const authorityLevel = z.enum(['primary', 'delegated']);
const uuid = z.uuid();
const institutionalEmail = /^[^@\s]+@neu\.edu\.ph$/i;
const actions = z.enum([
  'ordinary_admin', 'create_account', 'invite_account', 'approve_cas_access',
  'change_role', 'change_identity', 'recover_account', 'archive_account',
  'delete_account', 'reactivate_account',
]);

const contextSchema = z.object({
  actor_id: uuid,
  actor_level: authorityLevel,
  primary_id: uuid,
  target_id: uuid.nullable(),
  target_role: z.enum(['student', 'faculty', 'staff', 'super_admin']).nullable(),
  target_level: authorityLevel.nullable(),
}).strict();

export type AdminAction = z.infer<typeof actions>;
export type AdminAuthorityContext = z.infer<typeof contextSchema>;
export type AdminAuthorityLevel = z.infer<typeof authorityLevel>;

export class AdminAuthorizationError extends Error {
  constructor(public readonly status: 400 | 401 | 403 | 503, message: string) {
    super(message);
    this.name = 'AdminAuthorizationError';
  }
}

function deny(): never {
  throw new AdminAuthorizationError(403, 'This administrative action is not permitted.');
}

function unavailable(): never {
  throw new AdminAuthorizationError(503, 'Administrative authorization is unavailable.');
}

/**
 * Revalidate immediately before a future privileged operation, with its actual
 * single target. This read-only decision is not a transaction or a reusable grant.
 * Authority writes, arbitrary patches, alternate recovery addresses and bulk
 * actions are intentionally outside this contract.
 */
export async function authorizeAdminAction(
  req: Request,
  action: AdminAction,
  targetId?: string,
): Promise<AdminAuthorityContext> {
  if (!actions.safeParse(action).success) deny();

  const requiresTarget = action !== 'ordinary_admin' && action !== 'create_account' && action !== 'invite_account';
  if ((requiresTarget && !uuid.safeParse(targetId).success) || (!requiresTarget && targetId !== undefined)) {
    throw new AdminAuthorizationError(400, 'This administrative action requires the correct single target.');
  }
  const target = targetId?.toLowerCase() ?? null;

  // Do not reuse a cached request/profile grant or accept an actor from the body.
  const token = /^Bearer ([^\s]+)$/.exec(req.header('authorization') ?? '')?.[1];
  if (!token) throw new AdminAuthorizationError(401, 'Authentication is required.');

  let actorId: string;
  try {
    const { data, error } = await adminSupabase.auth.getUser(token);
    if (error || !data.user || !uuid.safeParse(data.user.id).success
      || !data.user.email || !institutionalEmail.test(data.user.email)) {
      throw new AdminAuthorizationError(401, 'The session is invalid or expired.');
    }
    actorId = data.user.id.toLowerCase();
  } catch (error) {
    if (error instanceof AdminAuthorizationError) throw error;
    unavailable();
  }

  let context: AdminAuthorityContext;
  try {
    // The service-only RPC checks current registry, Auth identity and protected
    // authority for BOTH the actor and designated primary in one DB snapshot.
    const { data, error } = await adminSupabase.rpc('get_admin_authority_context', {
      p_actor_id: actorId,
      p_target_id: target,
    });
    if (error) unavailable();
    if (data === null) deny();
    const parsed = contextSchema.safeParse(data);
    if (!parsed.success) unavailable();
    context = parsed.data;
  } catch (error) {
    if (error instanceof AdminAuthorizationError) throw error;
    unavailable();
  }

  if (context.actor_id !== actorId || context.target_id !== target
    || (context.actor_level === 'primary') !== (context.actor_id === context.primary_id)) unavailable();

  if (target === null) {
    if (context.target_role !== null || context.target_level !== null) unavailable();
  } else {
    if (context.target_role === null
      || (context.target_level !== null && context.target_role !== 'super_admin')
      || (target === context.primary_id) !== (context.target_level === 'primary')
      || (target === actorId && (context.target_role !== 'super_admin' || context.target_level !== context.actor_level))) {
      unavailable();
    }
  }

  switch (action) {
    case 'ordinary_admin':
      return context;
    // These can grant CAS access indirectly, as well as by explicit approval.
    case 'create_account':
    case 'invite_account':
    case 'approve_cas_access':
    case 'change_role':
    case 'change_identity':
    case 'reactivate_account':
      if (context.actor_level !== 'primary') deny();
      break;
    case 'recover_account':
    case 'archive_account':
    case 'delete_account':
      break;
    default:
      deny();
  }

  // Primary succession/self-governance belongs to a separately controlled process.
  if (target !== null && (target === context.primary_id || target === actorId)) deny();

  // Authority holders need controlled deprovisioning, including FK-safe removal.
  if (context.target_level !== null && (action === 'delete_account' || action === 'change_role')) deny();

  if (context.actor_level === 'delegated'
    && (context.target_role === 'super_admin' || context.target_level !== null)) deny();

  return context;
}

/** Entry guard only; a future handler must also check its specific action/target. */
export function requireAdminAuthority(level: AdminAuthorityLevel | 'any' = 'any'): RequestHandler {
  return async (req, res, next) => {
    try {
      if (level !== 'any' && level !== 'primary' && level !== 'delegated') deny();
      const context = await authorizeAdminAction(req, 'ordinary_admin');
      if (level !== 'any' && context.actor_level !== level) deny();
      next();
    } catch (error) {
      const failure = error instanceof AdminAuthorizationError
        ? error
        : new AdminAuthorizationError(503, 'Administrative authorization is unavailable.');
      res.status(failure.status).json({ error: failure.message });
    }
  };
}
