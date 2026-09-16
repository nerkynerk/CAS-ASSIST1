import { readFile } from 'node:fs/promises';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

const backendEnv = dotenv.parse(await readFile('.env'));
const frontendEnv = dotenv.parse(await readFile('../Frontend/.env'));
const testUsers = dotenv.parse(await readFile('.env.test-users'));
const url = backendEnv.SUPABASE_URL;
const publicKey = frontendEnv.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const secretKey = backendEnv.SUPABASE_SECRET_KEY;

if (!url || !publicKey || !secretKey) {
  throw new Error('Supabase URL, public key, or backend secret key is missing.');
}

const faculty = createClient(url, publicKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const admin = createClient(url, secretKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: authData, error: authError } = await faculty.auth.signInWithPassword({
  email: testUsers.CAS_TEST_FACULTY_EMAIL,
  password: testUsers.CAS_TEST_FACULTY_PASSWORD,
});
if (authError || !authData.user) throw authError ?? new Error('No faculty user returned.');

const { data: assignment, error: assignmentError } = await faculty
  .from('faculty_assignments')
  .select('id, subject_code, section_code, room')
  .eq('faculty_id', authData.user.id)
  .eq('is_active', true)
  .limit(1)
  .single();
if (assignmentError || !assignment) throw assignmentError ?? new Error('No active faculty assignment found.');

let insertedId;
try {
  const { data, error } = await faculty
    .from('spatial_logs')
    .insert({
      faculty_id: authData.user.id,
      assignment_id: assignment.id,
      original_room: assignment.room ?? 'CAS TEST ROOM',
      new_room: 'CAS TEST TEMPORARY ROOM',
      subject_code: assignment.subject_code,
      section_code: assignment.section_code,
      reason: 'Temporary CAS Assist permission verification.',
    })
    .select('id')
    .single();
  if (error || !data) throw error ?? new Error('Room-change insert returned no row.');
  insertedId = data.id;
} finally {
  if (insertedId) {
    const { error } = await admin.from('spatial_logs').delete().eq('id', insertedId);
    if (error) throw error;
  }
  await faculty.auth.signOut();
}

console.log(JSON.stringify({ ok: true, roleVerified: 'faculty', cleanedUp: true }));
