import type { DB } from '../../shared/db/client.js';
import type { PayRunRepo } from './payRunRepo.js';
import type { PayslipRepo } from './payslipRepo.js';
import type { EmployeeRepo } from '../employees/employeeRepo.js';
import type { AuditRepo } from '../audit/auditRepo.js';
import { NotFoundError, ValidationError } from '../../shared/errors/index.js';
import type { Role, PayRunDetailDTO, PayRunDTO, PayslipDTO, PayrollSummaryDTO } from '@naratala/shared';
import { employees } from '../../shared/db/schema.js';
import { and, eq, sql } from 'drizzle-orm';

interface Actor {
  userId: number;
  role: Role;
  ip: string;
}

interface CreateInput {
  name: string;
  periodStart: string;
  periodEnd: string;
  currency?: string;
  notes?: string;
}

interface Deps {
  db: DB;
  payRuns: PayRunRepo;
  payslips: PayslipRepo;
  employees: EmployeeRepo;
  audit: AuditRepo;
}

export type PayrollRunService = ReturnType<typeof createPayrollRunService>;

type PayRunRow = NonNullable<Awaited<ReturnType<PayRunRepo['findById']>>>;

function toPayRunDTO(row: PayRunRow): PayRunDTO {
  return {
    id: row.id,
    name: row.name,
    periodStart: row.periodStart,
    periodEnd: row.periodEnd,
    currency: row.currency,
    status: row.status,
    notes: row.notes ?? null,
    totalGross: row.totalGross ?? null,
    totalNet: row.totalNet ?? null,
    headcount: row.headcount ?? null,
    createdAt: row.createdAt?.toISOString() ?? new Date().toISOString(),
    finalizedAt: row.finalizedAt?.toISOString() ?? null,
  };
}

type PayslipJoinRow = Awaited<ReturnType<PayslipRepo['findByRunId']>>[number];

function toPayslipDTO(row: PayslipJoinRow): PayslipDTO {
  return {
    id: row.id,
    payRunId: row.payRunId,
    employeeId: row.employeeId,
    employeeName: row.employeeName,
    department: row.department,
    grossAmount: row.grossAmount,
    deductionAmount: row.deductionAmount,
    netAmount: row.netAmount,
    notes: row.notes ?? null,
    salarySnapshot: row.salarySnapshot as { amount: string; currency: string },
  };
}

export function createPayrollRunService(deps: Deps) {
  async function create(actor: Actor, input: CreateInput): Promise<PayRunDetailDTO> {
    const run = await deps.payRuns.insert({
      name: input.name,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      currency: input.currency ?? 'IDR',
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
      createdByUserId: actor.userId,
    });

    const activeEmps = await deps.db
      .select({
        id: employees.id,
        salaryAmount: employees.salaryAmount,
        salaryCurrency: employees.salaryCurrency,
      })
      .from(employees)
      .where(and(eq(employees.employmentStatus, 'active'), sql`${employees.salaryAmount} IS NOT NULL`));

    const slipRows = activeEmps.map((emp) => {
      const gross = (parseFloat(emp.salaryAmount!) / 12).toFixed(2);
      return {
        payRunId: run.id,
        employeeId: emp.id,
        grossAmount: gross,
        deductionAmount: '0.00',
        netAmount: gross,
        salarySnapshot: { amount: emp.salaryAmount!, currency: emp.salaryCurrency },
      };
    });

    await deps.payslips.insertMany(slipRows);

    await deps.audit.write({
      actorUserId: actor.userId,
      actorIp: actor.ip,
      action: 'payroll_run.create',
      entityType: 'pay_run',
      entityId: run.id,
      changes: { name: input.name },
    });

    const detailSlips = await deps.payslips.findByRunId(run.id);
    return { ...toPayRunDTO(run), payslips: detailSlips.map(toPayslipDTO) };
  }

  async function getDetail(id: number): Promise<PayRunDetailDTO> {
    const run = await deps.payRuns.findById(id);
    if (!run) throw new NotFoundError(`pay run ${id} not found`);
    const slips = await deps.payslips.findByRunId(id);
    return { ...toPayRunDTO(run), payslips: slips.map(toPayslipDTO) };
  }

  async function finalize(actor: Actor, id: number): Promise<PayRunDTO> {
    const run = await deps.payRuns.findById(id);
    if (!run) throw new NotFoundError(`pay run ${id} not found`);
    if (run.status !== 'draft') {
      throw new ValidationError(`pay run is already ${run.status}`);
    }

    const slips = await deps.payslips.findByRunId(id);
    const totalGross = slips.reduce((s, p) => s + parseFloat(p.grossAmount), 0).toFixed(2);
    const totalNet = slips.reduce((s, p) => s + parseFloat(p.netAmount), 0).toFixed(2);

    const updated = await deps.payRuns.update(id, {
      status: 'finalized',
      totalGross,
      totalNet,
      headcount: slips.length,
      finalizedByUserId: actor.userId,
      finalizedAt: new Date(),
    });

    await deps.audit.write({
      actorUserId: actor.userId,
      actorIp: actor.ip,
      action: 'payroll_run.finalize',
      entityType: 'pay_run',
      entityId: id,
      changes: { totalGross, totalNet, headcount: slips.length },
    });

    return toPayRunDTO(updated);
  }

  async function cancel(actor: Actor, id: number): Promise<void> {
    const run = await deps.payRuns.findById(id);
    if (!run) throw new NotFoundError(`pay run ${id} not found`);
    if (run.status !== 'draft') {
      throw new ValidationError(`cannot cancel a ${run.status} run`);
    }

    await deps.payslips.deleteByRunId(id);
    await deps.payRuns.update(id, { status: 'cancelled' });

    await deps.audit.write({
      actorUserId: actor.userId,
      actorIp: actor.ip,
      action: 'payroll_run.cancel',
      entityType: 'pay_run',
      entityId: id,
      changes: {},
    });
  }

  async function adjustPayslip(
    actor: Actor,
    payslipId: number,
    patch: { deductionAmount?: string; notes?: string },
  ) {
    const slip = await deps.payslips.findById(payslipId);
    if (!slip) throw new NotFoundError(`payslip ${payslipId} not found`);

    const run = await deps.payRuns.findById(slip.payRunId);
    if (!run) throw new NotFoundError(`pay run not found`);
    if (run.status !== 'draft') {
      throw new ValidationError('cannot adjust payslip of a non-draft run');
    }

    const deduction = patch.deductionAmount ?? slip.deductionAmount;
    const net = (parseFloat(slip.grossAmount) - parseFloat(deduction)).toFixed(2);

    const updated = await deps.payslips.update(payslipId, {
      ...(patch.deductionAmount !== undefined ? { deductionAmount: patch.deductionAmount } : {}),
      ...(patch.notes !== undefined ? { notes: patch.notes } : {}),
      netAmount: net,
    });

    await deps.audit.write({
      actorUserId: actor.userId,
      actorIp: actor.ip,
      action: 'payroll_run.adjust',
      entityType: 'payslip',
      entityId: payslipId,
      changes: {
        ...(patch.deductionAmount !== undefined ? { deductionAmount: patch.deductionAmount } : {}),
        net,
      },
    });

    return updated;
  }

  async function list(filters: { status?: 'draft' | 'finalized' | 'cancelled'; page: number; pageSize: number }) {
    const result = await deps.payRuns.list(filters);
    return { data: result.data.map(toPayRunDTO), total: result.total };
  }

  async function getMyPayslips(employeeId: number, page: number, pageSize: number) {
    return deps.payslips.findByEmployeeId(employeeId, page, pageSize);
  }

  async function getSummary(): Promise<PayrollSummaryDTO> {
    const lastSix = await deps.payRuns.listFinalized(6);

    const months = lastSix.map((r) => ({
      month: r.periodStart.slice(0, 7),
      total: r.totalNet ?? '0.00',
      headcount: r.headcount ?? 0,
    }));

    if (lastSix.length === 0) {
      return { months: [], deptBreakdown: [] };
    }

    const latestRun = lastSix[0]!;
    const deptRows = await deps.payslips.sumByDeptForRun(latestRun.id);

    const deptMap = new Map<number, { deptId: number; deptName: string; total: number }>();
    for (const row of deptRows) {
      const existing = deptMap.get(row.deptId);
      if (existing) {
        existing.total += parseFloat(row.total);
      } else {
        deptMap.set(row.deptId, { deptId: row.deptId, deptName: row.deptName, total: parseFloat(row.total) });
      }
    }

    const deptBreakdown = [...deptMap.values()].map((d) => ({
      deptId: d.deptId,
      deptName: d.deptName,
      total: d.total.toFixed(2),
    }));

    return { months, deptBreakdown };
  }

  return { create, getDetail, finalize, cancel, adjustPayslip, list, getMyPayslips, getSummary };
}
