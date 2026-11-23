import type { Server } from 'node:http';

import express from 'express';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const database = vi.hoisted(() => ({ getUser: vi.fn(), rpc: vi.fn() }));

vi.mock('../src/supabase.js', () => ({
  adminSupabase: { auth: { getUser: database.getUser }, rpc: database.rpc },
}));

import {
  AdminAuthorizationError,
  authorizeAdminAction,
  requireAdminAuthority,
  type AdminAction,
} from '../src/middleware/admin-authority.js';

const primaryId = 'e1000000-0000-4000-8000-000000000001';
const delegatedId = 'e1000000-0000-4000-8000-000000000002';
const studentId = 'e1000000-0000-4000-8000-000000000003';
const otherAdministratorId = 'e1000000-0000-4000-8000-000000000004';
const token = 'synthetic-admin-authority-token';
type Level = 'primary' | 'delegated';
type Role = 'student' | 'faculty' | 'staff' | 'super_admin';

interface AuthorityContext {
  actor_id: string;
  actor_level: Level;
  primary_id: string;
  target_id: string | null;
  target_role: Role | null;
  target_level: Level | null;
}

function authorityContext(
  level: Level = 'primary',
  targetId: string | null = null,
  targetRole: Role | null = targetId ? 'student' : null,
  targetLevel: Level | null = null,
): AuthorityContext {
  return {
    actor_id: level === 'primary' ? primaryId : delegatedId,
    actor_level: level,
    primary_id: primaryId,
    target_id: targetId,
    target_role: targetRole,
    target_level: targetLevel,
  };
}

describe('administrator authority foundation (mocked Supabase, local HTTP only)', () => {
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    const app = express();
    app.use(express.json());
    // These endpoints exist only inside this test process; no account mutation is implemented.
    app.post('/primary', requireAdminAuthority('primary'), (_req, res) => res.json({ allowed: true }));
    app.post('/delegated', requireAdminAuthority('delegated'), (_req, res) => res.json({ allowed: true }));
    app.post('/administrative', requireAdminAuthority(), (_req, res) => res.json({ allowed: true }));

    const authorize: express.RequestHandler = async (req, res) => {
      try {
        const action = typeof req.params.action === 'string' ? req.params.action : '';
        const targetId = typeof req.params.targetId === 'string' ? req.params.targetId : undefined;
        const context = await authorizeAdminAction(req, action as AdminAction, targetId);
        res.json(context);
      } catch (error) {
        if (error instanceof AdminAuthorizationError) {
          res.status(error.status).json({ error: error.message });
          return;
        }
        res.status(500).json({ error: 'Unexpected test failure.' });
      }
    };
    app.post('/authorize/:action', authorize);
    app.post('/authorize/:action/:targetId', authorize);

    server = app.listen(0, '127.0.0.1');
    await new Promise<void>((resolve, reject) => {
      server.once('listening', resolve);
      server.once('error', reject);
    });
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Test HTTP listener unavailable.');
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    if (server) await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  });

  function useContext(context: AuthorityContext) {
    database.getUser.mockResolvedValue({
      data: { user: { id: context.actor_id, email: `${context.actor_level}@neu.edu.ph` } },
      error: null,
    });
    database.rpc.mockResolvedValue({ data: context, error: null });
  }

  beforeEach(() => {
    vi.resetAllMocks();
    useContext(authorityContext());
  });

  function request(path: string, body: unknown = {}, authorization: string | null = `Bearer ${token}`) {
    return fetch(`${baseUrl}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(authorization ? { authorization } : {}) },
      body: JSON.stringify(body),
    });
  }

  async function expectDenied(response: Response, allowedStatuses = [403]) {
    expect(allowedStatuses).toContain(response.status);
    expect(await response.text()).not.toContain('sensitive-provider-detail');
  }

  it('permits the validated primary administrator', async () => {
    const response = await request('/primary');
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ allowed: true });
    expect(database.getUser).toHaveBeenCalledExactlyOnceWith(token);
    expect(database.rpc).toHaveBeenCalledExactlyOnceWith('get_admin_authority_context', {
      p_actor_id: primaryId, p_target_id: null,
    });
  });

  it('permits the validated delegated administrator through the delegated check', async () => {
    useContext(authorityContext('delegated'));
    expect((await request('/delegated')).status).toBe(200);
  });

  it.each<Level>(['primary', 'delegated'])('permits %s ordinary administrative authority', async level => {
    useContext(authorityContext(level));
    expect((await request('/administrative')).status).toBe(200);
    expect((await request('/authorize/ordinary_admin')).status).toBe(200);
  });

  it('does not treat primary authority as the exact delegated level', async () => {
    await expectDenied(await request('/delegated'));
  });

  it('does not treat delegated authority as primary', async () => {
    useContext(authorityContext('delegated'));
    await expectDenied(await request('/primary'));
  });

  it.each([null, 'Basic bogus', 'Bearer ', 'Bearer'])('denies malformed or missing bearer credentials: %s', async authorization => {
    await expectDenied(await request('/administrative', {}, authorization), [401]);
    expect(database.getUser).not.toHaveBeenCalled();
    expect(database.rpc).not.toHaveBeenCalled();
  });

  it('denies an expired or invalid Auth identity before reading authority', async () => {
    database.getUser.mockResolvedValue({ data: { user: null }, error: new Error('sensitive-provider-detail') });
    await expectDenied(await request('/administrative'), [401]);
    expect(database.rpc).not.toHaveBeenCalled();
  });

  it('fails closed if Auth lookup throws', async () => {
    database.getUser.mockRejectedValue(new Error('sensitive-provider-detail'));
    await expectDenied(await request('/administrative'), [401, 503]);
    expect(database.rpc).not.toHaveBeenCalled();
  });

  it('denies an invalid Auth UUID instead of forwarding a client actor', async () => {
    database.getUser.mockResolvedValue({ data: { user: { id: 'not-a-uuid', email: 'primary@neu.edu.ph' } }, error: null });
    await expectDenied(await request('/administrative', { actor_id: primaryId }), [401, 403, 503]);
    expect(database.rpc).not.toHaveBeenCalled();
  });

  it('ignores body and query claims about the actor, role, primary level, or target', async () => {
    useContext(authorityContext('delegated'));
    await expectDenied(await request('/authorize/create_account?actor_id=' + primaryId + '&role=super_admin&level=primary', {
      actor_id: primaryId, role: 'super_admin', authority_level: 'primary', target_id: primaryId,
      user_metadata: { authority: 'primary' }, system_settings: { primary_id: delegatedId },
    }));
    expect(database.rpc).toHaveBeenCalledExactlyOnceWith('get_admin_authority_context', {
      p_actor_id: delegatedId, p_target_id: null,
    });
  });

  it.each(['student', 'faculty', 'staff', 'pending administrator', 'rejected administrator', 'archived administrator',
    'unassigned super_admin', 'missing primary', 'inactive primary', 'unverified primary'])('denies the database eligibility rejection for %s', async _condition => {
    // SQL integration tests enforce these actual registry conditions; here the RPC denial is simulated.
    database.rpc.mockResolvedValue({ data: null, error: null });
    await expectDenied(await request('/administrative'));
  });

  it('fails closed when the authority RPC returns an error', async () => {
    database.rpc.mockResolvedValue({ data: null, error: new Error('sensitive-provider-detail') });
    await expectDenied(await request('/administrative'), [403, 503]);
  });

  it('fails closed when the authority RPC throws', async () => {
    database.rpc.mockRejectedValue(new Error('sensitive-provider-detail'));
    await expectDenied(await request('/administrative'), [403, 503]);
  });

  it.each([
    {}, [], false, 'primary',
    { ...authorityContext(), actor_level: 'owner' },
    { ...authorityContext(), actor_id: delegatedId },
    { ...authorityContext(), primary_id: null },
    { ...authorityContext(), primary_id: 'not-a-uuid' },
    { ...authorityContext(), primary_id: delegatedId },
    { ...authorityContext(), target_id: studentId },
    { ...authorityContext(), target_role: 'student' },
    { ...authorityContext(), target_level: 'delegated' },
    { ...authorityContext(), is_primary: true },
  ])('fails closed on an invalid or inconsistent authority snapshot: %j', async data => {
    database.rpc.mockResolvedValue({ data, error: null });
    await expectDenied(await request('/administrative'), [403, 503]);
  });

  it('denies a delegated snapshot that identifies the same actor as primary', async () => {
    const context = authorityContext('delegated');
    context.primary_id = delegatedId;
    useContext(context);
    await expectDenied(await request('/administrative'), [403, 503]);
  });

  it.each<AdminAction>(['create_account', 'invite_account'])('permits primary-only %s checks without creating an account', async action => {
    expect((await request(`/authorize/${action}`)).status).toBe(200);
  });

  it.each<AdminAction>(['create_account', 'invite_account'])('denies delegated %s even with forged primary metadata', async action => {
    useContext(authorityContext('delegated'));
    await expectDenied(await request(`/authorize/${action}`, { authority: 'primary', actor_id: primaryId }));
  });

  const primaryTargetActions: AdminAction[] = ['approve_cas_access', 'change_role', 'change_identity', 'reactivate_account'];
  it.each(primaryTargetActions)('permits primary %s for an ordinary target', async action => {
    useContext(authorityContext('primary', studentId));
    expect((await request(`/authorize/${action}/${studentId}`)).status).toBe(200);
  });

  it.each(primaryTargetActions)('denies delegated %s for an ordinary target', async action => {
    useContext(authorityContext('delegated', studentId));
    await expectDenied(await request(`/authorize/${action}/${studentId}`, {
      role: 'super_admin', verification_status: 'verified', authority: 'primary',
    }));
  });

  const ordinaryTargetActions: AdminAction[] = ['recover_account', 'archive_account', 'delete_account'];
  it.each(ordinaryTargetActions)('permits delegated %s for an ordinary account', async action => {
    useContext(authorityContext('delegated', studentId));
    expect((await request(`/authorize/${action}/${studentId}`)).status).toBe(200);
  });

  it.each<AdminAction>(['recover_account', 'archive_account'])('permits primary %s for a delegated administrator', async action => {
    useContext(authorityContext('primary', delegatedId, 'super_admin', 'delegated'));
    expect((await request(`/authorize/${action}/${delegatedId}`)).status).toBe(200);
  });

  it.each<AdminAction>(['delete_account', 'change_role'])('denies primary %s for an authority holder outside controlled deprovisioning', async action => {
    useContext(authorityContext('primary', delegatedId, 'super_admin', 'delegated'));
    await expectDenied(await request(`/authorize/${action}/${delegatedId}`));
  });

  it.each(ordinaryTargetActions)('denies delegated %s against any administrator, including one without an authority record', async action => {
    useContext(authorityContext('delegated', otherAdministratorId, 'super_admin'));
    await expectDenied(await request(`/authorize/${action}/${otherAdministratorId}`));
  });

  it.each([...primaryTargetActions, ...ordinaryTargetActions])('denies delegated %s targeting Admin1', async action => {
    useContext(authorityContext('delegated', primaryId, 'super_admin', 'primary'));
    await expectDenied(await request(`/authorize/${action}/${primaryId}`, {
      email: 'alternate@neu.edu.ph', password: 'attacker-value', recovery_email: 'alternate@neu.edu.ph',
      role: 'student', verification_status: 'rejected', state: 'archived_read_only',
    }));
  });

  it.each([...primaryTargetActions, ...ordinaryTargetActions])('denies an ordinary admin %s action targeting its own primary identity', async action => {
    useContext(authorityContext('primary', primaryId, 'super_admin', 'primary'));
    await expectDenied(await request(`/authorize/${action}/${primaryId}`));
  });

  it.each(ordinaryTargetActions)('denies delegated self-targeted %s', async action => {
    useContext(authorityContext('delegated', delegatedId, 'super_admin', 'delegated'));
    await expectDenied(await request(`/authorize/${action}/${delegatedId}`));
  });

  it.each([...primaryTargetActions, ...ordinaryTargetActions])('requires a target for %s', async action => {
    await expectDenied(await request(`/authorize/${action}`), [400, 403]);
  });

  it.each<AdminAction>(['ordinary_admin', 'create_account', 'invite_account'])('rejects an unexpected target for %s', async action => {
    useContext(authorityContext('primary', studentId));
    await expectDenied(await request(`/authorize/${action}/${studentId}`), [400, 403]);
  });

  it.each(['bad-uuid', `${studentId},${delegatedId}`])('rejects a malformed or bulk target: %s', async target => {
    await expectDenied(await request(`/authorize/archive_account/${encodeURIComponent(target)}`), [400]);
    expect(database.rpc).not.toHaveBeenCalled();
  });

  it.each(['change_authority', 'bulk_update', 'update_account', 'set_metadata', 'set_system_settings', 'create_administrator'])('denies unsupported generic or indirect action %s', async action => {
    await expectDenied(await request(`/authorize/${action}/${studentId}`), [400, 403]);
  });

  it('binds target lookup to the validated target UUID rather than a body field', async () => {
    useContext(authorityContext('delegated', studentId));
    expect((await request(`/authorize/archive_account/${studentId}`, { target_id: primaryId })).status).toBe(200);
    expect(database.rpc).toHaveBeenCalledExactlyOnceWith('get_admin_authority_context', {
      p_actor_id: delegatedId, p_target_id: studentId,
    });
  });

  it.each([
    { target_id: delegatedId, target_role: 'student', target_level: null },
    { target_id: studentId, target_role: null, target_level: null },
    { target_id: studentId, target_role: 'owner', target_level: null },
    { target_id: studentId, target_role: 'student', target_level: 'primary' },
    { target_id: studentId, target_role: 'student', target_level: 'delegated' },
    { target_id: studentId, target_role: 'super_admin', target_level: 'primary' },
    { target_id: studentId, target_role: 'super_admin', target_level: 'owner' },
  ])('denies malformed or inconsistent target state: %j', async target => {
    useContext(authorityContext('delegated', studentId));
    database.rpc.mockResolvedValue({ data: { ...authorityContext('delegated', studentId), ...target }, error: null });
    await expectDenied(await request(`/authorize/archive_account/${studentId}`), [403, 503]);
  });

  it('does not cache primary authorization across a later revocation', async () => {
    expect((await request('/authorize/create_account')).status).toBe(200);
    database.rpc.mockResolvedValue({ data: null, error: null });
    await expectDenied(await request('/authorize/create_account'));
    expect(database.getUser).toHaveBeenCalledTimes(2);
    expect(database.rpc).toHaveBeenCalledTimes(2);
  });

  it('rechecks the target after a prior ordinary-access decision', async () => {
    useContext(authorityContext('delegated'));
    expect((await request('/administrative')).status).toBe(200);
    useContext(authorityContext('delegated', studentId, 'super_admin'));
    await expectDenied(await request(`/authorize/archive_account/${studentId}`));
    expect(database.getUser).toHaveBeenCalledTimes(2);
    expect(database.rpc).toHaveBeenNthCalledWith(2, 'get_admin_authority_context', {
      p_actor_id: delegatedId, p_target_id: studentId,
    });
  });

  it('revalidates the bearer identity rather than trusting a previously loaded request identity', async () => {
    expect((await request('/administrative')).status).toBe(200);
    database.getUser.mockResolvedValue({ data: { user: null }, error: new Error('Session revoked') });
    await expectDenied(await request('/authorize/create_account'), [401]);
    expect(database.getUser).toHaveBeenCalledTimes(2);
    expect(database.rpc).toHaveBeenCalledTimes(1);
  });
});
