import { Router } from 'express';
import { z } from 'zod';

import { config } from '../config.js';
import { allowRoles, requireActive, requireAuth } from '../middleware/auth.js';

export const notificationsRouter = Router();
notificationsRouter.use(requireAuth, allowRoles('staff', 'super_admin'), requireActive);

notificationsRouter.post('/send', async (req, res) => {
  const input = z.object({
    eventId: z.uuid(),
    eventType: z.enum(['ticket', 'announcement', 'spatial_log']),
  }).parse(req.body);

  if (!config.EXPO_ACCESS_TOKEN) {
    res.status(503).json({ error: 'The trusted notification sender is not configured.' });
    return;
  }

  // Recipient isolation and delivery are performed by the database-backed
  // notification worker introduced with the notification schema phase.
  res.status(202).json({ accepted: true, ...input });
});
