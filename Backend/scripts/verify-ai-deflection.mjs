import { readFile } from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

const backendEnv = dotenv.parse(await readFile('.env'));
const frontendEnv = dotenv.parse(await readFile('../Frontend/.env'));
const testUsers = dotenv.parse(await readFile('.env.test-users'));
const url = backendEnv.SUPABASE_URL;
const publicKey = frontendEnv.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const secret = backendEnv.SUPABASE_SECRET_KEY ?? backendEnv.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !publicKey || !secret) throw new Error('Supabase verification configuration is incomplete.');

async function tokenFor(role) {
  const client = createClient(url, publicKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const prefix = `CAS_TEST_${role.toUpperCase()}`;
  const { data, error } = await client.auth.signInWithPassword({
    email: testUsers[`${prefix}_EMAIL`],
    password: testUsers[`${prefix}_PASSWORD`],
  });
  if (error || !data.session) throw error ?? new Error(`No ${role} session returned.`);
  return data.session.access_token;
}

const roles = {
  student: 'How do I submit an advising request?',
  faculty: 'How can I record a classroom relocation?',
  staff: 'Where do I publish an announcement?',
  super_admin: 'What information is shown in system analytics?',
};
const tokens = Object.fromEntries(await Promise.all(
  Object.keys(roles).map(async role => [role, await tokenFor(role)]),
));
const admin = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
const queryIds = [];
const { app } = await import('../dist/app.js');
const server = app.listen(0, '127.0.0.1');
await new Promise((resolve, reject) => {
  server.once('listening', resolve);
  server.once('error', reject);
});

try {
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Test server address unavailable.');
  const endpoint = `http://127.0.0.1:${address.port}/api/ai/query`;

  for (const [role, query] of Object.entries(roles)) {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { authorization: `Bearer ${tokens[role]}`, 'content-type': 'application/json' },
      body: JSON.stringify({ query }),
    });
    const body = await response.json();
    if (response.status !== 200 || !body.isDeflected || !body.answer || !body.source?.title) {
      throw new Error(`${role} deflection failed with status ${response.status}: ${JSON.stringify(body)}`);
    }
    queryIds.push(body.queryId);
  }

  const unrelated = await fetch(endpoint, {
    method: 'POST',
    headers: { authorization: `Bearer ${tokens.student}`, 'content-type': 'application/json' },
    body: JSON.stringify({ query: 'Who won an international football championship on another continent?' }),
  });
  const unrelatedBody = await unrelated.json();
  if (unrelated.status !== 200 || unrelatedBody.isDeflected !== false) {
    throw new Error('The closed-domain boundary did not reject an unrelated question.');
  }
  queryIds.push(unrelatedBody.queryId);

  const feedback = await fetch(`http://127.0.0.1:${address.port}/api/ai/feedback`, {
    method: 'POST',
    headers: { authorization: `Bearer ${tokens.student}`, 'content-type': 'application/json' },
    body: JSON.stringify({ queryId: unrelatedBody.queryId, resolved: false }),
  });
  if (feedback.status !== 204) throw new Error(`Feedback returned ${feedback.status}.`);

  console.log(JSON.stringify({ ok: true, rolesVerified: 4, openDomainRejected: true, feedbackVerified: true }));
} finally {
  await new Promise(resolve => server.close(resolve));
  if (queryIds.length) await admin.from('ai_query_logs').delete().in('id', queryIds);
}
