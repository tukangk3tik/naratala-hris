import { Router } from 'express';
import { z } from 'zod';
import {
  UserUpdate,
  PaginationQuery,
  type Role,
} from '@naratala/shared';
import { validate } from '../../shared/middlewares/validate.js';
import { authorize } from '../../shared/middlewares/authorize.js';
import { makeAuthenticate } from '../../shared/middlewares/authenticate.js';
import type { UserService } from './userService.js';
import type { JwtService } from '../auth/jwt.js';
import type { UserStatus } from '../auth/userRepo.js';

const IdParam = z.object({ id: z.coerce.number().int().positive() });

export function createUserRouter(deps: { service: UserService; jwt: JwtService }): Router {
  const r = Router();
  const authenticate = makeAuthenticate(deps.jwt);

  r.get(
    '/',
    authenticate,
    authorize('users:read'),
    validate({ query: PaginationQuery }),
    async (req, res, next) => {
      try {
        const q = req.valid.query as { page: number; pageSize: number };
        res.json(await deps.service.list(q.page, q.pageSize));
      } catch (e) {
        next(e);
      }
    },
  );

  r.patch(
    '/:id',
    authenticate,
    authorize('users:write'),
    validate({ params: IdParam, body: UserUpdate }),
    async (req, res, next) => {
      try {
        const params = req.valid.params as { id: number };
        const body = req.valid.body as {
          role?: Role;
          status?: UserStatus;
          language?: 'id' | 'en';
        };
        res.json(await deps.service.patch(req.user!.sub, params.id, body));
      } catch (e) {
        next(e);
      }
    },
  );

  r.post(
    '/:id/force-logout',
    authenticate,
    authorize('users:write'),
    validate({ params: IdParam }),
    async (req, res, next) => {
      try {
        const params = req.valid.params as { id: number };
        await deps.service.forceLogout(params.id);
        res.json({ ok: true });
      } catch (e) {
        next(e);
      }
    },
  );

  return r;
}
