export const ERROR_CODES = [
  'INVALID_CREDENTIALS',
  'MFA_REQUIRED',
  'MFA_INVALID',
  'TOKEN_EXPIRED',
  'TOKEN_REUSED',
  'INSUFFICIENT_ROLE',
  'NOT_FOUND',
  'VALIDATION_FAILED',
  'RATE_LIMITED',
  'EMAIL_TAKEN',
  'INVITE_EXPIRED',
  'INVITE_ALREADY_ACCEPTED',
  'PASSWORD_TOO_WEAK',
  'PASSWORD_PWNED',
  'MUST_CHANGE_PASSWORD',
  'INTERNAL_ERROR',
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

export interface ApiErrorBody {
  code: ErrorCode;
  message: string;
  details?: unknown;
}
