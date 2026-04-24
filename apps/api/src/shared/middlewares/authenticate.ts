import type { RequestHandler } from 'express';
import type { JwtService } from '../../modules/auth/jwt.js';
import { AuthError } from '../errors/index.js';
import type { Role } from '@naratala/shared';

declare module 'express-serve-static-core' {
  interface Request {
    user?: { sub: number; role: Role; jti: string };
  }
}

export function makeAuthenticate(jwt: JwtService): RequestHandler {
  return (req, _res, next) => {
    try {
      const header = req.header('authorization') ?? '';
      const [scheme, token] = header.split(' ');
      if (scheme?.toLowerCase() !== 'bearer' || !token) {
        throw new AuthError('TOKEN_EXPIRED', 'missing bearer token');
      }
      const p = jwt.verifyAccess(token);
      req.user = { sub: p.sub, role: p.role, jti: p.jti };
      next();
    } catch (err) {
      next(err);
    }
  };
}
