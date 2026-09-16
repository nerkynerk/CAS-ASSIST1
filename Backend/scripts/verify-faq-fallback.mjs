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

const roleQuestions = {
  student: 'How do I request a school document?',
  faculty: 'How do room changes work?',
  staff: 'Where can I publish announcements?',
  super_admin: 'What does system analytics show?',
};
const admin = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
const queryIds = [];

try {
  for (const [role, question] of Object.entries(roleQuestions)) {
    const prefix = `CAS_TEST_${role.toUpperCase()}`;
    const client = createClient(url, publicKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { error: signInError } = await client.auth.signInWithPassword({
      email: testUsers[`${prefix}_EMAIL`],
      password: testUsers[`${prefix}_PASSWORD`],
    });
    if (signInError) throw signInError;

    const { count, error: faqError } = await client
      .from('tier1_knowledge_articles')
      .select('id', { count: 'exact', head: true })
      .eq('state', 'active');
    if (faqError || (count ?? 0) < 11) throw faqError ?? new Error(`${role} cannot read the FAQ collection.`);

    const { data, error } = await client.rpc('answer_tier1_question', { p_query: question });
    if (error || !data?.isDeflected || !data.answer || !data.source?.title) {
      throw error ?? new Error(`${role} did not receive a grounded fallback answer.`);
    }
    queryIds.push(data.queryId);

    const { error: feedbackError } = await client.rpc('record_tier1_feedback', {
      p_query_id: data.queryId,
      p_resolved: true,
    });
    if (feedbackError) throw feedbackError;
    await client.auth.signOut();
  }

  console.log(JSON.stringify({ ok: true, rolesVerified: 4, faqArticles: 11, feedbackVerified: true }));
} finally {
  if (queryIds.length) await admin.from('ai_query_logs').delete().in('id', queryIds);
}
