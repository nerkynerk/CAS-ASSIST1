import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !secret) throw new Error('Backend Supabase configuration is missing.');

const admin = createClient(url, secret, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const stamp = Date.now();
const email = `casassist.registration.check.${stamp}@neu.edu.ph`;
const studentNumber = String(stamp);
let userId;

try {
  const { data, error: createError } = await admin.auth.admin.createUser({
    email,
    password: `Verify!${stamp}`,
    email_confirm: true,
    user_metadata: {
      display_name: 'Registration Verification',
      student_number: studentNumber,
      cas_test_account: true,
    },
  });
  if (createError) throw createError;
  userId = data.user.id;

  const { data: profile, error: profileError } = await admin
    .from('users_account_registry')
    .select('email, display_name, student_number, role')
    .eq('id', userId)
    .single();
  if (profileError) throw profileError;
  if (profile.student_number !== studentNumber || profile.role !== 'student') {
    throw new Error('The registration profile did not preserve the student number or student role.');
  }

  console.log('Student registration metadata was stored correctly.');
} finally {
  if (userId) {
    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) console.warn(`Temporary verification user cleanup failed: ${error.message}`);
  }
}
