import type { RequestHandler } from 'express';
import { hasPermission, type Permission } from '@naratala/shared';
import { AuthError, ForbiddenError } from '../errors/index.js';

export function authorize(required: Permission | Permission[]): RequestHandler {
  const perms = Array.isArray(required) ? required : [required];
  return (req, _res, next) => {
    if (!req.user) return next(new AuthError('TOKEN_EXPIRED', 'not authenticated'));
    for (const p of perms) {
      if (!hasPermission(req.user.role, p)) return next(new ForbiddenError(`missing ${p}`));
    }
    return next();
  };
}
