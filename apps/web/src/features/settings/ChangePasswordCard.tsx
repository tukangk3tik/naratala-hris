import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { PasswordChangeBody } from '@naratala/shared';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Card } from '../../shared/ui/Card.js';
import { useAuth } from '../../shared/auth/useAuth.js';
import { apiFetch } from '../../shared/api/client.js';
import { ApiError } from '../../shared/api/ApiError.js';
import { PasswordStrengthMeter } from '../auth/PasswordStrengthMeter.js';

type Input = { currentPassword: string; newPassword: string };

export function ChangePasswordCard(): JSX.Element {
  const { signOut } = useAuth();
  const nav = useNavigate();
  const { register, handleSubmit, watch, setError, formState } = useForm<Input>({
    resolver: zodResolver(PasswordChangeBody),
    defaultValues: { currentPassword: '', newPassword: '' },
  });
  const m = useMutation({
    mutationFn: (v: Input) =>
      apiFetch('/api/auth/password/change', { method: 'POST', body: v }),
    onSuccess: async () => {
      toast.success('Password changed — please sign in again');
      await signOut();
      nav('/login', { replace: true });
    },
    onError: (e) => {
      const msg = e instanceof ApiError ? e.fields?.['newPassword']?.[0] : undefined;
      if (msg) {
        setError('newPassword', { message: msg });
        return;
      }
      toast.error(e instanceof ApiError ? e.message : 'Change failed');
    },
  });
  return (
    <Card title="Change password">
      <form onSubmit={handleSubmit((v) => m.mutate(v))}>
        <label>
          Current password
          <input type="password" autoComplete="current-password" {...register('currentPassword')} />
        </label>
        {formState.errors.currentPassword && (
          <p role="alert">{formState.errors.currentPassword.message}</p>
        )}
        <label>
          New password
          <input type="password" autoComplete="new-password" {...register('newPassword')} />
        </label>
        <PasswordStrengthMeter password={watch('newPassword')} />
        {formState.errors.newPassword && (
          <p role="alert">{formState.errors.newPassword.message}</p>
        )}
        <button type="submit" disabled={m.isPending}>
          Save
        </button>
      </form>
    </Card>
  );
}
