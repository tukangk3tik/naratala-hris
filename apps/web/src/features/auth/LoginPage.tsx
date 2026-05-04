import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { LoginBody, type UserDTO } from '@naratala/shared';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { apiFetch } from '../../shared/api/client.js';
import { ApiError } from '../../shared/api/ApiError.js';
import { useAuth } from '../../shared/auth/useAuth.js';

type LoginInput = { email: string; password: string };
type LoginResp =
  | { mfaRequired: true; mfaToken: string }
  | { accessToken: string; user: UserDTO };

export function LoginPage(): JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { setAuth } = useAuth();
  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? '/employees';

  const { register, handleSubmit, formState } = useForm<LoginInput>({
    resolver: zodResolver(LoginBody),
    defaultValues: { email: '', password: '' },
  });

  const m = useMutation({
    mutationFn: (input: LoginInput) =>
      apiFetch<LoginResp>('/api/auth/login', { method: 'POST', body: input }),
    onSuccess: (data) => {
      if ('mfaRequired' in data) {
        navigate('/login/mfa', { state: { mfaToken: data.mfaToken, from } });
        return;
      }
      setAuth({ user: data.user, accessToken: data.accessToken });
      navigate(from, { replace: true });
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : 'Sign-in failed');
    },
  });

  return (
    <main className="nt-auth-page">
      <form onSubmit={handleSubmit((v) => m.mutate(v))} className="nt-auth-form">
        <h1>Naratala</h1>
        <label>
          {t('auth.email')}
          <input type="email" autoComplete="email" {...register('email')} />
        </label>
        {formState.errors.email && <p role="alert">{formState.errors.email.message}</p>}
        <label>
          {t('auth.password')}
          <input type="password" autoComplete="current-password" {...register('password')} />
        </label>
        {formState.errors.password && <p role="alert">{formState.errors.password.message}</p>}
        <button type="submit" disabled={m.isPending}>
          {t('auth.signIn')}
        </button>
        <Link to="/password/forgot">{t('auth.forgotPassword')}</Link>
      </form>
    </main>
  );
}
