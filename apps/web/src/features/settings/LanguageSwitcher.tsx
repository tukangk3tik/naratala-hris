import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { apiFetch } from '../../shared/api/client.js';
import { useAuth } from '../../shared/auth/useAuth.js';
import { qk } from '../../shared/api/queries.js';

export function LanguageSwitcher(): JSX.Element {
  const { i18n } = useTranslation();
  const { user, refreshMe } = useAuth();
  const qc = useQueryClient();
  const m = useMutation({
    mutationFn: (lang: 'id' | 'en') =>
      apiFetch(`/api/users/${user!.id}`, { method: 'PATCH', body: { language: lang } }),
    onSuccess: async (_d, lang) => {
      await i18n.changeLanguage(lang);
      await refreshMe();
      void qc.invalidateQueries({ queryKey: qk.me() });
    },
  });
  return (
    <select
      aria-label="language"
      value={i18n.language}
      onChange={(e) => m.mutate(e.target.value as 'id' | 'en')}
      disabled={!user || m.isPending}
    >
      <option value="id">Bahasa Indonesia</option>
      <option value="en">English</option>
    </select>
  );
}
