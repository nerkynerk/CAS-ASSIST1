import type { Server } from 'node:http';

import express from 'express';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const database = vi.hoisted(() => ({
  getUser: vi.fn(),
  from: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock('../src/supabase.js', () => ({
  adminSupabase: { auth: { getUser: database.getUser }, from: database.from, rpc: database.rpc },
}));
vi.mock('../src/config.js', () => ({ config: { EXPO_ACCESS_TOKEN: 'local-test-only' } }));

import { requireAuth } from '../src/middleware/auth.js';
import { errorHandler } from '../src/middleware/errors.js';
import { aiRouter } from '../src/routes/ai.js';
import { notificationsRouter } from '../src/routes/notifications.js';
import { queueRouter } from '../src/routes/queue.js';
import type { AuthenticatedRequest } from '../src/types.js';

const studentId = '11111111-1111-4111-8111-111111111111';
const otherStudentId = '22222222-2222-4222-8222-222222222222';
const queryId = '33333333-3333-4333-8333-333333333333';
const token = 'local-test-token';

function queryResult(data: unknown, error: unknown = null) {
  const result = { data, error };
  const promise = Promise.resolve(result);
  const query = {
    select: vi.fn(), eq: vi.fn(), lte: vi.fn(), or: vi.fn(), limit: vi.fn(),
    contains: vi.fn(), insert: vi.fn(), update: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue(result), single: vi.fn().mockResolvedValue(result),
    then: promise.then.bind(promise),
  };
  for (const method of [query.select, query.eq, query.lte, query.or, query.limit,
    query.contains, query.insert, query.update]) method.mockReturnValue(query);
  return query;
}

describe('trusted backend authorization (mocked Supabase, local HTTP only)', () => {
  let server: Server;
  let baseUrl: string;
  let profile: { id: string; email: string; role: string; state: string; verification_status: string };
  let queries: Map<string, ReturnType<typeof queryResult>>;

  beforeAll(async () => {
    const app = express();
    app.use(express.json());
    // Test-only identity endpoint demonstrates authentication remains separate from operational access.
    app.get('/session', requireAuth, (req, res) => res.json((req as AuthenticatedRequest).authUser));
    app.use('/api/queue', queueRouter);
    app.use('/api/ai', aiRouter);
    app.use('/api/notifications', notificationsRouter);
    app.use(errorHandler);
    server = app.listen(0, '127.0.0.1');
    await new Promise<void>((resolve, reject) => {
      server.once('listening', resolve);
      server.once('error', reject);
    });
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Local test server is unavailable.');
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    if (server) await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  });

  beforeEach(() => {
    vi.resetAllMocks();
    profile = { id: studentId, email: 'student@neu.edu.ph', role: 'student', state: 'active', verification_status: 'verified' };
    queries = new Map([
      ['users_account_registry', queryResult(profile)],
      ['student_program_memberships', queryResult({ id: 'managed-membership' })],
    ]);
    database.getUser.mockResolvedValue({ data: { user: { id: studentId, email: profile.email } }, error: null });
    database.from.mockImplementation((table: string) => {
      const query = queries.get(table);
      if (!query) throw new Error(`Unexpected database access: ${table}`);
      return query;
    });
    database.rpc.mockResolvedValue({ data: { estimatedMinutes: null }, error: null });
  });

  function request(path: string, body?: unknown, authorization: string | null = `Bearer ${token}`) {
    return fetch(`${baseUrl}${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: { ...(authorization ? { authorization } : {}), 'content-type': 'application/json' },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  }

  it.each([null, 'Basic invalid', 'Bearer '])('rejects missing or malformed credentials: %s', async authorization => {
    expect((await request('/api/queue/estimate', undefined, authorization)).status).toBe(401);
    expect(database.getUser).not.toHaveBeenCalled();
    expect(database.rpc).not.toHaveBeenCalled();
  });

  it('validates the bearer token with Supabase, not client role or identity claims', async () => {
    database.getUser.mockResolvedValue({ data: { user: null }, error: new Error('Expired') });
    expect((await request(`/api/queue/estimate?role=super_admin&studentId=${otherStudentId}`)).status).toBe(401);
    expect(database.getUser).toHaveBeenCalledWith(token);
    expect(database.from).not.toHaveBeenCalled();
  });

  it.each(['outsider@example.com', 'student@neu.edu.ph.attacker.example', 'student@@neu.edu.ph'])('rejects a noninstitutional identity: %s', async email => {
    database.getUser.mockResolvedValue({ data: { user: { id: studentId, email } }, error: null });
    expect((await request('/api/queue/estimate')).status).toBe(401);
    expect(database.from).not.toHaveBeenCalled();
  });

  it('rejects a missing registry profile', async () => {
    queries.set('users_account_registry', queryResult(null));
    expect((await request('/api/queue/estimate')).status).toBe(403);
    expect(database.rpc).not.toHaveBeenCalled();
  });

  it('fails closed when profile lookup fails', async () => {
    queries.set('users_account_registry', queryResult(null, new Error('Unavailable')));
    expect((await request('/api/queue/estimate')).status).toBe(403);
    expect(database.rpc).not.toHaveBeenCalled();
  });

  it('handles a thrown authentication-provider error without reaching privileged operations', async () => {
    database.getUser.mockRejectedValue(new Error('Authentication provider unavailable'));
    const response = await request('/api/queue/estimate');
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: 'The service could not complete the request.' });
    expect(database.from).not.toHaveBeenCalled();
    expect(database.rpc).not.toHaveBeenCalled();
  });

  it.each([
    { role: 'administrator' }, { state: 'inactive' }, { verification_status: 'unknown' },
    { id: otherStudentId }, { email: 'other@neu.edu.ph' },
  ])('rejects an invalid or mismatched trusted profile: %j', async changes => {
    Object.assign(profile, changes);
    expect((await request('/api/queue/estimate')).status).toBe(403);
    expect(database.rpc).not.toHaveBeenCalled();
  });

  it('allows pending authentication for onboarding without granting operational access', async () => {
    profile.verification_status = 'pending';
    const response = await request('/session');
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ id: studentId, verificationStatus: 'pending' });
    expect(database.from).toHaveBeenCalledTimes(1);
  });

  it.each(['pending', 'rejected'])('blocks %s students from queue and AI before service-role data access', async status => {
    profile.verification_status = status;
    expect((await request('/api/queue/estimate')).status).toBe(403);
    expect((await request('/api/ai/query', { query: 'How do I submit advising?' })).status).toBe(403);
    expect(database.rpc).not.toHaveBeenCalled();
    expect(database.from.mock.calls.every(([table]) => table === 'users_account_registry')).toBe(true);
  });

  it.each(['faculty', 'staff', 'super_admin'])('blocks unverified %s operations', async role => {
    profile.role = role;
    profile.verification_status = 'pending';
    expect((await request('/api/queue/analytics')).status).toBe(403);
    expect((await request('/api/notifications/send', { eventId: queryId, eventType: 'ticket' })).status).toBe(403);
    expect(database.rpc).not.toHaveBeenCalled();
  });

  it.each(['student', 'faculty', 'staff', 'super_admin'])('blocks archived %s operational routes including service-role mutations', async role => {
    profile.role = role;
    profile.state = 'archived_read_only';
    for (const [path, body] of [
      ['/api/queue/estimate', undefined], ['/api/queue/analytics', undefined],
      ['/api/ai/query', { query: 'How do I submit advising?' }],
      ['/api/ai/feedback', { queryId, resolved: true }],
      ['/api/ai/escalate', { queryId, category: 'advising', justification: 'Please review this advising concern.' }],
      ['/api/notifications/send', { eventId: queryId, eventType: 'ticket' }],
    ] as const) expect((await request(path, body)).status).toBe(403);
    expect(database.rpc).not.toHaveBeenCalled();
    expect(database.from.mock.calls.every(([table]) => table === 'users_account_registry')).toBe(true);
    expect((await request('/session')).status).toBe(200);
  });

  it('blocks a verified student without managed CAS membership (profile program cannot grant access)', async () => {
    Object.assign(profile, { program_code: 'self-declared-program' });
    queries.set('student_program_memberships', queryResult(null));
    expect((await request('/api/queue/estimate')).status).toBe(403);
    expect(database.rpc).not.toHaveBeenCalled();
  });

  it('fails closed on membership lookup errors', async () => {
    queries.set('student_program_memberships', queryResult(null, new Error('Unavailable')));
    expect((await request('/api/queue/estimate')).status).toBe(403);
    expect(database.rpc).not.toHaveBeenCalled();
  });

  it('checks current dated membership against an active CAS program', async () => {
    expect((await request('/api/queue/estimate')).status).toBe(200);
    const membershipQuery = queries.get('student_program_memberships')!;
    expect(membershipQuery.select).toHaveBeenCalledWith('id, cas_programs!inner(code)');
    expect(membershipQuery.eq).toHaveBeenCalledWith('student_id', studentId);
    expect(membershipQuery.eq).toHaveBeenCalledWith('is_current', true);
    expect(membershipQuery.eq).toHaveBeenCalledWith('cas_programs.is_active', true);
    const today = new Date().toISOString().slice(0, 10);
    expect(membershipQuery.lte).toHaveBeenCalledWith('started_at', today);
    expect(membershipQuery.or).toHaveBeenCalledWith(`ended_at.is.null,ended_at.gte.${today}`);
  });

  it('keeps queue estimates bound to the authenticated student and preserves the RPC response', async () => {
    const responseData = { position: 2, estimateAvailable: false, computedAt: 'test-timestamp' };
    database.rpc.mockResolvedValue({ data: responseData, error: null });
    const response = await request(`/api/queue/estimate?p_student_id=${otherStudentId}&studentId=${otherStudentId}`);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(responseData);
    expect(database.rpc).toHaveBeenCalledExactlyOnceWith('get_student_queue_estimate', { p_student_id: studentId });
  });

  it.each(['student', 'faculty'])('rejects %s access to staff analytics', async role => {
    profile.role = role;
    expect((await request('/api/queue/analytics?role=super_admin')).status).toBe(403);
    expect(database.rpc).not.toHaveBeenCalled();
  });

  it.each(['staff', 'super_admin'])('retains verified %s analytics and notification permissions', async role => {
    profile.role = role;
    const analytics = { activeLoad: 3, resolvedCount: 2 };
    database.rpc.mockResolvedValue({ data: analytics, error: null });
    const response = await request('/api/queue/analytics?windowHours=24&category=advising');
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(analytics);
    expect(database.rpc).toHaveBeenCalledWith('get_queue_analytics', { p_window_hours: 24, p_category: 'advising' });
    expect((await request('/api/notifications/send', { eventId: queryId, eventType: 'ticket' })).status).toBe(202);
    expect(database.from.mock.calls.some(([table]) => table === 'student_program_memberships')).toBe(false);
  });

  it.each(['faculty', 'staff', 'super_admin'])('rejects %s impersonating a student queue request', async role => {
    profile.role = role;
    expect((await request(`/api/queue/estimate?studentId=${otherStudentId}`)).status).toBe(403);
    expect(database.rpc).not.toHaveBeenCalled();
  });

  it.each(['student', 'faculty'])('rejects %s publishing privileged notifications', async role => {
    profile.role = role;
    expect((await request('/api/notifications/send', { eventId: queryId, eventType: 'ticket', role: 'staff' })).status).toBe(403);
  });

  it('retains default analytics arguments and input validation', async () => {
    profile.role = 'staff';
    expect((await request('/api/queue/analytics')).status).toBe(200);
    expect(database.rpc).toHaveBeenCalledWith('get_queue_analytics', { p_window_hours: 168, p_category: null });
    database.rpc.mockClear();
    expect((await request('/api/queue/analytics?windowHours=0')).status).toBe(400);
    expect(database.rpc).not.toHaveBeenCalled();
  });

  it('returns a safe API failure if a queue RPC fails', async () => {
    database.rpc.mockResolvedValue({ data: null, error: new Error('Database details must remain private') });
    const response = await request('/api/queue/estimate');
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: 'The service could not complete the request.' });
  });

  it('preserves verified student AI queries and binds query logs to the caller', async () => {
    queries.set('tier1_knowledge_articles', queryResult([]));
    const logs = queryResult({ id: queryId });
    queries.set('ai_query_logs', logs);
    const response = await request('/api/ai/query', { query: 'How do I submit advising?', student_id: otherStudentId });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ queryId, isDeflected: false, source: null });
    expect(logs.insert).toHaveBeenCalledWith(expect.objectContaining({ student_id: studentId }));
  });

  it('keeps AI feedback updates scoped to the authenticated owner', async () => {
    const logs = queryResult(null);
    queries.set('ai_query_logs', logs);
    expect((await request('/api/ai/feedback', { queryId, resolved: false, student_id: otherStudentId })).status).toBe(204);
    expect(logs.eq).toHaveBeenCalledWith('id', queryId);
    expect(logs.eq).toHaveBeenCalledWith('student_id', studentId);
  });

  it('keeps advising escalation identity bound to the verified student', async () => {
    database.rpc.mockResolvedValue({ data: { ticketId: 'existing-contract' }, error: null });
    const response = await request('/api/ai/escalate', {
      queryId, category: 'advising', justification: 'Please review this academic advising concern.', student_id: otherStudentId,
    });
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ ticketId: 'existing-contract' });
    expect(database.rpc).toHaveBeenCalledWith('escalate_ai_query_to_ticket', expect.objectContaining({ p_student_id: studentId }));
  });
});
