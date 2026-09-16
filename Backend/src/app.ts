import cors from 'cors';
import express from 'express';
import { rateLimit } from 'express-rate-limit';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';

import { config } from './config.js';
import { errorHandler, notFound } from './middleware/errors.js';
import { aiRouter } from './routes/ai.js';
import { healthRouter } from './routes/health.js';
import { notificationsRouter } from './routes/notifications.js';
import { queueRouter } from './routes/queue.js';

export const app = express();

app.disable('x-powered-by');
app.use(helmet());
app.use(cors({
  origin(origin, callback) {
    if (!origin || config.allowedOrigins.includes(origin)) callback(null, true);
    else callback(new Error('Origin not allowed'));
  },
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['authorization', 'content-type'],
}));
app.use(express.json({ limit: '1mb' }));
app.use((_req, res, next) => {
  res.setTimeout(config.REQUEST_TIMEOUT_MS, () => {
    if (!res.headersSent) {
      res.status(504).json({ error: 'The request timed out.' });
    }
  });
  next();
});
app.use(pinoHttp({
  redact: ['req.headers.authorization', 'req.body.password', 'req.body.token'],
  customProps: req => ({ requestId: req.id }),
}));
app.use(rateLimit({
  windowMs: 60_000,
  limit: 120,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
}));

app.use('/api/health', healthRouter);
app.use('/api/ai', aiRouter);
app.use('/api/queue', queueRouter);
app.use('/api/notifications', notificationsRouter);
app.use(notFound);
app.use(errorHandler);
