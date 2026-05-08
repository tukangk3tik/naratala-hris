import { Card } from '../../shared/ui/Card.js';
import { useAuth } from '../../shared/auth/useAuth.js';
import { Pill } from '../../shared/ui/Pill.js';
import { LanguageSwitcher } from './LanguageSwitcher.js';
import { ChangePasswordCard } from './ChangePasswordCard.js';
import { MfaCard } from './MfaCard.js';

export function ProfilePage(): JSX.Element {
  const { user } = useAuth();
  if (!user) return <p>—</p>;
  return (
    <div className="nt-stack">
      <Card title="Profile">
        <p>
          <strong>{user.email}</strong> <Pill tone="info">{user.role}</Pill>
        </p>
        <LanguageSwitcher />
      </Card>
      <ChangePasswordCard />
      <MfaCard />
    </div>
  );
}
