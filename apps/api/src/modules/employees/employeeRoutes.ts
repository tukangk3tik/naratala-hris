import { Router } from 'express';
import { z } from 'zod';
import { EmployeeCreate, EmployeeUpdate, PaginationQuery } from '@naratala/shared';
import { validate } from '../../shared/middlewares/validate.js';
import { authorize } from '../../shared/middlewares/authorize.js';
import { makeAuthenticate } from '../../shared/middlewares/authenticate.js';
import type { EmployeeRow } from './employeeRepo.js';
import type { EmployeeService, EmployeeCreateInput } from './employeeService.js';
import type { JwtService } from '../auth/jwt.js';

const IdParam = z.object({ id: z.coerce.number().int().positive() });
const ListQuery = PaginationQuery.extend({
  q: z.string().max(100).optional(),
  department: z.coerce.number().int().positive().optional(),
  status: z.enum(['active', 'on_leave', 'terminated']).optional(),
  sort: z.enum(['name', 'hireDate', 'department']).optional(),
  sortDir: z.enum(['asc', 'desc']).optional(),
});

export function createEmployeeRouter(deps: {
  service: EmployeeService;
  jwt: JwtService;
}): Router {
  const r = Router();
  const authenticate = makeAuthenticate(deps.jwt);

  r.get(
    '/',
    authenticate,
    authorize('employees:read:any'),
    validate({ query: ListQuery }),
    async (req, res, next) => {
      try {
        const q = req.valid.query as {
          q?: string;
          department?: number;
          status?: 'active' | 'on_leave' | 'terminated';
          page: number;
          pageSize: number;
          sort?: 'name' | 'hireDate' | 'department';
          sortDir?: 'asc' | 'desc';
        };
        const filters = {
          page: q.page,
          pageSize: q.pageSize,
          ...(q.q ? { q: q.q } : {}),
          ...(q.department ? { departmentId: q.department } : {}),
          ...(q.status ? { status: q.status } : {}),
          ...(q.sort ? { sort: q.sort } : {}),
          ...(q.sortDir ? { sortDir: q.sortDir } : {}),
        };
        const result = await deps.service.list(
          { userId: req.user!.sub, role: req.user!.role, ip: req.ip ?? 'unknown' },
          filters,
        );
        res.json(result);
      } catch (e) {
        next(e);
      }
    },
  );

  r.get(
    '/:id',
    authenticate,
    authorize('employees:read:any'),
    validate({ params: IdParam }),
    async (req, res, next) => {
      try {
        const params = req.valid.params as { id: number };
        const out = await deps.service.detail(
          { userId: req.user!.sub, role: req.user!.role, ip: req.ip ?? 'unknown' },
          params.id,
        );
        res.json(out);
      } catch (e) {
        next(e);
      }
    },
  );

  r.post(
    '/',
    authenticate,
    authorize('employees:write:any'),
    validate({ body: EmployeeCreate }),
    async (req, res, next) => {
      try {
        const body = req.valid.body as EmployeeCreateInput;
        const out = await deps.service.create(
          { userId: req.user!.sub, role: req.user!.role, ip: req.ip ?? 'unknown' },
          body,
        );
        res.status(201).json(out);
      } catch (e) {
        next(e);
      }
    },
  );

  r.patch(
    '/:id',
    authenticate,
    authorize('employees:write:any'),
    validate({ params: IdParam, body: EmployeeUpdate }),
    async (req, res, next) => {
      try {
        const params = req.valid.params as { id: number };
        const body = req.valid.body as Partial<EmployeeRow> & { reason?: string };
        const out = await deps.service.update(
          { userId: req.user!.sub, role: req.user!.role, ip: req.ip ?? 'unknown' },
          params.id,
          body,
        );
        res.json(out);
      } catch (e) {
        next(e);
      }
    },
  );

  r.delete(
    '/:id',
    authenticate,
    validate({ params: IdParam }),
    async (req, res, next) => {
      try {
        const params = req.valid.params as { id: number };
        await deps.service.remove(
          { userId: req.user!.sub, role: req.user!.role, ip: req.ip ?? 'unknown' },
          params.id,
        );
        res.json({ ok: true });
      } catch (e) {
        next(e);
      }
    },
  );

  return r;
}
