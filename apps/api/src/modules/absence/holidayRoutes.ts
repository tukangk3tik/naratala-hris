import { Router } from 'express';
import { z } from 'zod';
import { HolidayCreate, HolidayUpdate } from '@naratala/shared';
import { validate } from '../../shared/middlewares/validate.js';
import { authorize } from '../../shared/middlewares/authorize.js';
import { makeAuthenticate } from '../../shared/middlewares/authenticate.js';
import type { HolidayService } from './holidayService.js';
import type { JwtService } from '../auth/jwt.js';

const IdParam = z.object({ id: z.coerce.number().int().positive() });
const YearQuery = z.object({ year: z.coerce.number().int().min(2020).max(2100).default(new Date().getUTCFullYear()) });

export function createHolidayRouter(deps: { service: HolidayService; jwt: JwtService }): Router {
  const r = Router();
  const authenticate = makeAuthenticate(deps.jwt);
  r.get('/', authenticate, validate({ query: YearQuery }), async (req, res, next) => {
    try {
      res.json({ data: await deps.service.list((req.valid.query as { year: number }).year) });
    } catch (e) {
      next(e);
    }
  });
  r.post('/', authenticate, authorize('absence:configure'), validate({ body: HolidayCreate }), async (req, res, next) => {
    try {
      res.status(201).json(await deps.service.create(req.valid.body as z.infer<typeof HolidayCreate>));
    } catch (e) {
      next(e);
    }
  });
  r.patch(
    '/:id',
    authenticate,
    authorize('absence:configure'),
    validate({ params: IdParam, body: HolidayUpdate }),
    async (req, res, next) => {
      try {
        const id = (req.valid.params as { id: number }).id;
        res.json(await deps.service.update(id, req.valid.body as Record<string, unknown>));
      } catch (e) {
        next(e);
      }
    },
  );
  r.delete('/:id', authenticate, authorize('absence:configure'), validate({ params: IdParam }), async (req, res, next) => {
    try {
      const id = (req.valid.params as { id: number }).id;
      await deps.service.remove(id);
      res.json({ ok: true });
    } catch (e) {
      next(e);
    }
  });
  return r;
}
