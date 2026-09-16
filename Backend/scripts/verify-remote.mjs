import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !secret) {
  throw new Error('SUPABASE_URL and SUPABASE_SECRET_KEY are required in Backend/.env');
}

const supabase = createClient(url, secret, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const tables = [
  'users_account_registry',
  'faculty_assignments',
  'student_enrollments',
  'advising_ticket_pipeline',
  'spatial_logs',
  'spatial_log_acknowledgments',
  'announcements',
  'document_requests',
  'schedules',
  'ai_query_logs',
];

const failures = [];
for (const table of tables) {
  const { error } = await supabase.from(table).select('id', { head: true, count: 'exact' });
  if (error) failures.push(`${table}: ${error.message}`);
}

const { error: analyticsError } = await supabase.rpc('get_queue_analytics', {
  p_window_hours: 168,
  p_category: null,
});
if (analyticsError) failures.push(`get_queue_analytics: ${analyticsError.message}`);

const { error: authError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1 });
if (authError) failures.push(`admin auth: ${authError.message}`);

if (failures.length > 0) {
  console.error(JSON.stringify({ ok: false, failures }, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({ ok: true, tables: tables.length, rpc: true, adminAuth: true }));
}
