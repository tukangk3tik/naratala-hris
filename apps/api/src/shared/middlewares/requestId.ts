import type { RequestHandler } from 'express';
import { randomUUID } from 'node:crypto';

const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

declare module 'express-serve-static-core' {
  interface Request {
    id: string;
  }
}

export function requestId(): RequestHandler {
  return (req, res, next) => {
    const header = req.header('X-Request-Id');
    req.id = header && UUID_RE.test(header) ? header : randomUUID();
    res.setHeader('X-Request-Id', req.id);
    next();
  };
}
