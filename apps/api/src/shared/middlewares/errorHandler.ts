import type { ErrorRequestHandler } from 'express';
import { AppError, toHttp } from '../errors/index.js';
import { logger } from '../logger.js';

export function errorHandler(): ErrorRequestHandler {
  return (err, req, res, _next) => {
    const http = toHttp(err);
    if (!(err instanceof AppError)) {
      logger.error({ err, requestId: (req as any).id, path: req.path }, 'unhandled error');
    } else if (http.status >= 500) {
      logger.error({ err, requestId: (req as any).id, path: req.path }, 'app error (5xx)');
    }
    res.status(http.status).json(http.body);
  };
}
