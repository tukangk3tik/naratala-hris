import { Router } from 'express';
import { LoginBody } from '@naratala/shared';
import { validate } from '../../shared/middlewares/validate.js';
import { limiters } from '../../shared/middlewares/rateLimit.js';
import type { AuthService } from './authService.js';
import { setRefreshCookie } from './authService.js';
import { toUserDTO } from './userDto.js';

export function createAuthRouter(deps: { service: AuthService }): Router {
  const r = Router();

  r.post(
    '/login',
    limiters.loginByEmail(),
    limiters.loginByIp(),
    validate({ body: LoginBody }),
    async (req, res, next) => {
      try {
        const body = req.valid.body as { email: string; password: string };
        const result = await deps.service.login({
          email: body.email,
          password: body.password,
          ip: req.ip ?? 'unknown',
          userAgent: req.header('user-agent') ?? undefined,
        });
        if (result.kind === 'mfa') {
          return res.json({ mfaRequired: true, mfaToken: result.mfaToken });
        }
        setRefreshCookie(res, result.refreshToken, result.refreshExpiresAt);
        return res.json({ accessToken: result.accessToken, user: toUserDTO(result.user) });
      } catch (err) {
        next(err);
      }
    },
  );

  return r;
}
