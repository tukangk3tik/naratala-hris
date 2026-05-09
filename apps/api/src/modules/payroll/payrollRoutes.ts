import { Router, type Request } from 'express';
import { z } from 'zod';
import { PayRunCreate, PayslipPatch } from '@naratala/shared';
import { validate } from '../../shared/middlewares/validate.js';
import { authorize } from '../../shared/middlewares/authorize.js';
import { makeAuthenticate } from '../../shared/middlewares/authenticate.js';
import type { PayrollRunService } from './payrollRunService.js';
import type { JwtService } from '../auth/jwt.js';
import type { EmployeeRepo } from '../employees/employeeRepo.js';

const IdParam = z.object({ id: z.coerce.number().int().positive() });
const PayslipIdParam = z.object({
  id: z.coerce.number().int().positive(),
  payslipId: z.coerce.number().int().positive(),
});
const ListQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  status: z.enum(['draft', 'finalized', 'cancelled']).optional(),
});
const MeQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

export function createPayrollRouter(deps: {
  service: PayrollRunService;
  employees: EmployeeRepo;
  jwt: JwtService;
}): Router {
  const r = Router();
  const authenticate = makeAuthenticate(deps.jwt);

  function actor(req: Request) {
    return {
      userId: req.user!.sub,
      role: req.user!.role,
      ip: req.ip ?? 'unknown',
    };
  }

  // GET /api/payroll/summary — must come before /:id to avoid route conflict
  r.get('/summary', authenticate, authorize('payroll:read:any'), async (_req, res, next) => {
    try {
      res.json(await deps.service.getSummary());
    } catch (e) { next(e); }
  });

  // GET /api/payroll/me
  r.get(
    '/me',
    authenticate,
    authorize('payroll:read:self'),
    validate({ query: MeQuery }),
    async (req, res, next) => {
      try {
        const { page, pageSize } = req.valid.query as z.infer<typeof MeQuery>;
        const emp = await deps.employees.findByUserId(req.user!.sub);
        if (!emp) return res.json({ data: [], total: 0 });
        const data = await deps.service.getMyPayslips(emp.id, page, pageSize);
        return res.json({ data, page, pageSize });
      } catch (e) { next(e); }
    },
  );

  // GET /api/payroll/runs
  r.get(
    '/runs',
    authenticate,
    authorize('payroll:read:any'),
    validate({ query: ListQuery }),
    async (req, res, next) => {
      try {
        const q = req.valid.query as z.infer<typeof ListQuery>;
        res.json(await deps.service.list({
          page: q.page,
          pageSize: q.pageSize,
          ...(q.status !== undefined ? { status: q.status } : {}),
        }));
      } catch (e) { next(e); }
    },
  );

  // POST /api/payroll/runs
  r.post(
    '/runs',
    authenticate,
    authorize('payroll:manage'),
    validate({ body: PayRunCreate }),
    async (req, res, next) => {
      try {
        const b = req.valid.body as z.infer<typeof PayRunCreate>;
        const run = await deps.service.create(actor(req), {
          name: b.name,
          periodStart: b.periodStart,
          periodEnd: b.periodEnd,
          currency: b.currency,
          ...(b.notes !== undefined ? { notes: b.notes } : {}),
        });
        res.status(201).json(run);
      } catch (e) { next(e); }
    },
  );

  // GET /api/payroll/runs/:id
  r.get(
    '/runs/:id',
    authenticate,
    authorize('payroll:read:any'),
    validate({ params: IdParam }),
    async (req, res, next) => {
      try {
        const { id } = req.valid.params as { id: number };
        res.json(await deps.service.getDetail(id));
      } catch (e) { next(e); }
    },
  );

  // POST /api/payroll/runs/:id/finalize
  r.post(
    '/runs/:id/finalize',
    authenticate,
    authorize('payroll:manage'),
    validate({ params: IdParam }),
    async (req, res, next) => {
      try {
        const { id } = req.valid.params as { id: number };
        res.json(await deps.service.finalize(actor(req), id));
      } catch (e) { next(e); }
    },
  );

  // DELETE /api/payroll/runs/:id (cancel)
  r.delete(
    '/runs/:id',
    authenticate,
    authorize('payroll:manage'),
    validate({ params: IdParam }),
    async (req, res, next) => {
      try {
        const { id } = req.valid.params as { id: number };
        await deps.service.cancel(actor(req), id);
        res.status(204).send();
      } catch (e) { next(e); }
    },
  );

  // PATCH /api/payroll/runs/:id/payslips/:payslipId
  r.patch(
    '/runs/:id/payslips/:payslipId',
    authenticate,
    authorize('payroll:manage'),
    validate({ params: PayslipIdParam, body: PayslipPatch }),
    async (req, res, next) => {
      try {
        const { payslipId } = req.valid.params as { id: number; payslipId: number };
        const b = req.valid.body as z.infer<typeof PayslipPatch>;
        res.json(await deps.service.adjustPayslip(actor(req), payslipId, {
          ...(b.deductionAmount !== undefined ? { deductionAmount: b.deductionAmount } : {}),
          ...(b.notes !== undefined ? { notes: b.notes } : {}),
        }));
      } catch (e) { next(e); }
    },
  );

  return r;
}
