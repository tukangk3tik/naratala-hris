import { Router } from 'express';
import { z } from 'zod';
import { WorkingScheduleUpdate, LeaveQuotaUpsert, LeaveType } from '@naratala/shared';
import { validate } from '../../shared/middlewares/validate.js';
import { authorize } from '../../shared/middlewares/authorize.js';
import { makeAuthenticate } from '../../shared/middlewares/authenticate.js';
import type { WorkingScheduleService } from './workingScheduleService.js';
import type { LeaveQuotaService } from './leaveQuotaService.js';
import type { JwtService } from '../auth/jwt.js';

const IdParam = z.object({ id: z.coerce.number().int().positive() });
const QuotaParams = z.object({
  id: z.coerce.number().int().positive(),
  leaveType: LeaveType,
});
const DefaultBody = z.object({ workingDays: z.number().int().min(0).max(127) }).strict();

export function createWorkingScheduleRouter(deps: {
  schedule: WorkingScheduleService;
  quotas: LeaveQuotaService;
  jwt: JwtService;
}): Router {
  const r = Router();
  const authenticate = makeAuthenticate(deps.jwt);

  r.get('/', authenticate, authorize('absence:configure'), async (_req, res, next) => {
    try {
      res.json(await deps.schedule.snapshot());
    } catch (e) {
      next(e);
    }
  });
  r.patch('/default', authenticate, authorize('absence:configure'), validate({ body: DefaultBody }), async (req, res, next) => {
    try {
      const body = req.valid.body as z.infer<typeof DefaultBody>;
      await deps.schedule.updateDefault(body.workingDays);
      res.json({ ok: true });
    } catch (e) {
      next(e);
    }
  });
  r.patch(
    '/employees/:id',
    authenticate,
    authorize('absence:configure'),
    validate({ params: IdParam, body: WorkingScheduleUpdate }),
    async (req, res, next) => {
      try {
        const id = (req.valid.params as { id: number }).id;
        const body = req.valid.body as z.infer<typeof WorkingScheduleUpdate>;
        await deps.schedule.setEmployeeOverride(id, body.workingDays);
        res.json({ ok: true });
      } catch (e) {
        next(e);
      }
    },
  );

  r.get('/employees/:id/quotas', authenticate, authorize('absence:configure'), validate({ params: IdParam }), async (req, res, next) => {
    try {
      const id = (req.valid.params as { id: number }).id;
      res.json({ data: await deps.quotas.listForEmployee(id) });
    } catch (e) {
      next(e);
    }
  });
  r.put(
    '/employees/:id/quotas/:leaveType',
    authenticate,
    authorize('absence:configure'),
    validate({ params: QuotaParams, body: LeaveQuotaUpsert }),
    async (req, res, next) => {
      try {
        const p = req.valid.params as z.infer<typeof QuotaParams>;
        const body = req.valid.body as z.infer<typeof LeaveQuotaUpsert>;
        res.json(await deps.quotas.upsertOverride(p.id, p.leaveType, body.daysPerYear));
      } catch (e) {
        next(e);
      }
    },
  );
  r.delete(
    '/employees/:id/quotas/:leaveType',
    authenticate,
    authorize('absence:configure'),
    validate({ params: QuotaParams }),
    async (req, res, next) => {
      try {
        const p = req.valid.params as z.infer<typeof QuotaParams>;
        await deps.quotas.removeOverride(p.id, p.leaveType);
        res.json({ ok: true });
      } catch (e) {
        next(e);
      }
    },
  );

  return r;
}
