import 'dotenv/config';
import { randomBytes } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

const url = process.env.SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !secret) throw new Error('Backend Supabase configuration is missing.');

const frontendEnv = dotenv.parse(await readFile('../Frontend/.env'));
const publicKey = frontendEnv.EXPO_PUBLIC_SUPABASE_ANON_KEY;
if (!publicKey) throw new Error('Frontend publishable/anon key is missing.');

const admin = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
const suffix = new URL(url).hostname.split('.')[0].slice(0, 8);
const roles = ['student', 'faculty', 'staff', 'super_admin'];
const displayNames = {
  student: 'CAS Test Student',
  faculty: 'CAS Test Faculty',
  staff: 'CAS Test Staff',
  super_admin: 'CAS Test Administrator',
};
const testStudentNumber = '99-00000-001';

const { data: existingUsers, error: listError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
if (listError) throw listError;

const accounts = {};
for (const role of roles) {
  const email = `casassist.${role}.${suffix}@neu.edu.ph`;
  const password = `CaS!${randomBytes(18).toString('base64url')}`;
  let user = existingUsers.users.find(candidate => candidate.email?.toLowerCase() === email);

  if (user) {
    const { data, error } = await admin.auth.admin.updateUserById(user.id, {
      password,
      user_metadata: {
        display_name: displayNames[role],
        student_number: role === 'student' ? testStudentNumber : null,
        cas_test_account: true,
      },
    });
    if (error) throw error;
    user = data.user;
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        display_name: displayNames[role],
        student_number: role === 'student' ? testStudentNumber : null,
        cas_test_account: true,
      },
    });
    if (error) throw error;
    user = data.user;
  }

  accounts[role] = { id: user.id, email, password };
}

for (const role of roles) {
  const account = accounts[role];
  const { error } = await admin
    .from('users_account_registry')
    .update({
      display_name: displayNames[role],
      student_number: role === 'student' ? testStudentNumber : null,
      role,
      state: 'active',
      verification_status: 'verified',
      verified_at: new Date().toISOString(),
      verified_by: accounts.super_admin.id,
      rejection_reason: null,
    })
    .eq('id', account.id);
  if (error) throw error;
}

const { error: programError } = await admin.from('cas_programs').upsert({
  code: 'CAS-TEST',
  name: 'CAS Assist Test Program',
  department: 'CAS Test Department',
  is_active: true,
}, { onConflict: 'code' });
if (programError) throw programError;

const { error: membershipError } = await admin.from('student_program_memberships').upsert({
  student_id: accounts.student.id,
  program_code: 'CAS-TEST',
  year_level: 3,
  block_code: 'TEST-3A',
  is_current: true,
}, { onConflict: 'student_id,program_code,started_at' });
if (membershipError) throw membershipError;

const { data: assignment, error: assignmentError } = await admin.from('faculty_assignments').upsert({
  faculty_id: accounts.faculty.id,
  subject_code: 'CAS-TEST-101',
  subject_title: 'CAS Assist Test Subject',
  section_code: 'TEST-3A',
  block_code: 'TEST-3A',
  room: 'CAS 101',
  day_pattern: 'Daily',
  starts_at: '09:00',
  ends_at: '10:30',
  term_code: 'TEST-TERM',
  is_active: true,
}, { onConflict: 'faculty_id,subject_code,section_code,term_code' }).select('id').single();
if (assignmentError) throw assignmentError;

const { error: enrollmentError } = await admin.from('student_enrollments').upsert({
  student_id: accounts.student.id,
  assignment_id: assignment.id,
  state: 'active',
}, { onConflict: 'student_id,assignment_id' });
if (enrollmentError) throw enrollmentError;

const today = new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone: 'Asia/Manila' }).format(new Date()).toLowerCase();
const { data: existingSchedule, error: scheduleReadError } = await admin.from('schedules').select('id')
  .eq('faculty_id', accounts.faculty.id).eq('subject_code', 'CAS-TEST-101').eq('section', 'TEST-3A').limit(1).maybeSingle();
if (scheduleReadError) throw scheduleReadError;
if (!existingSchedule) {
  const { error } = await admin.from('schedules').insert({
    faculty_id: accounts.faculty.id,
    subject_code: 'CAS-TEST-101',
    subject_name: 'CAS Assist Test Subject',
    section: 'TEST-3A',
    room: 'CAS 101',
    day: today,
    time_start: '09:00',
    time_end: '10:30',
    semester: 'Test Semester',
    academic_year: '2026-2027',
    state: 'active',
  });
  if (error) throw error;
}

async function insertOnce(table, matchColumn, matchValue, values) {
  const { data, error: readError } = await admin.from(table).select('id').eq(matchColumn, matchValue).limit(1).maybeSingle();
  if (readError) throw readError;
  if (data) return data.id;
  const { data: inserted, error } = await admin.from(table).insert(values).select('id').single();
  if (error) throw error;
  return inserted.id;
}

await insertOnce('announcements', 'title', 'CAS Assist Test Announcement', {
  created_by: accounts.super_admin.id,
  title: 'CAS Assist Test Announcement',
  body: 'The test environment is connected and ready for role-based validation.',
  state: 'published',
  priority: 'normal',
  pinned: true,
  audience_roles: roles,
  publish_at: new Date().toISOString(),
});

await insertOnce('advising_ticket_pipeline', 'description', 'CAS Assist generated test advising ticket.', {
  student_id: accounts.student.id,
  category: 'Academic Advising',
  description: 'CAS Assist generated test advising ticket.',
  status: 'submitted',
  priority: 'normal',
  state: 'active',
});

await insertOnce('document_requests', 'purpose', 'CAS Assist generated test document request.', {
  student_id: accounts.student.id,
  document_type: 'certificate_of_enrollment',
  purpose: 'CAS Assist generated test document request.',
  copies: 1,
  status: 'submitted',
  state: 'active',
});

const roomChangeId = await insertOnce('spatial_logs', 'reason', 'CAS Assist generated test room change.', {
  faculty_id: accounts.faculty.id,
  assignment_id: assignment.id,
  subject_code: 'CAS-TEST-101',
  section_code: 'TEST-3A',
  original_room: 'CAS 101',
  new_room: 'CAS 102',
  reason: 'CAS Assist generated test room change.',
});

const credentials = roles.flatMap(role => [
  `CAS_TEST_${role.toUpperCase()}_EMAIL=${accounts[role].email}`,
  `CAS_TEST_${role.toUpperCase()}_PASSWORD=${accounts[role].password}`,
]);
await writeFile('.env.test-users', `${credentials.join('\n')}\n`, { mode: 0o600 });

const rlsChecks = {};
for (const role of roles) {
  const client = createClient(url, publicKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error: signInError } = await client.auth.signInWithPassword({
    email: accounts[role].email,
    password: accounts[role].password,
  });
  if (signInError) throw signInError;

  const checks = role === 'student'
    ? [['announcements', 'id'], ['advising_ticket_pipeline', 'id'], ['document_requests', 'id'], ['spatial_logs', 'id']]
    : role === 'faculty'
      ? [['schedules', 'id'], ['spatial_logs', 'id']]
      : role === 'staff'
        ? [['advising_ticket_pipeline', 'id'], ['document_requests', 'id']]
        : [['users_account_registry', 'id'], ['announcements', 'id']];

  for (const [table, column] of checks) {
    const { error } = await client.from(table).select(column).limit(1);
    if (error) throw new Error(`${role} cannot read ${table}: ${error.message}`);
  }
  if (role === 'student') {
    const { error } = await client.rpc('acknowledge_room_change', { p_spatial_log_id: roomChangeId });
    if (error) throw new Error(`student acknowledgment failed: ${error.message}`);
  }
  await client.auth.signOut();
  rlsChecks[role] = checks.length;
}

console.log(JSON.stringify({
  ok: true,
  accounts: roles.length,
  seededDataSets: 7,
  rlsChecks,
  credentialsFile: 'Backend/.env.test-users',
}));
