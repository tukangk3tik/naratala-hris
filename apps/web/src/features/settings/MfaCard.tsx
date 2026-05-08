import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'sonner';
import { Card } from '../../shared/ui/Card.js';
import { useAuth } from '../../shared/auth/useAuth.js';
import { apiFetch } from '../../shared/api/client.js';
import { ApiError } from '../../shared/api/ApiError.js';

export function MfaCard(): JSX.Element {
  const { user, refreshMe } = useAuth();
  const [setup, setSetup] = useState<{ secret: string; otpauthUrl: string } | null>(null);
  const [code, setCode] = useState('');
  const [recovery, setRecovery] = useState<string[] | null>(null);
  const [disableForm, setDisableForm] = useState<{ password: string; code: string } | null>(null);

  const start = useMutation({
    mutationFn: () =>
      apiFetch<{ secret: string; otpauthUrl: string }>('/api/auth/mfa/setup/start', {
        method: 'POST',
      }),
    onSuccess: (d) => setSetup(d),
  });

  const confirm = useMutation({
    mutationFn: () =>
      apiFetch<{ recoveryCodes: string[] }>('/api/auth/mfa/setup/confirm', {
        method: 'POST',
        body: { secret: setup!.secret, code },
      }),
    onSuccess: async (d) => {
      setRecovery(d.recoveryCodes);
      setSetup(null);
      setCode('');
      await refreshMe();
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'MFA confirm failed'),
  });

  const disable = useMutation({
    mutationFn: (v: { currentPassword: string; code: string }) =>
      apiFetch('/api/auth/mfa/disable', { method: 'POST', body: v }),
    onSuccess: async () => {
      setDisableForm(null);
      await refreshMe();
      toast.success('MFA disabled');
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'MFA disable failed'),
  });

  if (!user) return <Card title="MFA">…</Card>;

  if (recovery) {
    return (
      <Card title="MFA enabled">
        <p>Save these recovery codes — they will not be shown again.</p>
        <ul data-testid="recovery-codes">
          {recovery.map((c) => (
            <li key={c}>
              <code>{c}</code>
            </li>
          ))}
        </ul>
        <button type="button" onClick={() => setRecovery(null)}>
          I've saved them
        </button>
      </Card>
    );
  }

  if (user.mfaEnabled && !disableForm) {
    return (
      <Card title="MFA enabled">
        <button type="button" onClick={() => setDisableForm({ password: '', code: '' })}>
          Disable MFA
        </button>
      </Card>
    );
  }

  if (user.mfaEnabled && disableForm) {
    return (
      <Card title="Disable MFA">
        <label>
          Current password
          <input
            type="password"
            value={disableForm.password}
            onChange={(e) => setDisableForm((d) => ({ ...d!, password: e.target.value }))}
          />
        </label>
        <label>
          6-digit code
          <input
            value={disableForm.code}
            onChange={(e) => setDisableForm((d) => ({ ...d!, code: e.target.value }))}
          />
        </label>
        <button
          type="button"
          onClick={() =>
            disable.mutate({
              currentPassword: disableForm.password,
              code: disableForm.code,
            })
          }
        >
          Confirm disable
        </button>
        <button type="button" onClick={() => setDisableForm(null)}>
          Cancel
        </button>
      </Card>
    );
  }

  if (setup) {
    return (
      <Card title="Enable MFA">
        <p>Scan with your authenticator app:</p>
        <QRCodeSVG value={setup.otpauthUrl} size={192} />
        <p>
          Or enter manually: <code>{setup.secret}</code>
        </p>
        <label>
          6-digit code
          <input value={code} onChange={(e) => setCode(e.target.value)} />
        </label>
        <button type="button" onClick={() => confirm.mutate()} disabled={code.length !== 6}>
          Confirm
        </button>
      </Card>
    );
  }

  return (
    <Card title="Multi-factor authentication">
      <p>Add an extra step at sign-in for stronger security.</p>
      <button type="button" onClick={() => start.mutate()}>
        Enable MFA
      </button>
    </Card>
  );
}
