import { z } from 'zod';
import { IsoDate } from './common.js';

export const LeaveType = z.enum(['vacation', 'sick', 'personal', 'bereavement', 'parental', 'unpaid']);
export type LeaveTypeT = z.infer<typeof LeaveType>;

export const LeaveStatus = z.enum(['pending', 'approved', 'declined', 'cancelled']);
export type LeaveStatusT = z.infer<typeof LeaveStatus>;

export const LeaveRequestCreate = z
  .object({
    employeeId: z.number().int().positive().optional(),
    leaveType: LeaveType,
    fromDate: IsoDate,
    toDate: IsoDate,
    reason: z.string().max(500).optional(),
  })
  .strict()
  .refine((v) => v.fromDate <= v.toDate, {
    message: 'toDate must be ≥ fromDate',
    path: ['toDate'],
  });

export const LeaveDecisionBody = z
  .object({ note: z.string().max(500).optional() })
  .strict();

export const HolidayCreate = z
  .object({
    date: IsoDate,
    label: z.string().min(1).max(120),
    recurringAnnually: z.boolean().optional().default(false),
  })
  .strict();

export const HolidayUpdate = HolidayCreate.partial();

export const LeavePolicyUpdate = z
  .object({
    defaultDaysPerYear: z.number().nonnegative().max(366).optional(),
    isPaid: z.boolean().optional(),
    affectsBalance: z.boolean().optional(),
  })
  .strict();

export const LeaveQuotaUpsert = z
  .object({ daysPerYear: z.number().nonnegative().max(366) })
  .strict();

export const WorkingScheduleUpdate = z
  .object({
    workingDays: z.number().int().min(0).max(127).nullable(),
  })
  .strict();

export interface LeaveRequestDTO {
  id: number;
  employeeId: number;
  employeeName: string;
  actorUserId: number;
  leaveType: LeaveTypeT;
  fromDate: string;
  toDate: string;
  days: string;
  reason: string | null;
  status: LeaveStatusT;
  decidedByUserId: number | null;
  decidedAt: string | null;
  decisionNote: string | null;
  cancelledByUserId: number | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BalanceDTO {
  leaveType: LeaveTypeT;
  quota: string;
  used: string;
  pending: string;
  available: string;
}

export interface HolidayDTO {
  id: number;
  date: string;
  label: string;
  recurringAnnually: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LeavePolicyDTO {
  id: number;
  leaveType: LeaveTypeT;
  defaultDaysPerYear: string;
  isPaid: boolean;
  affectsBalance: boolean;
}
