import { Router } from 'express';
import { z } from 'zod';
import { LeavePolicyUpdate } from '@naratala/shared';
import { validate } from '../../shared/middlewares/validate.js';
import { authorize } from '../../shared/middlewares/authorize.js';
import { makeAuthenticate } from '../../shared/middlewares/authenticate.js';
import type { LeavePolicyService } from './leavePolicyService.js';
import type { JwtService } from '../auth/jwt.js';

const IdParam = z.object({ id: z.coerce.number().int().positive() });

export function createLeavePolicyRouter(deps: { service: LeavePolicyService; jwt: JwtService }): Router {
  const r = Router();
  const authenticate = makeAuthenticate(deps.jwt);
  r.get('/', authenticate, async (_req, res, next) => {
    try {
      res.json({ data: await deps.service.list() });
    } catch (e) {
      next(e);
    }
  });
  r.patch(
    '/:id',
    authenticate,
    authorize('absence:configure'),
    validate({ params: IdParam, body: LeavePolicyUpdate }),
    async (req, res, next) => {
      try {
        const id = (req.valid.params as { id: number }).id;
        const b = req.valid.body as z.infer<typeof LeavePolicyUpdate>;
        res.json(await deps.service.update(id, {
          ...(b.defaultDaysPerYear !== undefined ? { defaultDaysPerYear: b.defaultDaysPerYear } : {}),
          ...(b.isPaid !== undefined ? { isPaid: b.isPaid } : {}),
          ...(b.affectsBalance !== undefined ? { affectsBalance: b.affectsBalance } : {}),
        }));
      } catch (e) {
        next(e);
      }
    },
  );
  return r;
}
