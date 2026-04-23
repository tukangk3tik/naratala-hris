import type { ApiErrorBody, ErrorCode } from '@naratala/shared';

export abstract class AppError extends Error {
  abstract readonly status: number;
  abstract readonly code: ErrorCode;
  constructor(
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = new.target.name;
  }
  toBody(): ApiErrorBody {
    return this.details === undefined
      ? { code: this.code, message: this.message }
      : { code: this.code, message: this.message, details: this.details };
  }
}

export class NotFoundError extends AppError {
  readonly status = 404;
  readonly code: ErrorCode = 'NOT_FOUND';
}

export class ForbiddenError extends AppError {
  readonly status = 403;
  readonly code: ErrorCode = 'INSUFFICIENT_ROLE';
  constructor(message = 'insufficient role') {
    super(message);
  }
}

export class ValidationError extends AppError {
  readonly status = 400;
  readonly code: ErrorCode = 'VALIDATION_FAILED';
}

export class AuthError extends AppError {
  readonly status: number;
  readonly code: ErrorCode;
  constructor(
    code: Extract<
      ErrorCode,
      | 'INVALID_CREDENTIALS'
      | 'MFA_REQUIRED'
      | 'MFA_INVALID'
      | 'TOKEN_EXPIRED'
      | 'TOKEN_REUSED'
      | 'MUST_CHANGE_PASSWORD'
      | 'PASSWORD_TOO_WEAK'
      | 'PASSWORD_PWNED'
      | 'EMAIL_TAKEN'
      | 'INVITE_EXPIRED'
      | 'INVITE_ALREADY_ACCEPTED'
    >,
    message: string,
    details?: unknown,
  ) {
    super(message, details);
    this.code = code;
    this.status =
      code === 'MUST_CHANGE_PASSWORD'
        ? 403
        : code === 'EMAIL_TAKEN' || code === 'PASSWORD_TOO_WEAK' || code === 'PASSWORD_PWNED'
          ? 400
          : code === 'INVITE_EXPIRED' || code === 'INVITE_ALREADY_ACCEPTED'
            ? 410
            : 401;
  }
}

export class RateLimitedError extends AppError {
  readonly status = 429;
  readonly code: ErrorCode = 'RATE_LIMITED';
  constructor(retryAfterSeconds: number) {
    super('rate limit exceeded', { retryAfter: retryAfterSeconds });
  }
}

export interface HttpOutput {
  status: number;
  body: ApiErrorBody;
}

export function toHttp(err: unknown): HttpOutput {
  if (err instanceof AppError) return { status: err.status, body: err.toBody() };
  return { status: 500, body: { code: 'INTERNAL_ERROR', message: 'internal error' } };
}
