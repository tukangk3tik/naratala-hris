import { z } from 'zod';
import { EmailSchema, PasswordSchema } from './common.js';

export const LoginBody = z
  .object({
    email: EmailSchema,
    password: z.string().min(1).max(200),
  })
  .strict();

export const MfaVerifyBody = z
  .object({
    code: z.string().regex(/^\d{6}$/),
  })
  .strict();

export const PasswordForgotBody = z.object({ email: EmailSchema }).strict();

export const PasswordResetBody = z
  .object({
    token: z.string().min(10),
    newPassword: PasswordSchema,
  })
  .strict();

export const PasswordChangeBody = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: PasswordSchema,
  })
  .strict();

export const MfaSetupConfirmBody = z
  .object({
    code: z.string().regex(/^\d{6}$/),
  })
  .strict();

export const MfaDisableBody = z
  .object({
    currentPassword: z.string().min(1),
    code: z.string().regex(/^\d{6}$/),
  })
  .strict();
