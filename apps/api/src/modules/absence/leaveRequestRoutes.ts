import { Router, type Request } from 'express';
import { z } from 'zod';
import { LeaveRequestCreate, LeaveDecisionBody } from '@naratala/shared';
import { validate } from '../../shared/middlewares/validate.js';
import { authorize } from '../../shared/middlewares/authorize.js';
import { makeAuthenticate } from '../../shared/middlewares/authenticate.js';
import type { LeaveRequestService } from './leaveRequestService.js';
import type { BalanceService } from './balanceService.js';
import type { JwtService } from '../auth/jwt.js';
import type { EmployeeRepo } from '../employees/employeeRepo.js';

const IdParam = z.object({ id: z.coerce.number().int().positive() });
const ListQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  status: z.enum(['pending', 'approved', 'declined', 'cancelled']).optional(),
  employeeId: z.coerce.number().int().positive().optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});
const BalanceQuery = z.object({
  employeeId: z.coerce.number().int().positive().optional(),
  year: z.coerce.number().int().min(2020).max(2100).default(new Date().getUTCFullYear()),
});

export function createLeaveRequestRouter(deps: {
  service: LeaveRequestService;
  balances: BalanceService;
  employees: EmployeeRepo;
  jwt: JwtService;
}): Router {
  const r = Router();
  const authenticate = makeAuthenticate(deps.jwt);

  async function actorOf(req: Request) {
    const userId = req.user!.sub;
    const role = req.user!.role;
    const emp = await deps.employees.findByUserId(userId);
    return { userId, role, employeeId: emp?.id ?? null, ip: req.ip ?? 'unknown' };
  }

  r.get(
    '/',
    authenticate,
    authorize('absence:read:self'),
    validate({ query: ListQuery }),
    async (req, res, next) => {
      try {
        const actor = await actorOf(req);
        const q = req.valid.query as z.infer<typeof ListQuery>;
        res.json(await deps.service.list(actor, {
          page: q.page,
          pageSize: q.pageSize,
          ...(q.status !== undefined ? { status: q.status } : {}),
          ...(q.employeeId !== undefined ? { employeeId: q.employeeId } : {}),
          ...(q.from !== undefined ? { from: q.from } : {}),
          ...(q.to !== undefined ? { to: q.to } : {}),
        }));
      } catch (e) {
        next(e);
      }
    },
  );

  r.get(
    '/balances',
    authenticate,
    authorize('absence:read:self'),
    validate({ query: BalanceQuery }),
    async (req, res, next) => {
      try {
        const actor = await actorOf(req);
        const q = req.valid.query as z.infer<typeof BalanceQuery>;
        const target = q.employeeId ?? actor.employeeId;
        if (!target) return res.json({ data: [] });
        res.json({ data: await deps.balances.summary(target, q.year) });
      } catch (e) {
        next(e);
      }
    },
  );

  r.get(
    '/:id',
    authenticate,
    authorize('absence:read:self'),
    validate({ params: IdParam }),
    async (req, res, next) => {
      try {
        const actor = await actorOf(req);
        const id = (req.valid.params as { id: number }).id;
        res.json(await deps.service.detail(actor, id));
      } catch (e) {
        next(e);
      }
    },
  );

  r.post(
    '/',
    authenticate,
    authorize('absence:write:self'),
    validate({ body: LeaveRequestCreate }),
    async (req, res, next) => {
      try {
        const actor = await actorOf(req);
        const body = req.valid.body as z.infer<typeof LeaveRequestCreate>;
        res.status(201).json(await deps.service.submit(actor, {
          leaveType: body.leaveType,
          fromDate: body.fromDate,
          toDate: body.toDate,
          ...(body.reason !== undefined ? { reason: body.reason } : {}),
          ...(body.employeeId !== undefined ? { employeeId: body.employeeId } : {}),
        }));
      } catch (e) {
        next(e);
      }
    },
  );

  r.post(
    '/:id/approve',
    authenticate,
    authorize('absence:approve:reports'),
    validate({ params: IdParam, body: LeaveDecisionBody }),
    async (req, res, next) => {
      try {
        const actor = await actorOf(req);
        const id = (req.valid.params as { id: number }).id;
        const body = req.valid.body as { note?: string };
        res.json(await deps.service.approve(actor, id, body));
      } catch (e) {
        next(e);
      }
    },
  );

  r.post(
    '/:id/decline',
    authenticate,
    authorize('absence:approve:reports'),
    validate({ params: IdParam, body: LeaveDecisionBody }),
    async (req, res, next) => {
      try {
        const actor = await actorOf(req);
        const id = (req.valid.params as { id: number }).id;
        const body = req.valid.body as { note?: string };
        res.json(await deps.service.decline(actor, id, body));
      } catch (e) {
        next(e);
      }
    },
  );

  r.post(
    '/:id/cancel',
    authenticate,
    authorize('absence:read:self'),
    validate({ params: IdParam }),
    async (req, res, next) => {
      try {
        const actor = await actorOf(req);
        const id = (req.valid.params as { id: number }).id;
        res.json(await deps.service.cancel(actor, id));
      } catch (e) {
        next(e);
      }
    },
  );

  return r;
}
