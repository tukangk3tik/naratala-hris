import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { apiFetch } from '../../shared/api/client.js';
import { ApiError } from '../../shared/api/ApiError.js';
import { PasswordStrengthMeter } from './PasswordStrengthMeter.js';

type Input = { password: string; confirm: string };

export function ResetPasswordPage(): JSX.Element {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const navigate = useNavigate();
  const [expired, setExpired] = useState(false);
  const { register, handleSubmit, watch, setError, formState } = useForm<Input>({
    defaultValues: { password: '', confirm: '' },
  });

  const m = useMutation({
    mutationFn: (v: Input) =>
      apiFetch('/api/auth/password/reset', {
        method: 'POST',
        body: { token, newPassword: v.password },
      }),
    onSuccess: () => {
      toast.success('Password updated');
      navigate('/login', { replace: true });
    },
    onError: (e) => {
      if (e instanceof ApiError && e.status === 410) {
        setExpired(true);
        return;
      }
      const msg = e instanceof ApiError ? e.fields?.['newPassword']?.[0] : undefined;
      if (msg) {
        setError('password', { message: msg });
        return;
      }
      toast.error(e instanceof ApiError ? e.message : 'Reset failed');
    },
  });

  if (expired) {
    return (
      <main className="nt-auth-page">
        <p>{t('auth.linkExpired')}</p>
        <Link to="/password/forgot">{t('auth.tryAgain')}</Link>
      </main>
    );
  }

  return (
    <main className="nt-auth-page">
      <form
        onSubmit={handleSubmit((v) => {
          if (v.password !== v.confirm) {
            setError('confirm', { message: 'must match' });
            return;
          }
          m.mutate(v);
        })}
        className="nt-auth-form"
      >
        <label>
          {t('auth.newPassword')}
          <input type="password" {...register('password', { minLength: 10 })} />
        </label>
        <PasswordStrengthMeter password={watch('password')} />
        {formState.errors.password && <p role="alert">{formState.errors.password.message}</p>}
        <label>
          {t('auth.confirmPassword')}
          <input type="password" {...register('confirm')} />
        </label>
        {formState.errors.confirm && <p role="alert">{formState.errors.confirm.message}</p>}
        <button type="submit" disabled={m.isPending}>
          {t('common.save')}
        </button>
      </form>
    </main>
  );
}
