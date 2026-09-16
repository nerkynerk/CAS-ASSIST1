import { Router } from 'express';
import { z } from 'zod';

import { requireActive, requireAuth } from '../middleware/auth.js';
import { isConfidentMatch, rankKnowledge, type KnowledgeCandidate } from '../services/knowledge-retrieval.js';
import { adminSupabase } from '../supabase.js';
import type { AuthenticatedRequest } from '../types.js';

export const aiRouter = Router();
aiRouter.use(requireAuth, requireActive);

const querySchema = z.object({
  query: z.string().trim().min(3).max(2000),
  category: z.string().trim().min(1).max(80).optional(),
});

aiRouter.post('/query', async (req, res) => {
  const input = querySchema.parse(req.body);
  const user = (req as AuthenticatedRequest).authUser;

  // Only role-scoped, administrator-managed Tier-1 articles are eligible.
  // Verified document chunks stay excluded until they carry equivalent audience metadata.
  const { data: articles, error } = await adminSupabase
    .from('tier1_knowledge_articles')
    .select('id, title, category, answer, keywords, audience_roles')
    .eq('state', 'active')
    .contains('audience_roles', [user.role]);
  if (error) throw error;

  const candidates: KnowledgeCandidate[] = (articles ?? []).map(article => ({
    id: article.id,
    title: article.title,
    category: article.category,
    content: article.answer,
    keywords: article.keywords ?? [],
    sourceType: 'tier1',
    audienceRoles: article.audience_roles,
  }));
  const best = rankKnowledge(input.query, candidates, user.role);
  const fallbackCategory = best?.category ?? 'general_inquiry';
  const matched = isConfidentMatch(best) ? best : null;
  const answer = matched
    ? matched.content.trim()
    : 'I could not find a sufficiently confident answer in the approved CAS knowledge base. Please rephrase the question with more detail or confirm it with the responsible CAS or university office. I will not guess about official requirements, fees, deadlines, grades, or approval decisions.';

  const { data: log, error: logError } = await adminSupabase
    .from('ai_query_logs')
    .insert({
      student_id: user.id,
      query_text: input.query,
      category: matched?.category ?? input.category ?? fallbackCategory,
      answer_text: answer,
      source_ids: [],
      confidence: best?.confidence ?? 0,
      outcome: matched ? 'deflected' : 'low_confidence',
    })
    .select('id')
    .single();
  if (logError) throw logError;

  res.json({
    queryId: log.id,
    isDeflected: Boolean(matched),
    answer,
    confidence: best?.confidence ?? 0,
    category: matched?.category ?? input.category ?? fallbackCategory,
    source: matched ? {
      title: matched.title,
      type: 'tier1',
    } : null,
  });
});

aiRouter.post('/feedback', async (req, res) => {
  const user = (req as AuthenticatedRequest).authUser;
  const input = z.object({
    queryId: z.uuid(),
    resolved: z.boolean(),
  }).parse(req.body);
  const { error } = await adminSupabase
    .from('ai_query_logs')
    .update({ resolved_inquiry: input.resolved, outcome: input.resolved ? 'deflected' : 'unresolved' })
    .eq('id', input.queryId)
    .eq('student_id', user.id);
  if (error) throw error;
  res.status(204).send();
});

aiRouter.post('/escalate', async (req, res) => {
  const user = (req as AuthenticatedRequest).authUser;
  if (user.role !== 'student') {
    res.status(403).json({ error: 'Only students can escalate an inquiry to an advising request.' });
    return;
  }
  const input = z.object({
    queryId: z.uuid(),
    category: z.string().trim().min(1).max(80),
    justification: z.string().trim().min(20).max(10000),
  }).parse(req.body);
  const { data, error } = await adminSupabase.rpc('escalate_ai_query_to_ticket', {
    p_student_id: user.id,
    p_query_id: input.queryId,
    p_category: input.category,
    p_justification: input.justification,
  });
  if (error) throw error;
  res.status(201).json(data);
});
