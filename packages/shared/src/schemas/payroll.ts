import { z } from 'zod';
import { IsoDate, DecimalString } from './common.js';

export const PayRunStatus = z.enum(['draft', 'finalized', 'cancelled']);
export type PayRunStatusT = z.infer<typeof PayRunStatus>;

export const PayRunCreate = z
  .object({
    name: z.string().min(1).max(100),
    periodStart: IsoDate,
    periodEnd: IsoDate,
    currency: z.string().length(3).default('IDR'),
    notes: z.string().max(500).optional(),
  })
  .strict()
  .refine((v) => v.periodStart <= v.periodEnd, {
    message: 'periodEnd must be >= periodStart',
    path: ['periodEnd'],
  });

export const PayslipPatch = z
  .object({
    deductionAmount: DecimalString.optional(),
    notes: z.string().max(500).optional(),
  })
  .strict()
  .refine((v) => v.deductionAmount !== undefined || v.notes !== undefined, {
    message: 'at least one field required',
  });

export interface SalarySnapshot {
  amount: string;
  currency: string;
}

export interface PayslipDTO {
  id: number;
  payRunId: number;
  employeeId: number;
  employeeName: string;
  department: string;
  grossAmount: string;
  deductionAmount: string;
  netAmount: string;
  notes: string | null;
  salarySnapshot: SalarySnapshot;
}

export interface PayRunDTO {
  id: number;
  name: string;
  periodStart: string;
  periodEnd: string;
  currency: string;
  status: PayRunStatusT;
  notes: string | null;
  totalGross: string | null;
  totalNet: string | null;
  headcount: number | null;
  createdAt: string;
  finalizedAt: string | null;
}

export interface PayRunDetailDTO extends PayRunDTO {
  payslips: PayslipDTO[];
}

export interface MonthStat {
  month: string;
  total: string;
  headcount: number;
}

export interface DeptStat {
  deptId: number;
  deptName: string;
  total: string;
}

export interface PayrollSummaryDTO {
  months: MonthStat[];
  deptBreakdown: DeptStat[];
}
