import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { PasswordForgotBody } from '@naratala/shared';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { apiFetch } from '../../shared/api/client.js';

export function ForgotPasswordPage(): JSX.Element {
  const { t } = useTranslation();
  const [sent, setSent] = useState(false);
  const { register, handleSubmit, formState } = useForm({
    resolver: zodResolver(PasswordForgotBody),
    defaultValues: { email: '' },
  });
  const m = useMutation({
    mutationFn: (v: { email: string }) =>
      apiFetch('/api/auth/password/forgot', { method: 'POST', body: v }),
    onSettled: () => setSent(true),
  });
  if (sent) return <main className="nt-auth-page">{t('auth.resetSent')}</main>;
  return (
    <main className="nt-auth-page">
      <form onSubmit={handleSubmit((v) => m.mutate(v))} className="nt-auth-form">
        <label>
          {t('auth.email')}
          <input type="email" {...register('email')} />
        </label>
        {formState.errors.email && <p role="alert">{formState.errors.email.message}</p>}
        <button type="submit" disabled={m.isPending}>
          {t('common.save')}
        </button>
      </form>
    </main>
  );
}
