import type { DB } from '../../shared/db/client.js';
import type { LeaveRequestRepo, LeaveRequestRow } from './leaveRequestRepo.js';
import type { HolidayService } from './holidayService.js';
import type { WorkingScheduleService } from './workingScheduleService.js';
import type { UserRepo } from '../auth/userRepo.js';
import type { EmployeeRepo } from '../employees/employeeRepo.js';
import type { AuditRepo } from '../audit/auditRepo.js';
import type { Mailer } from '../../shared/mail/mailer.js';
import { countDays } from './dayCounter.js';
import { ForbiddenError, NotFoundError, ValidationError } from '../../shared/errors/index.js';
import {
  leaveRequestSubmittedEmail,
  leaveRequestDecidedEmail,
  leaveRequestCancelledEmail,
} from '../../shared/mail/templates.js';
import type { LeaveStatusT, LeaveTypeT, Role } from '@naratala/shared';
import { hasPermission } from '@naratala/shared';

interface Actor {
  userId: number;
  role: Role;
  employeeId: number | null;
  ip: string;
}

interface SubmitInput {
  employeeId?: number;
  leaveType: LeaveTypeT;
  fromDate: string;
  toDate: string;
  reason?: string;
}

interface Deps {
  db: DB;
  requests: LeaveRequestRepo;
  holidays: HolidayService;
  schedule: WorkingScheduleService;
  users: UserRepo;
  employees: EmployeeRepo;
  audit: AuditRepo;
  mailer: Mailer;
}

export type LeaveRequestService = ReturnType<typeof createLeaveRequestService>;

export function createLeaveRequestService(deps: Deps) {
  async function isReportOf(managerEmployeeId: number, targetEmployeeId: number) {
    const ids = await deps.requests.findManagedReportIds(managerEmployeeId);
    return ids.includes(targetEmployeeId);
  }

  async function notifyApprovers(employeeId: number, body: ReturnType<typeof leaveRequestSubmittedEmail>) {
    const emp = await deps.employees.findById(employeeId);
    if (emp?.managerId) {
      const mgr = await deps.employees.findById(emp.managerId);
      if (mgr?.userId) {
        const mgrUser = await deps.users.findById(mgr.userId);
        if (mgrUser) await deps.mailer.send({ to: mgrUser.email, ...body });
        return;
      }
    }
    const hrs = await deps.users.listByRole('hr');
    await Promise.all(hrs.map((u) => deps.mailer.send({ to: u.email, ...body })));
  }

  return {
    submit: async (actor: Actor, input: SubmitInput): Promise<LeaveRequestRow> => {
      const targetEmployeeId = input.employeeId ?? actor.employeeId;
      if (!targetEmployeeId) throw new ValidationError('employeeId required');
      const onBehalf = targetEmployeeId !== actor.employeeId;
      if (onBehalf) {
        if (!hasPermission(actor.role, 'absence:write:any')) throw new ForbiddenError();
        if (actor.role === 'manager' && actor.employeeId !== null) {
          const ok = await isReportOf(actor.employeeId, targetEmployeeId);
          if (!ok) throw new ForbiddenError('OUT_OF_SCOPE');
        }
      }
      const wd = await deps.schedule.workingDaysFor(targetEmployeeId);
      const holidays = await deps.holidays.expandDates(input.fromDate, input.toDate);
      const days = countDays(input.fromDate, input.toDate, wd, holidays);
      if (days <= 0) throw new ValidationError('zero working days in range');
      const status: LeaveStatusT = onBehalf ? 'approved' : 'pending';
      const insertData: Parameters<typeof deps.requests.insert>[0] = {
        employeeId: targetEmployeeId,
        actorUserId: actor.userId,
        leaveType: input.leaveType,
        fromDate: input.fromDate,
        toDate: input.toDate,
        days: days.toFixed(2),
        status,
      };
      if (input.reason !== undefined) insertData.reason = input.reason;
      if (onBehalf) {
        insertData.decidedByUserId = actor.userId;
        insertData.decidedAt = new Date();
      }
      const row = await deps.requests.insert(insertData);
      await deps.audit.write({
        actorUserId: actor.userId,
        actorIp: actor.ip,
        action: 'leave_request.submit',
        entityType: 'leave_request',
        entityId: row.id,
        changes: { after: { status, days: days.toFixed(2), leaveType: input.leaveType } },
      });
      const emp = await deps.employees.findById(targetEmployeeId);
      if (status === 'pending' && emp) {
        await notifyApprovers(
          targetEmployeeId,
          leaveRequestSubmittedEmail({
            approverName: 'Approver',
            employeeName: emp.fullName,
            leaveType: input.leaveType,
            fromDate: input.fromDate,
            toDate: input.toDate,
            days: days.toFixed(2),
          }),
        );
      } else if (status === 'approved' && emp?.userId) {
        const u = await deps.users.findById(emp.userId);
        if (u) {
          await deps.mailer.send({
            to: u.email,
            ...leaveRequestDecidedEmail({
              employeeName: emp.fullName,
              leaveType: input.leaveType,
              fromDate: input.fromDate,
              toDate: input.toDate,
              decision: 'approved',
            }),
          });
        }
      }
      return row;
    },

    list: async (
      actor: Actor,
      f: { status?: LeaveStatusT; employeeId?: number; from?: string; to?: string; page: number; pageSize: number },
    ) => {
      let employeeIds: number[] | 'any';
      if (hasPermission(actor.role, 'absence:read:any')) {
        employeeIds = f.employeeId ? [f.employeeId] : 'any';
      } else if (hasPermission(actor.role, 'absence:read:reports') && actor.employeeId !== null) {
        const reports = await deps.requests.findManagedReportIds(actor.employeeId);
        const own = actor.employeeId;
        const allowed = new Set([own, ...reports]);
        employeeIds = f.employeeId
          ? allowed.has(f.employeeId)
            ? [f.employeeId]
            : []
          : Array.from(allowed);
      } else {
        if (actor.employeeId === null) return { data: [], total: 0, page: f.page, pageSize: f.pageSize };
        employeeIds = [actor.employeeId];
      }
      const listParams: Parameters<typeof deps.requests.list>[0] = {
        employeeIds,
        page: f.page,
        pageSize: f.pageSize,
      };
      if (f.status) listParams.status = f.status;
      if (f.from) listParams.from = f.from;
      if (f.to) listParams.to = f.to;
      const out = await deps.requests.list(listParams);
      return { ...out, page: f.page, pageSize: f.pageSize };
    },

    detail: async (actor: Actor, id: number) => {
      const row = await deps.requests.findById(id);
      if (!row) throw new NotFoundError('leave request not found');
      const canRead =
        hasPermission(actor.role, 'absence:read:any') ||
        row.employeeId === actor.employeeId ||
        (hasPermission(actor.role, 'absence:read:reports') &&
          actor.employeeId !== null &&
          (await isReportOf(actor.employeeId, row.employeeId)));
      if (!canRead) throw new ForbiddenError();
      return row;
    },

    approve: async (actor: Actor, id: number, v: { note?: string }) => {
      const row = await deps.requests.findById(id);
      if (!row) throw new NotFoundError('leave request not found');
      if (row.status !== 'pending') throw new ValidationError('not pending');
      const allowed =
        hasPermission(actor.role, 'absence:approve:any') ||
        (hasPermission(actor.role, 'absence:approve:reports') &&
          actor.employeeId !== null &&
          (await isReportOf(actor.employeeId, row.employeeId)));
      if (!allowed) throw new ForbiddenError();
      const patch: Partial<LeaveRequestRow> = {
        status: 'approved',
        decidedByUserId: actor.userId,
        decidedAt: new Date(),
      };
      if (v.note !== undefined) patch.decisionNote = v.note;
      const updated = await deps.requests.update(id, patch);
      await deps.audit.write({
        actorUserId: actor.userId,
        actorIp: actor.ip,
        action: 'leave_request.approve',
        entityType: 'leave_request',
        entityId: id,
        changes: { before: { status: 'pending' }, after: { status: 'approved' } },
      });
      const emp = await deps.employees.findById(row.employeeId);
      if (emp?.userId) {
        const u = await deps.users.findById(emp.userId);
        if (u) {
          const emailArgs: Parameters<typeof leaveRequestDecidedEmail>[0] = {
            employeeName: emp.fullName,
            leaveType: row.leaveType,
            fromDate: row.fromDate,
            toDate: row.toDate,
            decision: 'approved',
          };
          if (v.note !== undefined) emailArgs.note = v.note;
          await deps.mailer.send({ to: u.email, ...leaveRequestDecidedEmail(emailArgs) });
        }
      }
      return updated;
    },

    decline: async (actor: Actor, id: number, v: { note?: string }) => {
      const row = await deps.requests.findById(id);
      if (!row) throw new NotFoundError('leave request not found');
      if (row.status !== 'pending') throw new ValidationError('not pending');
      const allowed =
        hasPermission(actor.role, 'absence:approve:any') ||
        (hasPermission(actor.role, 'absence:approve:reports') &&
          actor.employeeId !== null &&
          (await isReportOf(actor.employeeId, row.employeeId)));
      if (!allowed) throw new ForbiddenError();
      const patch: Partial<LeaveRequestRow> = {
        status: 'declined',
        decidedByUserId: actor.userId,
        decidedAt: new Date(),
      };
      if (v.note !== undefined) patch.decisionNote = v.note;
      const updated = await deps.requests.update(id, patch);
      await deps.audit.write({
        actorUserId: actor.userId,
        actorIp: actor.ip,
        action: 'leave_request.decline',
        entityType: 'leave_request',
        entityId: id,
        changes: { before: { status: 'pending' }, after: { status: 'declined' } },
      });
      const emp = await deps.employees.findById(row.employeeId);
      if (emp?.userId) {
        const u = await deps.users.findById(emp.userId);
        if (u) {
          const emailArgs: Parameters<typeof leaveRequestDecidedEmail>[0] = {
            employeeName: emp.fullName,
            leaveType: row.leaveType,
            fromDate: row.fromDate,
            toDate: row.toDate,
            decision: 'declined',
          };
          if (v.note !== undefined) emailArgs.note = v.note;
          await deps.mailer.send({ to: u.email, ...leaveRequestDecidedEmail(emailArgs) });
        }
      }
      return updated;
    },

    cancel: async (actor: Actor, id: number) => {
      const row = await deps.requests.findById(id);
      if (!row) throw new NotFoundError('leave request not found');
      const isOwner = row.employeeId === actor.employeeId;
      const canManage =
        hasPermission(actor.role, 'absence:approve:any') ||
        (hasPermission(actor.role, 'absence:approve:reports') &&
          actor.employeeId !== null &&
          (await isReportOf(actor.employeeId, row.employeeId)));
      if (!isOwner && !canManage) throw new ForbiddenError();
      if (row.status === 'cancelled' || row.status === 'declined') {
        throw new ValidationError('not cancellable');
      }
      if (row.status === 'approved') {
        const today = new Date().toISOString().slice(0, 10);
        if (row.fromDate <= today) throw new ValidationError('LEAVE_ALREADY_STARTED: already started');
      }
      const updated = await deps.requests.update(id, {
        status: 'cancelled',
        cancelledByUserId: actor.userId,
        cancelledAt: new Date(),
      });
      await deps.audit.write({
        actorUserId: actor.userId,
        actorIp: actor.ip,
        action: 'leave_request.cancel',
        entityType: 'leave_request',
        entityId: id,
        changes: { before: { status: row.status }, after: { status: 'cancelled' } },
      });
      const emp = await deps.employees.findById(row.employeeId);
      if (emp?.managerId) {
        const mgr = await deps.employees.findById(emp.managerId);
        if (mgr?.userId) {
          const mgrUser = await deps.users.findById(mgr.userId);
          if (mgrUser) {
            await deps.mailer.send({
              to: mgrUser.email,
              ...leaveRequestCancelledEmail({
                approverName: mgr.fullName,
                employeeName: emp.fullName,
                leaveType: row.leaveType,
                fromDate: row.fromDate,
                toDate: row.toDate,
              }),
            });
          }
        }
      }
      return updated;
    },
  };
}
