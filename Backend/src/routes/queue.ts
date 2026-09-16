import { Router } from 'express';
import { z } from 'zod';

import { allowRoles, requireAuth } from '../middleware/auth.js';
import { adminSupabase } from '../supabase.js';
import type { AuthenticatedRequest } from '../types.js';

export const queueRouter = Router();
queueRouter.use(requireAuth);

queueRouter.get('/estimate', async (req, res) => {
  const user = (req as AuthenticatedRequest).authUser;
  if (user.role !== 'student') {
    res.status(403).json({ error: 'Queue estimates are available to students.' });
    return;
  }

  const { data, error } = await adminSupabase.rpc('get_student_queue_estimate', {
    p_student_id: user.id,
  });
  if (error) throw error;
  res.json(data);
});

queueRouter.get('/analytics', allowRoles('staff', 'super_admin'), async (req, res) => {
  const query = z.object({
    windowHours: z.coerce.number().int().min(1).max(24 * 90).default(168),
    category: z.string().min(1).max(80).optional(),
  }).parse(req.query);

  const { data, error } = await adminSupabase.rpc('get_queue_analytics', {
    p_window_hours: query.windowHours,
    p_category: query.category ?? null,
  });
  if (error) throw error;
  res.json(data);
});
