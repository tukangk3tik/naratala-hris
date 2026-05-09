import type { UserDTO, EmployeeDTO, DepartmentDTO, LeaveRequestDTO, BalanceDTO, HolidayDTO, LeavePolicyDTO, PayRunDetailDTO, PayslipDTO, PayrollSummaryDTO } from '@naratala/shared';

export const adminUser: UserDTO = {
  id: 1,
  email: 'admin@naratala.local',
  role: 'admin',
  status: 'active',
  language: 'en',
  mfaEnabled: false,
  mustChangePassword: false,
  lastLoginAt: '2026-04-28T00:00:00.000Z',
  createdAt: '2026-04-01T00:00:00.000Z',
  updatedAt: '2026-04-28T00:00:00.000Z',
};

export const employeeUser: UserDTO = {
  ...adminUser,
  id: 2,
  email: 'emp@naratala.local',
  role: 'employee',
};
export const hrUser: UserDTO = { ...adminUser, id: 3, email: 'hr@naratala.local', role: 'hr' };
export const managerUser: UserDTO = {
  ...adminUser,
  id: 4,
  email: 'mgr@naratala.local',
  role: 'manager',
};

export const dept: DepartmentDTO = {
  id: 1,
  name: 'Engineering',
  createdAt: '2026-04-01T00:00:00.000Z',
  updatedAt: '2026-04-01T00:00:00.000Z',
};

export const sampleEmployee: EmployeeDTO = {
  id: 10,
  userId: 2,
  fullName: 'Sample Person',
  email: 'sample@naratala.local',
  phone: null,
  pronouns: null,
  departmentId: 1,
  departmentName: 'Engineering',
  position: 'Engineer',
  location: null,
  employmentType: 'full_time',
  employmentStatus: 'active',
  hireDate: '2024-01-01',
  managerId: null,
  avatarColorHue: 12,
  salaryAmount: '15000000.00',
  salaryCurrency: 'IDR',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

export const sampleRequest: LeaveRequestDTO = {
  id: 1,
  employeeId: sampleEmployee.id,
  employeeName: sampleEmployee.fullName,
  actorUserId: 1,
  leaveType: 'vacation',
  fromDate: '2026-06-01',
  toDate: '2026-06-05',
  days: '5.00',
  reason: 'family trip',
  status: 'pending',
  decidedByUserId: null,
  decidedAt: null,
  decisionNote: null,
  cancelledByUserId: null,
  cancelledAt: null,
  createdAt: '2026-05-08T00:00:00.000Z',
  updatedAt: '2026-05-08T00:00:00.000Z',
};

export const sampleBalances: BalanceDTO[] = [
  { leaveType: 'vacation', quota: '20.00', used: '3.00', pending: '5.00', available: '12.00' },
  { leaveType: 'sick', quota: '10.00', used: '0.00', pending: '0.00', available: '10.00' },
  { leaveType: 'personal', quota: '5.00', used: '0.00', pending: '0.00', available: '5.00' },
  { leaveType: 'bereavement', quota: '3.00', used: '0.00', pending: '0.00', available: '3.00' },
  { leaveType: 'parental', quota: '90.00', used: '0.00', pending: '0.00', available: '90.00' },
  { leaveType: 'unpaid', quota: '0.00', used: '0.00', pending: '0.00', available: '0.00' },
];

export const sampleHoliday: HolidayDTO = {
  id: 1,
  date: '2026-05-01',
  label: 'Labor Day',
  recurringAnnually: true,
  createdAt: '2026-04-01T00:00:00.000Z',
  updatedAt: '2026-04-01T00:00:00.000Z',
};

export const samplePolicies: LeavePolicyDTO[] = [
  { id: 1, leaveType: 'vacation', defaultDaysPerYear: '20.00', isPaid: true, affectsBalance: true },
  { id: 2, leaveType: 'sick', defaultDaysPerYear: '10.00', isPaid: true, affectsBalance: true },
  { id: 3, leaveType: 'personal', defaultDaysPerYear: '5.00', isPaid: true, affectsBalance: true },
  { id: 4, leaveType: 'bereavement', defaultDaysPerYear: '3.00', isPaid: true, affectsBalance: true },
  { id: 5, leaveType: 'parental', defaultDaysPerYear: '90.00', isPaid: true, affectsBalance: true },
  { id: 6, leaveType: 'unpaid', defaultDaysPerYear: '0.00', isPaid: false, affectsBalance: false },
];

export const samplePayslip: PayslipDTO = {
  id: 1,
  payRunId: 1,
  employeeId: 10,
  employeeName: 'Sample Person',
  department: 'Engineering',
  grossAmount: '1000000.00',
  deductionAmount: '0.00',
  netAmount: '1000000.00',
  notes: null,
  salarySnapshot: { amount: '12000000.00', currency: 'IDR' },
};

export const samplePayRun: PayRunDetailDTO = {
  id: 1,
  name: 'May 2026 Monthly',
  periodStart: '2026-05-01',
  periodEnd: '2026-05-31',
  currency: 'IDR',
  status: 'draft',
  notes: null,
  totalGross: null,
  totalNet: null,
  headcount: null,
  createdAt: '2026-05-09T00:00:00.000Z',
  finalizedAt: null,
  payslips: [samplePayslip],
};

export const sampleSummary: PayrollSummaryDTO = {
  months: [
    { month: '2026-05', total: '1000000.00', headcount: 1 },
  ],
  deptBreakdown: [
    { deptId: 1, deptName: 'Engineering', total: '1000000.00' },
  ],
};
