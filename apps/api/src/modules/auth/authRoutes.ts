import { Router } from 'express';
import { LoginBody, MfaVerifyBody } from '@naratala/shared';
import { validate } from '../../shared/middlewares/validate.js';
import { limiters } from '../../shared/middlewares/rateLimit.js';
import type { AuthService } from './authService.js';
import { setRefreshCookie, clearRefreshCookie } from './authService.js';
import { toUserDTO } from './userDto.js';
import { AuthError } from '../../shared/errors/index.js';
import { makeAuthenticate } from '../../shared/middlewares/authenticate.js';
import type { JwtService } from './jwt.js';

export function createAuthRouter(deps: { service: AuthService; jwt: JwtService }): Router {
  const r = Router();
  const authenticate = makeAuthenticate(deps.jwt);

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
        if (result.kind === 'mfa')
          return res.json({ mfaRequired: true, mfaToken: result.mfaToken });
        setRefreshCookie(res, result.refreshToken, result.refreshExpiresAt);
        return res.json({ accessToken: result.accessToken, user: toUserDTO(result.user) });
      } catch (err) {
        next(err);
      }
    },
  );

  r.post('/mfa/verify', validate({ body: MfaVerifyBody }), async (req, res, next) => {
    try {
      const header = req.header('authorization') ?? '';
      const [scheme, token] = header.split(' ');
      if (scheme?.toLowerCase() !== 'bearer' || !token)
        throw new AuthError('MFA_INVALID', 'missing mfa token');
      const body = req.valid.body as { code: string };
      const out = await deps.service.verifyMfa({
        mfaToken: token,
        code: body.code,
        ip: req.ip ?? 'unknown',
        userAgent: req.header('user-agent') ?? undefined,
      });
      setRefreshCookie(res, out.refreshToken, out.refreshExpiresAt);
      return res.json({ accessToken: out.accessToken, user: toUserDTO(out.user) });
    } catch (err) {
      next(err);
    }
  });

  r.post('/refresh', limiters.refresh(), async (req, res, next) => {
    try {
      const rt = (req as { cookies?: { rt?: string } }).cookies?.rt;
      if (!rt) throw new AuthError('TOKEN_EXPIRED', 'missing refresh cookie');
      const out = await deps.service.refreshSession({
        rawToken: rt,
        ip: req.ip ?? 'unknown',
        userAgent: req.header('user-agent') ?? undefined,
      });
      setRefreshCookie(res, out.refreshToken, out.refreshExpiresAt);
      return res.json({ accessToken: out.accessToken, user: toUserDTO(out.user) });
    } catch (err) {
      next(err);
    }
  });

  r.post('/logout', async (req, res, next) => {
    try {
      const rt = (req as { cookies?: { rt?: string } }).cookies?.rt;
      await deps.service.logout({ rawToken: rt });
      clearRefreshCookie(res);
      return res.status(204).end();
    } catch (err) {
      next(err);
    }
  });

  r.get('/me', authenticate, async (req, res, next) => {
    try {
      const user = await deps.service.getMe(req.user!.sub);
      return res.json({ user: toUserDTO(user) });
    } catch (err) {
      next(err);
    }
  });

  return r;
}
