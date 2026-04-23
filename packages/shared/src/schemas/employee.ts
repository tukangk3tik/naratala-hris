import { z } from 'zod';
import { DecimalString, EmailSchema, IsoDate } from './common.js';

export const EmploymentType = z.enum(['full_time', 'part_time', 'contract', 'intern']);
export const EmploymentStatus = z.enum(['active', 'on_leave', 'terminated']);

export const EmployeeCreate = z
  .object({
    fullName: z.string().min(1).max(160),
    email: EmailSchema,
    phone: z.string().max(32).optional(),
    pronouns: z.string().max(32).optional(),
    departmentId: z.number().int().positive(),
    position: z.string().min(1).max(120),
    location: z.string().max(120).optional(),
    employmentType: EmploymentType,
    hireDate: IsoDate,
    managerId: z.number().int().positive().nullable().optional(),
    salaryAmount: DecimalString.optional(),
    salaryCurrency: z.string().length(3).default('IDR'),
  })
  .strict();

export const EmployeeUpdate = z
  .object({
    fullName: z.string().min(1).max(160).optional(),
    email: EmailSchema.optional(),
    phone: z.string().max(32).nullable().optional(),
    pronouns: z.string().max(32).nullable().optional(),
    departmentId: z.number().int().positive().optional(),
    position: z.string().min(1).max(120).optional(),
    location: z.string().max(120).nullable().optional(),
    employmentType: EmploymentType.optional(),
    employmentStatus: EmploymentStatus.optional(),
    hireDate: IsoDate.optional(),
    managerId: z.number().int().positive().nullable().optional(),
    salaryAmount: DecimalString.nullable().optional(),
    salaryCurrency: z.string().length(3).optional(),
    reason: z.string().max(500).optional(),
  })
  .strict()
  .refine(
    (v) =>
      v.salaryAmount === undefined ||
      (typeof v.reason === 'string' && v.reason.trim().length >= 10),
    { message: 'reason (≥10 chars) is required when changing salaryAmount', path: ['reason'] },
  );

export interface EmployeeDTO {
  id: number;
  userId: number | null;
  fullName: string;
  email: string;
  phone: string | null;
  pronouns: string | null;
  departmentId: number;
  departmentName: string | null;
  position: string;
  location: string | null;
  employmentType: z.infer<typeof EmploymentType>;
  employmentStatus: z.infer<typeof EmploymentStatus>;
  hireDate: string;
  managerId: number | null;
  avatarColorHue: number;
  salaryAmount: string | null;
  salaryCurrency: string;
  createdAt: string;
  updatedAt: string;
}
