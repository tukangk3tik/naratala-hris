import { Router } from 'express';
import { z } from 'zod';
import { DepartmentCreate, DepartmentUpdate } from '@naratala/shared';
import { validate } from '../../shared/middlewares/validate.js';
import { authorize } from '../../shared/middlewares/authorize.js';
import { makeAuthenticate } from '../../shared/middlewares/authenticate.js';
import type { DepartmentService } from './departmentService.js';
import type { JwtService } from '../auth/jwt.js';

const IdParam = z.object({ id: z.coerce.number().int().positive() });

export function createDepartmentRouter(deps: {
  service: DepartmentService;
  jwt: JwtService;
}): Router {
  const r = Router();
  const authenticate = makeAuthenticate(deps.jwt);

  r.get('/', authenticate, async (_req, res, next) => {
    try {
      res.json({ data: await deps.service.list() });
    } catch (e) {
      next(e);
    }
  });

  r.post(
    '/',
    authenticate,
    authorize('departments:manage'),
    validate({ body: DepartmentCreate }),
    async (req, res, next) => {
      try {
        const body = req.valid.body as { name: string };
        res.status(201).json(await deps.service.create(body.name));
      } catch (e) {
        next(e);
      }
    },
  );

  r.patch(
    '/:id',
    authenticate,
    authorize('departments:manage'),
    validate({ params: IdParam, body: DepartmentUpdate }),
    async (req, res, next) => {
      try {
        const params = req.valid.params as { id: number };
        const body = req.valid.body as { name?: string };
        if (!body.name) return res.json({ ok: true });
        return res.json(await deps.service.update(params.id, body.name));
      } catch (e) {
        next(e);
      }
    },
  );

  r.delete(
    '/:id',
    authenticate,
    authorize('departments:manage'),
    validate({ params: IdParam }),
    async (req, res, next) => {
      try {
        const params = req.valid.params as { id: number };
        await deps.service.remove(params.id);
        res.json({ ok: true });
      } catch (e) {
        next(e);
      }
    },
  );

  return r;
}
