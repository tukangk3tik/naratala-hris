import { hasPermission, type EmployeeDTO, type Role } from '@naratala/shared';
import {
  AuthError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../../shared/errors/index.js';
import { hueFromName } from '../../bootstrap/avatarHue.js';
import type { EmployeeRepo, EmployeeRow, ListFilters } from './employeeRepo.js';
import type { UserRepo } from '../auth/userRepo.js';
import type { AuditRepo } from '../audit/auditRepo.js';
import type { RefreshTokenService } from '../auth/refreshTokenService.js';
import { makeSalaryScoper, toEmployeeDTO } from './employeeDto.js';

interface Deps {
  employees: EmployeeRepo;
  users: UserRepo;
  audit: AuditRepo;
  refresh: RefreshTokenService;
}

interface Actor {
  userId: number;
  role: Role;
  ip: string;
}

export type EmployeeCreateInput = Omit<
  EmployeeRow,
  | 'id'
  | 'departmentName'
  | 'createdAt'
  | 'updatedAt'
  | 'deletedAt'
  | 'userId'
  | 'employmentStatus'
  | 'avatarColorHue'
  | 'salaryAmount'
  | 'salaryCurrency'
> & { salaryAmount?: string | null; salaryCurrency?: string };

export interface EmployeeService {
  list(
    actor: Actor,
    f: ListFilters,
  ): Promise<{ data: EmployeeDTO[]; page: number; pageSize: number; total: number }>;
  detail(actor: Actor, id: number): Promise<EmployeeDTO>;
  create(actor: Actor, input: EmployeeCreateInput): Promise<EmployeeDTO>;
  update(
    actor: Actor,
    id: number,
    patch: Partial<EmployeeRow> & { reason?: string },
  ): Promise<EmployeeDTO>;
  remove(actor: Actor, id: number): Promise<void>;
}

export function createEmployeeService(deps: Deps): EmployeeService {
  async function buildScoper(actor: Actor) {
    const actorEmployeeId = await deps.employees.employeeIdOfUser(actor.userId);
    const directReports = new Set(
      await deps.employees.directReportIdsOfUserEmployee(actor.userId),
    );
    return {
      scoper: makeSalaryScoper({
        actorRole: actor.role,
        actorEmployeeId,
        directReportIds: directReports,
      }),
      actorEmployeeId,
    };
  }

  async function list(actor: Actor, f: ListFilters) {
    const { rows, total } = await deps.employees.list(f);
    const { scoper } = await buildScoper(actor);
    return {
      data: rows.map((r) => toEmployeeDTO(r, scoper.forRow(r))),
      page: f.page,
      pageSize: f.pageSize,
      total,
    };
  }

  async function detail(actor: Actor, id: number): Promise<EmployeeDTO> {
    const row = await deps.employees.findById(id);
    if (!row) throw new NotFoundError('employee not found');
    const { scoper } = await buildScoper(actor);
    return toEmployeeDTO(row, scoper.forRow(row));
  }

  async function create(actor: Actor, input: EmployeeCreateInput): Promise<EmployeeDTO> {
    if (!hasPermission(actor.role, 'employees:write:any')) throw new ForbiddenError();
    if (input.salaryAmount && !hasPermission(actor.role, 'employees:write:salary')) {
      throw new ForbiddenError('cannot set salary');
    }
    const existing = await deps.employees.findByEmail(input.email);
    if (existing) throw new AuthError('EMAIL_TAKEN', 'employee email already exists');

    const id = await deps.employees.create({
      userId: null,
      fullName: input.fullName,
      email: input.email,
      phone: input.phone ?? null,
      pronouns: input.pronouns ?? null,
      departmentId: input.departmentId,
      position: input.position,
      location: input.location ?? null,
      employmentType: input.employmentType,
      employmentStatus: 'active',
      hireDate: input.hireDate,
      managerId: input.managerId ?? null,
      salaryAmount: input.salaryAmount ?? null,
      salaryCurrency: input.salaryCurrency ?? 'IDR',
      avatarColorHue: hueFromName(input.fullName),
    });
    await deps.audit.write({
      actorUserId: actor.userId,
      actorIp: actor.ip,
      action: 'employee.create',
      entityType: 'employee',
      entityId: id,
      changes: {
        after: { ...input, salaryAmount: input.salaryAmount ? '[redacted]' : null },
      },
    });
    return detail(actor, id);
  }

  async function update(
    actor: Actor,
    id: number,
    patch: Partial<EmployeeRow> & { reason?: string },
  ): Promise<EmployeeDTO> {
    if (!hasPermission(actor.role, 'employees:write:any')) throw new ForbiddenError();
    const before = await deps.employees.findById(id);
    if (!before) throw new NotFoundError('employee not found');

    const salaryChange =
      patch.salaryAmount !== undefined && patch.salaryAmount !== before.salaryAmount;
    if (salaryChange) {
      if (!hasPermission(actor.role, 'employees:write:salary'))
        throw new ForbiddenError('cannot change salary');
      if (!patch.reason || patch.reason.trim().length < 10) {
        throw new ValidationError('reason (≥10 chars) required when changing salary', {
          path: ['reason'],
        });
      }
    }

    const { reason, ...dbPatch } = patch;
    await deps.employees.update(id, dbPatch);

    if (salaryChange) {
      await deps.audit.write({
        actorUserId: actor.userId,
        actorIp: actor.ip,
        action: 'employee.salary.update',
        entityType: 'employee',
        entityId: id,
        changes: {
          before: { salaryAmount: before.salaryAmount },
          after: { salaryAmount: patch.salaryAmount },
          reason,
        },
      });
    } else {
      await deps.audit.write({
        actorUserId: actor.userId,
        actorIp: actor.ip,
        action: 'employee.update',
        entityType: 'employee',
        entityId: id,
        changes: { fields: Object.keys(dbPatch) },
      });
    }
    return detail(actor, id);
  }

  async function remove(actor: Actor, id: number): Promise<void> {
    if (actor.role !== 'admin') throw new ForbiddenError();
    const before = await deps.employees.findById(id);
    if (!before) throw new NotFoundError('employee not found');

    await deps.employees.softDelete(id);
    if (before.userId) {
      await deps.users.patch(before.userId, { status: 'disabled' });
      await deps.refresh.revokeAllForUser(before.userId);
    }
    await deps.audit.write({
      actorUserId: actor.userId,
      actorIp: actor.ip,
      action: 'employee.delete',
      entityType: 'employee',
      entityId: id,
      changes: { before: { fullName: before.fullName } },
    });
  }

  return { list, detail, create, update, remove };
}
