import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { EmployeeUpdate, type EmployeeDTO } from '@naratala/shared';
import { useUpdateEmployee } from './hooks.js';
import { useDepartmentsQuery } from '../departments/hooks.js';
import { usePermission } from '../../shared/permissions/usePermission.js';
import { ApiError } from '../../shared/api/ApiError.js';
import { toast } from 'sonner';
import { useState } from 'react';

type Input = {
  fullName: string;
  email: string;
  position: string;
  departmentId: number;
  employmentType: EmployeeDTO['employmentType'];
  employmentStatus: EmployeeDTO['employmentStatus'];
  hireDate: string;
  salaryAmount?: string;
  reason?: string;
};

export function EmployeeForm({
  employee,
  onClose,
}: {
  employee: EmployeeDTO;
  onClose: () => void;
}): JSX.Element {
  const canSalary = usePermission('employees:write:salary');
  const dq = useDepartmentsQuery();
  const m = useUpdateEmployee();
  const initialSalary = employee.salaryAmount ?? '';
  const { register, handleSubmit, watch, setError, formState } = useForm<Input>({
    resolver: zodResolver(EmployeeUpdate),
    defaultValues: {
      fullName: employee.fullName,
      email: employee.email,
      position: employee.position,
      departmentId: employee.departmentId,
      employmentType: employee.employmentType,
      employmentStatus: employee.employmentStatus,
      hireDate: employee.hireDate,
      salaryAmount: initialSalary,
      reason: '',
    },
  });
  const [salaryDirty, setSalaryDirty] = useState(false);
  const salary = watch('salaryAmount') ?? '';
  const dirty = salary !== initialSalary;
  if (dirty !== salaryDirty) setSalaryDirty(dirty);

  return (
    <form
      onSubmit={handleSubmit((v) => {
        const patch: Record<string, unknown> = { ...v };
        if (!salaryDirty) {
          delete patch.salaryAmount;
          delete patch.reason;
        }
        m.mutate(
          { id: employee.id, patch },
          {
            onSuccess: () => onClose(),
            onError: (err) => {
              if (err instanceof ApiError && err.fields) {
                for (const [k, v2] of Object.entries(err.fields)) {
                  setError(k as keyof Input, { message: v2[0] });
                }
                return;
              }
              toast.error(err instanceof ApiError ? err.message : 'Update failed');
            },
          },
        );
      })}
    >
      <label>
        Full name
        <input {...register('fullName')} />
      </label>
      {formState.errors.fullName && <p role="alert">{formState.errors.fullName.message}</p>}
      <label>
        Email
        <input type="email" {...register('email')} />
      </label>
      <label>
        Position
        <input {...register('position')} />
      </label>
      <label>
        Department
        <select {...register('departmentId', { valueAsNumber: true })}>
          {dq.data?.data.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Employment type
        <select {...register('employmentType')}>
          <option value="full_time">Full time</option>
          <option value="part_time">Part time</option>
          <option value="contract">Contract</option>
          <option value="intern">Intern</option>
        </select>
      </label>
      <label>
        Status
        <select {...register('employmentStatus')}>
          <option value="active">Active</option>
          <option value="on_leave">On leave</option>
          <option value="terminated">Terminated</option>
        </select>
      </label>
      <label>
        Hire date
        <input type="date" {...register('hireDate')} />
      </label>
      {canSalary && (
        <label>
          Salary
          <input {...register('salaryAmount')} />
        </label>
      )}
      {canSalary && salaryDirty && (
        <label>
          Reason (≥ 10 chars required)
          <textarea {...register('reason')} />
        </label>
      )}
      {formState.errors.reason && <p role="alert">{formState.errors.reason.message}</p>}
      <div>
        <button type="button" onClick={onClose}>
          Cancel
        </button>
        <button type="submit" disabled={m.isPending}>
          Save
        </button>
      </div>
    </form>
  );
}
