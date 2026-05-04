import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLocation, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { MfaVerifyBody, type UserDTO } from '@naratala/shared';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../shared/auth/useAuth.js';
import { ApiError } from '../../shared/api/ApiError.js';

type MfaInput = { code: string };
type Resp = { accessToken: string; user: UserDTO };

export function MfaChallengePage(): JSX.Element {
  const { t } = useTranslation();
  const nav = useNavigate();
  const loc = useLocation();
  const { setAuth } = useAuth();
  const state = (loc.state as { mfaToken?: string; from?: string } | null) ?? {};
  const from = state.from ?? '/employees';
  const mfaToken = state.mfaToken ?? '';
  const [serverErr, setServerErr] = useState<string | null>(null);

  const { register, handleSubmit, formState } = useForm<MfaInput>({
    resolver: zodResolver(MfaVerifyBody),
    defaultValues: { code: '' },
  });

  const m = useMutation({
    mutationFn: async (input: MfaInput) => {
      const res = await fetch('/api/auth/mfa/verify', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${mfaToken}` },
        body: JSON.stringify(input),
      });
      const body = (await res.json().catch(() => null)) as
        | (Resp & { code?: never })
        | { code: string; message: string }
        | null;
      if (!res.ok || !body || 'code' in body) {
        const e = body as { code: string; message: string } | null;
        throw new ApiError(e?.code ?? 'MFA_INVALID', e?.message ?? 'invalid', res.status);
      }
      return body;
    },
    onSuccess: (d) => {
      setAuth({ user: d.user, accessToken: d.accessToken });
      nav(from, { replace: true });
    },
    onError: (e) => setServerErr(e instanceof ApiError ? e.message : 'verify failed'),
  });

  return (
    <main className="nt-auth-page">
      <form onSubmit={handleSubmit((v) => m.mutate(v))} className="nt-auth-form">
        <label>
          {t('auth.mfaCode')}
          <input inputMode="numeric" autoComplete="one-time-code" {...register('code')} />
        </label>
        {formState.errors.code && <p role="alert">{formState.errors.code.message}</p>}
        {serverErr && <p role="alert">{serverErr}</p>}
        <button type="submit" disabled={m.isPending}>
          {t('auth.verify')}
        </button>
      </form>
    </main>
  );
}
