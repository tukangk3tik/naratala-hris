import { z } from 'zod';
import { ROLES } from '../permissions.js';

export const RoleEnum = z.enum(ROLES);

export const EmailSchema = z
  .string()
  .email()
  .max(255)
  .transform((s) => s.trim().toLowerCase());

export const PasswordSchema = z.string().min(10).max(200);

export const PaginationQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

export const IsoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'expected YYYY-MM-DD');

export const DecimalString = z.string().regex(/^\d+(\.\d{1,2})?$/, 'expected decimal');
