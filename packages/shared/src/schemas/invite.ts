import { z } from 'zod';
import { RoleEnum, PasswordSchema } from './common.js';

export const InviteCreateBody = z
  .object({
    employeeId: z.number().int().positive(),
    role: RoleEnum,
  })
  .strict();

export const AcceptInviteBody = z
  .object({
    password: PasswordSchema,
  })
  .strict();

export interface InviteInfoDTO {
  email: string;
  fullName: string;
  expiresAt: string;
}
