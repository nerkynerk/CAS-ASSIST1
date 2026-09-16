import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';

export const notFound: RequestHandler = (_req, res) => {
  res.status(404).json({ error: 'Endpoint not found.' });
};

export const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
  if (error instanceof ZodError) {
    res.status(400).json({
      error: 'The request is invalid.',
      fields: error.issues.map(issue => issue.path.join('.')).filter(Boolean),
    });
    return;
  }

  req.log?.error({ err: error instanceof Error ? error : undefined }, 'request failed');
  res.status(500).json({ error: 'The service could not complete the request.' });
};
