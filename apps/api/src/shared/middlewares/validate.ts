import type { RequestHandler } from 'express';
import type { ZodTypeAny } from 'zod';
import { ValidationError } from '../errors/index.js';

interface Spec {
  body?: ZodTypeAny;
  query?: ZodTypeAny;
  params?: ZodTypeAny;
}

declare module 'express-serve-static-core' {
  interface Request {
    valid: { body?: unknown; query?: unknown; params?: unknown };
  }
}

export function validate(spec: Spec): RequestHandler {
  return (req, _res, next) => {
    req.valid = req.valid ?? {};
    try {
      if (spec.body) {
        const r = spec.body.safeParse(req.body);
        if (!r.success)
          throw new ValidationError('invalid request body', { issues: r.error.issues });
        req.valid.body = r.data;
      }
      if (spec.query) {
        const r = spec.query.safeParse(req.query);
        if (!r.success) throw new ValidationError('invalid query', { issues: r.error.issues });
        req.valid.query = r.data;
      }
      if (spec.params) {
        const r = spec.params.safeParse(req.params);
        if (!r.success)
          throw new ValidationError('invalid path params', { issues: r.error.issues });
        req.valid.params = r.data;
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}
