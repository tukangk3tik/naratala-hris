import { Router } from 'express';
import { z } from 'zod';
import { InviteCreateBody, AcceptInviteBody, type Role } from '@naratala/shared';
import { validate } from '../../shared/middlewares/validate.js';
import { authorize } from '../../shared/middlewares/authorize.js';
import { makeAuthenticate } from '../../shared/middlewares/authenticate.js';
import { setRefreshCookie } from '../auth/authService.js';
import { toUserDTO } from '../auth/userDto.js';
import type { InviteService } from './inviteService.js';
import type { JwtService } from '../auth/jwt.js';

const IdParam = z.object({ id: z.coerce.number().int().positive() });
const TokenParam = z.object({ token: z.string().min(10).max(100) });

export function createInviteRouter(deps: {
  service: InviteService;
  jwt: JwtService;
}): Router {
  const r = Router();
  const authenticate = makeAuthenticate(deps.jwt);

  r.post(
    '/',
    authenticate,
    authorize('invites:manage'),
    validate({ body: InviteCreateBody }),
    async (req, res, next) => {
      try {
        const body = req.valid.body as { employeeId: number; role: Role };
        const out = await deps.service.issue(req.user!.sub, body.employeeId, body.role);
        return res.status(201).json({ id: out.id, expiresAt: out.expiresAt.toISOString() });
      } catch (err) {
        next(err);
      }
    },
  );

  r.get('/:token', validate({ params: TokenParam }), async (req, res, next) => {
    try {
      const params = req.valid.params as { token: string };
      const out = await deps.service.view(params.token);
      return res.json(out);
    } catch (err) {
      next(err);
    }
  });

  r.post(
    '/:token/accept',
    validate({ params: TokenParam, body: AcceptInviteBody }),
    async (req, res, next) => {
      try {
        const params = req.valid.params as { token: string };
        const body = req.valid.body as { password: string };
        const ua = req.header('user-agent');
        const ip = req.ip ?? 'unknown';
        const result = ua
          ? await deps.service.accept(params.token, body.password, ip, ua)
          : await deps.service.accept(params.token, body.password, ip);
        setRefreshCookie(res, result.refreshToken, result.refreshExpiresAt);
        return res.json({ accessToken: result.accessToken, user: toUserDTO(result.user) });
      } catch (err) {
        next(err);
      }
    },
  );

  r.post(
    '/:id/resend',
    authenticate,
    authorize('invites:manage'),
    validate({ params: IdParam }),
    async (req, res, next) => {
      try {
        const params = req.valid.params as { id: number };
        const out = await deps.service.resend(params.id);
        return res.json({ id: out.id, expiresAt: out.expiresAt.toISOString() });
      } catch (err) {
        next(err);
      }
    },
  );

  r.delete(
    '/:id',
    authenticate,
    authorize('invites:manage'),
    validate({ params: IdParam }),
    async (req, res, next) => {
      try {
        const params = req.valid.params as { id: number };
        await deps.service.remove(params.id);
        return res.json({ ok: true });
      } catch (err) {
        next(err);
      }
    },
  );

  return r;
}
