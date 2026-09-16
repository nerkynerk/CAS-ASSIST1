import { readFile } from 'node:fs/promises';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

const backendEnv = dotenv.parse(await readFile('.env'));
const frontendEnv = dotenv.parse(await readFile('../Frontend/.env'));
const testUsers = dotenv.parse(await readFile('.env.test-users'));
const url = backendEnv.SUPABASE_URL;
const publicKey = frontendEnv.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !publicKey) {
  throw new Error('Supabase URL or frontend public key is missing.');
}

async function verifyRole(role) {
  const client = createClient(url, publicKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const prefix = `CAS_TEST_${role.toUpperCase()}`;
  const { data: authData, error: authError } = await client.auth.signInWithPassword({
    email: testUsers[`${prefix}_EMAIL`],
    password: testUsers[`${prefix}_PASSWORD`],
  });

  if (authError || !authData.user) {
    throw authError ?? new Error(`No ${role} user returned.`);
  }

  let announcementId;
  try {
    const { data, error } = await client
      .from('announcements')
      .insert({
        created_by: authData.user.id,
        title: `CAS Assist permission check (${role})`,
        body: 'Temporary verification announcement. This row is removed automatically.',
        audience_roles: ['student', 'faculty', 'staff', 'super_admin'],
        pinned: false,
        state: 'published',
        publish_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error || !data) throw error ?? new Error(`${role} insert returned no row.`);
    announcementId = data.id;
  } finally {
    if (announcementId) {
      const { error } = await client.from('announcements').delete().eq('id', announcementId);
      if (error) throw error;
    }
    await client.auth.signOut();
  }
}

for (const role of ['staff', 'super_admin']) {
  await verifyRole(role);
}

console.log(JSON.stringify({ ok: true, rolesVerified: ['staff', 'super_admin'] }));
