import { readFile } from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

const backendEnv = dotenv.parse(await readFile('.env'));
const frontendEnv = dotenv.parse(await readFile('../Frontend/.env'));
const testUsers = dotenv.parse(await readFile('.env.test-users'));
const url = backendEnv.SUPABASE_URL;
const publicKey = frontendEnv.EXPO_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !publicKey) throw new Error('Supabase URL or frontend public key is missing.');

async function clientFor(role) {
  const client = createClient(url, publicKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const prefix = `CAS_TEST_${role.toUpperCase()}`;
  const { error } = await client.auth.signInWithPassword({
    email: testUsers[`${prefix}_EMAIL`],
    password: testUsers[`${prefix}_PASSWORD`],
  });
  if (error) throw error;
  return client;
}

const admin = await clientFor('super_admin');
const staff = await clientFor('staff');

try {
  const { data, error } = await admin.rpc('get_system_analytics', { p_window_days: 30 });
  if (error) throw error;
  const requiredGroups = ['users', 'advising', 'documents', 'announcements', 'roomChanges', 'aiHelpdesk', 'notifications', 'academics', 'knowledge'];
  for (const group of requiredGroups) {
    if (!data?.[group] || typeof data[group] !== 'object') throw new Error(`Analytics group missing: ${group}`);
  }

  const { error: staffError } = await staff.rpc('get_system_analytics', { p_window_days: 30 });
  if (!staffError) throw new Error('Staff unexpectedly received super-admin system analytics.');

  console.log(JSON.stringify({ ok: true, groups: requiredGroups.length, staffDenied: true }));
} finally {
  await Promise.all([admin.auth.signOut(), staff.auth.signOut()]);
}
