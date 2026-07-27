import { Router } from 'express';
import { z } from 'zod';

import { config } from '../config.js';
import { allowRoles, requireActive, requireAuth } from '../middleware/auth.js';
import { adminSupabase } from '../supabase.js';
import type { AuthenticatedRequest } from '../types.js';

export const aiRouter = Router();
aiRouter.use(requireAuth, allowRoles('student'), requireActive);

const querySchema = z.object({
  query: z.string().trim().min(3).max(2000),
  category: z.string().trim().min(1).max(80).optional(),
});

aiRouter.post('/query', async (req, res) => {
  const input = querySchema.parse(req.body);
  const user = (req as AuthenticatedRequest).authUser;

  if (!config.OPENAI_API_KEY) {
    res.status(503).json({ error: 'The verified knowledge service is not configured.' });
    return;
  }

  // Official-source ingestion and grounded response generation remain disabled
  // until verified CAS documents are supplied and indexed.
  const { data: activeSources, error } = await adminSupabase
    .from('handbook_source_documents')
    .select('id')
    .eq('state', 'active')
    .eq('verification_status', 'verified')
    .limit(1);
  if (error) throw error;
  if (!activeSources?.length) {
    res.status(503).json({ error: 'No verified CAS knowledge source is active.' });
    return;
  }

  const { data: log, error: logError } = await adminSupabase
    .from('ai_query_logs')
    .insert({
      student_id: user.id,
      query_text: input.query,
      category: input.category ?? 'general_inquiry',
      outcome: 'pending',
    })
    .select('id')
    .single();
  if (logError) throw logError;

  res.status(501).json({
    error: 'Verified retrieval is pending official-source ingestion.',
    queryId: log.id,
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
