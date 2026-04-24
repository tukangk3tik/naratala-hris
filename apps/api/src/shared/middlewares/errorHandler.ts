import type { ErrorRequestHandler } from 'express';
import { AppError, toHttp } from '../errors/index.js';
import { logger } from '../logger.js';

export function errorHandler(): ErrorRequestHandler {
  return (err, req, res, _next) => {
    const http = toHttp(err);
    if (http.status >= 500) {
      const msg = err instanceof AppError ? 'app error (5xx)' : 'unhandled error';
      logger.error({ err, requestId: (req as any).id, path: req.path }, msg);
    }
    res.status(http.status).json(http.body);
  };
}
