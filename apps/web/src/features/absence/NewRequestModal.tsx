import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { LeaveRequestCreate, type LeaveTypeT } from '@naratala/shared';
import { useSubmitRequest } from './hooks.js';
import { ApiError } from '../../shared/api/ApiError.js';
import { useState } from 'react';

type Input = { leaveType: LeaveTypeT; fromDate: string; toDate: string; reason?: string };

export function NewRequestModal({ onClose }: { onClose: () => void }): JSX.Element {
  const m = useSubmitRequest();
  const [serverErr, setServerErr] = useState<string | null>(null);
  const { register, handleSubmit, formState } = useForm<Input>({
    resolver: zodResolver(LeaveRequestCreate),
    defaultValues: { leaveType: 'vacation', fromDate: '', toDate: '', reason: '' },
  });
  return (
    <div role="dialog" aria-label="new request" className="nt-modal">
      <h3>Request time off</h3>
      <form
        onSubmit={handleSubmit((v) =>
          m.mutate(v, {
            onSuccess: () => onClose(),
            onError: (e) => setServerErr(e instanceof ApiError ? e.message : 'Submit failed'),
          }),
        )}
      >
        <label>
          Leave type
          <select aria-label="Leave type" {...register('leaveType')}>
            <option value="vacation">Vacation</option>
            <option value="sick">Sick</option>
            <option value="personal">Personal</option>
            <option value="bereavement">Bereavement</option>
            <option value="parental">Parental</option>
            <option value="unpaid">Unpaid</option>
          </select>
        </label>
        <label>
          From
          <input aria-label="From" type="date" {...register('fromDate')} />
        </label>
        {formState.errors.fromDate && <p role="alert">{formState.errors.fromDate.message}</p>}
        <label>
          To
          <input aria-label="To" type="date" {...register('toDate')} />
        </label>
        {formState.errors.toDate && <p role="alert">{formState.errors.toDate.message}</p>}
        <label>
          Reason
          <textarea aria-label="Reason" {...register('reason')} />
        </label>
        {serverErr && <p role="alert">{serverErr}</p>}
        <div>
          <button type="button" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" disabled={m.isPending}>
            Submit
          </button>
        </div>
      </form>
    </div>
  );
}
