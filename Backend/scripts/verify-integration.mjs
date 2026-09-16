import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

const backendEnv = dotenv.parse(await readFile('.env'));
const frontendEnv = dotenv.parse(await readFile('../Frontend/.env'));
const testUsers = dotenv.parse(await readFile('.env.test-users'));
const url = backendEnv.SUPABASE_URL;
const publicKey = frontendEnv.EXPO_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !publicKey) throw new Error('Supabase URL or frontend public key is missing.');

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

const [{ app }, studentToken, staffToken] = await Promise.all([
  import('../dist/app.js'),
  tokenFor('student'),
  tokenFor('staff'),
]);

const server = app.listen(0, '127.0.0.1');
await new Promise((resolve, reject) => {
  server.once('listening', resolve);
  server.once('error', reject);
});

try {
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Test server address unavailable.');
  const base = `http://127.0.0.1:${address.port}`;

  const checks = [
    ['health', '/api/health', undefined, 200],
    ['anonymous rejection', '/api/queue/estimate', undefined, 401],
    ['student estimate', '/api/queue/estimate', studentToken, 200],
    ['student analytics rejection', '/api/queue/analytics', studentToken, 403],
    ['staff analytics', '/api/queue/analytics', staffToken, 200],
  ];

  for (const [name, path, token, expected] of checks) {
    const response = await fetch(`${base}${path}`, {
      headers: token ? { authorization: `Bearer ${token}` } : {},
    });
    if (response.status !== expected) {
      throw new Error(`${name} returned ${response.status}; expected ${expected}.`);
    }
  }

  console.log(JSON.stringify({ ok: true, apiChecks: checks.length }));
} finally {
  await new Promise(resolve => server.close(resolve));
}
