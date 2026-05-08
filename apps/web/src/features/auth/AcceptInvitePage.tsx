import { useForm } from 'react-hook-form';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import type { InviteInfoDTO, UserDTO } from '@naratala/shared';
import { apiFetch } from '../../shared/api/client.js';
import { ApiError } from '../../shared/api/ApiError.js';
import { useAuth } from '../../shared/auth/useAuth.js';
import { PasswordStrengthMeter } from './PasswordStrengthMeter.js';

type Input = { password: string; confirm: string };

export function AcceptInvitePage(): JSX.Element {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const nav = useNavigate();
  const { setAuth } = useAuth();

  const info = useQuery({
    queryKey: ['invite', token],
    queryFn: () => apiFetch<InviteInfoDTO>(`/api/invites/${token}`),
    retry: false,
  });

  const { register, handleSubmit, watch, setError, formState } = useForm<Input>({
    defaultValues: { password: '', confirm: '' },
  });

  const accept = useMutation({
    mutationFn: (v: Input) =>
      apiFetch<{ accessToken: string; user: UserDTO }>(`/api/invites/${token}/accept`, {
        method: 'POST',
        body: { password: v.password },
      }),
    onSuccess: (d) => {
      setAuth({ user: d.user, accessToken: d.accessToken });
      nav('/employees', { replace: true });
    },
    onError: (e) => {
      const msg = e instanceof ApiError ? e.fields?.['password']?.[0] : undefined;
      if (msg) {
        setError('password', { message: msg });
        return;
      }
      toast.error(e instanceof ApiError ? e.message : 'Accept failed');
    },
  });

  if (info.isLoading) return <main>{t('common.loading')}</main>;
  if (info.error) {
    const e = info.error as ApiError;
    if (e.status === 410) return <main>This invite has expired or already been used.</main>;
    return <main role="alert">{e.message}</main>;
  }

  return (
    <main className="nt-auth-page">
      <h1>Welcome, {info.data!.fullName}</h1>
      <p>{info.data!.email}</p>
      <form
        onSubmit={handleSubmit((v) => {
          if (v.password !== v.confirm) {
            setError('confirm', { message: 'must match' });
            return;
          }
          accept.mutate(v);
        })}
        className="nt-auth-form"
      >
        <label>
          {t('auth.newPassword')}
          <input type="password" {...register('password')} />
        </label>
        <PasswordStrengthMeter password={watch('password')} />
        {formState.errors.password && <p role="alert">{formState.errors.password.message}</p>}
        <label>
          {t('auth.confirmPassword')}
          <input type="password" {...register('confirm')} />
        </label>
        {formState.errors.confirm && <p role="alert">{formState.errors.confirm.message}</p>}
        <button type="submit" disabled={accept.isPending}>
          {t('common.save')}
        </button>
      </form>
    </main>
  );
}
