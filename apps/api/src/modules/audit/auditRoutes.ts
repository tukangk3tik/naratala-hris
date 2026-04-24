import { Router } from 'express';
import { z } from 'zod';
import { PaginationQuery } from '@naratala/shared';
import { validate } from '../../shared/middlewares/validate.js';
import { authorize } from '../../shared/middlewares/authorize.js';
import { makeAuthenticate } from '../../shared/middlewares/authenticate.js';
import type { AuditService } from './auditService.js';
import type { JwtService } from '../auth/jwt.js';

const Query = PaginationQuery.extend({
  action: z.string().max(64).optional(),
  entityType: z.string().max(32).optional(),
  entityId: z.coerce.number().int().positive().optional(),
});

export function createAuditRouter(deps: {
  service: AuditService;
  jwt: JwtService;
}): Router {
  const r = Router();
  const authenticate = makeAuthenticate(deps.jwt);

  r.get(
    '/',
    authenticate,
    authorize('audit:read'),
    validate({ query: Query }),
    async (req, res, next) => {
      try {
        const q = req.valid.query as {
          page: number;
          pageSize: number;
          action?: string;
          entityType?: string;
          entityId?: number;
        };
        const out = await deps.service.list({
          role: req.user!.role,
          page: q.page,
          pageSize: q.pageSize,
          ...(q.action ? { action: q.action } : {}),
          ...(q.entityType ? { entityType: q.entityType } : {}),
          ...(q.entityId ? { entityId: q.entityId } : {}),
        });
        res.json(out);
      } catch (e) {
        next(e);
      }
    },
  );
  return r;
}
