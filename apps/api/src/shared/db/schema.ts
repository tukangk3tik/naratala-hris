import {
  bigint,
  boolean,
  char,
  datetime,
  date,
  decimal,
  index,
  json,
  mysqlEnum,
  mysqlTable,
  smallint,
  uniqueIndex,
  varbinary,
  varchar,
} from 'drizzle-orm/mysql-core';
import { sql } from 'drizzle-orm';

const ts = {
  createdAt: datetime('created_at', { fsp: 3 }).notNull().default(sql`CURRENT_TIMESTAMP(3)`),
  updatedAt: datetime('updated_at', { fsp: 3 })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP(3)`)
    .$onUpdate(() => new Date()),
};

export const users = mysqlTable(
  'users',
  {
    id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
    email: varchar('email', { length: 255 }).notNull(),
    passwordHash: varchar('password_hash', { length: 255 }).notNull(),
    role: mysqlEnum('role', ['admin', 'hr', 'manager', 'employee']).notNull(),
    status: mysqlEnum('status', ['pending', 'active', 'disabled']).notNull().default('pending'),
    mustChangePassword: boolean('must_change_password').notNull().default(false),
    mfaSecret: varbinary('mfa_secret', { length: 255 }),
    mfaEnabled: boolean('mfa_enabled').notNull().default(false),
    language: mysqlEnum('language', ['id', 'en']).notNull().default('id'),
    lastLoginAt: datetime('last_login_at', { fsp: 3 }),
    ...ts,
    deletedAt: datetime('deleted_at', { fsp: 3 }),
  },
  (t) => ({
    emailUnique: uniqueIndex('users_email_unique').on(t.email),
    statusIdx: index('users_status_idx').on(t.status),
    roleIdx: index('users_role_idx').on(t.role),
  }),
);

export const departments = mysqlTable(
  'departments',
  {
    id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
    name: varchar('name', { length: 80 }).notNull(),
    ...ts,
  },
  (t) => ({ nameUnique: uniqueIndex('departments_name_unique').on(t.name) }),
);

export const employees = mysqlTable(
  'employees',
  {
    id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
    userId: bigint('user_id', { mode: 'number', unsigned: true }),
    fullName: varchar('full_name', { length: 160 }).notNull(),
    email: varchar('email', { length: 255 }).notNull(),
    phone: varchar('phone', { length: 32 }),
    pronouns: varchar('pronouns', { length: 32 }),
    departmentId: bigint('department_id', { mode: 'number', unsigned: true }).notNull(),
    position: varchar('position', { length: 120 }).notNull(),
    location: varchar('location', { length: 120 }),
    employmentType: mysqlEnum('employment_type', [
      'full_time',
      'part_time',
      'contract',
      'intern',
    ]).notNull(),
    employmentStatus: mysqlEnum('employment_status', ['active', 'on_leave', 'terminated'])
      .notNull()
      .default('active'),
    hireDate: date('hire_date', { mode: 'string' }).notNull(),
    managerId: bigint('manager_id', { mode: 'number', unsigned: true }),
    salaryAmount: decimal('salary_amount', { precision: 14, scale: 2 }),
    salaryCurrency: char('salary_currency', { length: 3 }).notNull().default('IDR'),
    workingDays: smallint('working_days'),
    avatarColorHue: smallint('avatar_color_hue').notNull(),
    ...ts,
    deletedAt: datetime('deleted_at', { fsp: 3 }),
  },
  (t) => ({
    emailUnique: uniqueIndex('employees_email_unique').on(t.email),
    userIdUnique: uniqueIndex('employees_user_id_unique').on(t.userId),
    departmentIdx: index('employees_department_idx').on(t.departmentId),
    managerIdx: index('employees_manager_idx').on(t.managerId),
    statusIdx: index('employees_status_idx').on(t.employmentStatus),
    nameIdx: index('employees_name_idx').on(t.fullName),
  }),
);

export const refreshTokens = mysqlTable(
  'refresh_tokens',
  {
    id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
    userId: bigint('user_id', { mode: 'number', unsigned: true }).notNull(),
    familyId: char('family_id', { length: 36 }).notNull(),
    tokenHash: char('token_hash', { length: 64 }).notNull(),
    issuedAt: datetime('issued_at', { fsp: 3 }).notNull(),
    expiresAt: datetime('expires_at', { fsp: 3 }).notNull(),
    revokedAt: datetime('revoked_at', { fsp: 3 }),
    replacedById: bigint('replaced_by_id', { mode: 'number', unsigned: true }),
    userAgent: varchar('user_agent', { length: 255 }),
    ip: varchar('ip', { length: 45 }),
  },
  (t) => ({
    tokenHashUnique: uniqueIndex('refresh_tokens_token_hash_unique').on(t.tokenHash),
    userIdx: index('refresh_tokens_user_idx').on(t.userId),
    familyIdx: index('refresh_tokens_family_idx').on(t.familyId),
    expiresIdx: index('refresh_tokens_expires_idx').on(t.expiresAt),
  }),
);

export const invites = mysqlTable(
  'invites',
  {
    id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
    employeeId: bigint('employee_id', { mode: 'number', unsigned: true }).notNull(),
    email: varchar('email', { length: 255 }).notNull(),
    roleToAssign: mysqlEnum('role_to_assign', ['admin', 'hr', 'manager', 'employee']).notNull(),
    tokenHash: char('token_hash', { length: 64 }).notNull(),
    expiresAt: datetime('expires_at', { fsp: 3 }).notNull(),
    acceptedAt: datetime('accepted_at', { fsp: 3 }),
    createdBy: bigint('created_by', { mode: 'number', unsigned: true }).notNull(),
    createdAt: datetime('created_at', { fsp: 3 }).notNull().default(sql`CURRENT_TIMESTAMP(3)`),
  },
  (t) => ({
    tokenHashUnique: uniqueIndex('invites_token_hash_unique').on(t.tokenHash),
    expiresIdx: index('invites_expires_idx').on(t.expiresAt),
    employeeIdx: index('invites_employee_idx').on(t.employeeId),
  }),
);

export const passwordResets = mysqlTable(
  'password_resets',
  {
    id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
    userId: bigint('user_id', { mode: 'number', unsigned: true }).notNull(),
    tokenHash: char('token_hash', { length: 64 }).notNull(),
    expiresAt: datetime('expires_at', { fsp: 3 }).notNull(),
    consumedAt: datetime('consumed_at', { fsp: 3 }),
    createdAt: datetime('created_at', { fsp: 3 }).notNull().default(sql`CURRENT_TIMESTAMP(3)`),
  },
  (t) => ({
    tokenHashUnique: uniqueIndex('password_resets_token_hash_unique').on(t.tokenHash),
    expiresIdx: index('password_resets_expires_idx').on(t.expiresAt),
  }),
);

export const loginAttempts = mysqlTable(
  'login_attempts',
  {
    id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
    email: varchar('email', { length: 255 }).notNull(),
    ip: varchar('ip', { length: 45 }).notNull(),
    succeeded: boolean('succeeded').notNull(),
    createdAt: datetime('created_at', { fsp: 3 }).notNull().default(sql`CURRENT_TIMESTAMP(3)`),
  },
  (t) => ({
    emailCreatedIdx: index('login_attempts_email_created_idx').on(t.email, t.createdAt),
    ipCreatedIdx: index('login_attempts_ip_created_idx').on(t.ip, t.createdAt),
  }),
);

export const auditLog = mysqlTable(
  'audit_log',
  {
    id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
    actorUserId: bigint('actor_user_id', { mode: 'number', unsigned: true }),
    actorIp: varchar('actor_ip', { length: 45 }),
    action: varchar('action', { length: 64 }).notNull(),
    entityType: varchar('entity_type', { length: 32 }).notNull(),
    entityId: bigint('entity_id', { mode: 'number', unsigned: true }),
    changes: json('changes'),
    createdAt: datetime('created_at', { fsp: 3 }).notNull().default(sql`CURRENT_TIMESTAMP(3)`),
  },
  (t) => ({
    actorIdx: index('audit_log_actor_idx').on(t.actorUserId),
    entityIdx: index('audit_log_entity_idx').on(t.entityType, t.entityId),
    createdIdx: index('audit_log_created_idx').on(t.createdAt),
  }),
);

export const companySettings = mysqlTable('company_settings', {
  id: bigint('id', { mode: 'number', unsigned: true }).primaryKey(),
  defaultWorkingDays: smallint('default_working_days').notNull().default(62),
  ...ts,
});

export const leavePolicies = mysqlTable(
  'leave_policies',
  {
    id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
    leaveType: mysqlEnum('leave_type', [
      'vacation',
      'sick',
      'personal',
      'bereavement',
      'parental',
      'unpaid',
    ]).notNull(),
    defaultDaysPerYear: decimal('default_days_per_year', { precision: 5, scale: 2 }).notNull(),
    isPaid: boolean('is_paid').notNull(),
    affectsBalance: boolean('affects_balance').notNull(),
    ...ts,
  },
  (t) => ({ leaveTypeUnique: uniqueIndex('leave_policies_type_unique').on(t.leaveType) }),
);

export const leaveQuotas = mysqlTable(
  'leave_quotas',
  {
    id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
    employeeId: bigint('employee_id', { mode: 'number', unsigned: true }).notNull(),
    leaveType: mysqlEnum('leave_type', [
      'vacation',
      'sick',
      'personal',
      'bereavement',
      'parental',
      'unpaid',
    ]).notNull(),
    daysPerYear: decimal('days_per_year', { precision: 5, scale: 2 }).notNull(),
    ...ts,
  },
  (t) => ({
    empTypeUnique: uniqueIndex('leave_quotas_emp_type_unique').on(t.employeeId, t.leaveType),
  }),
);

export const holidays = mysqlTable(
  'holidays',
  {
    id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
    date: date('date', { mode: 'string' }).notNull(),
    label: varchar('label', { length: 120 }).notNull(),
    recurringAnnually: boolean('recurring_annually').notNull().default(false),
    ...ts,
  },
  (t) => ({
    dateLabelUnique: uniqueIndex('holidays_date_label_unique').on(t.date, t.label),
    dateIdx: index('holidays_date_idx').on(t.date),
  }),
);

export const leaveRequests = mysqlTable(
  'leave_requests',
  {
    id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
    employeeId: bigint('employee_id', { mode: 'number', unsigned: true }).notNull(),
    actorUserId: bigint('actor_user_id', { mode: 'number', unsigned: true }).notNull(),
    leaveType: mysqlEnum('leave_type', [
      'vacation',
      'sick',
      'personal',
      'bereavement',
      'parental',
      'unpaid',
    ]).notNull(),
    fromDate: date('from_date', { mode: 'string' }).notNull(),
    toDate: date('to_date', { mode: 'string' }).notNull(),
    days: decimal('days', { precision: 5, scale: 2 }).notNull(),
    reason: varchar('reason', { length: 500 }),
    status: mysqlEnum('status', ['pending', 'approved', 'declined', 'cancelled'])
      .notNull()
      .default('pending'),
    decidedByUserId: bigint('decided_by_user_id', { mode: 'number', unsigned: true }),
    decidedAt: datetime('decided_at', { fsp: 3 }),
    decisionNote: varchar('decision_note', { length: 500 }),
    cancelledByUserId: bigint('cancelled_by_user_id', { mode: 'number', unsigned: true }),
    cancelledAt: datetime('cancelled_at', { fsp: 3 }),
    ...ts,
  },
  (t) => ({
    empFromIdx: index('leave_requests_emp_from_idx').on(t.employeeId, t.fromDate),
    statusFromIdx: index('leave_requests_status_from_idx').on(t.status, t.fromDate),
    fromIdx: index('leave_requests_from_idx').on(t.fromDate),
  }),
);
