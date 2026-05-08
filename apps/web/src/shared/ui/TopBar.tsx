import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth.js';

export function TopBar({ title }: { title: string }): JSX.Element {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  return (
    <header className="nt-topbar">
      <h1 className="nt-page-title">{title}</h1>
      <div className="nt-topbar-right">
        <span className="nt-me-name">{user?.email ?? ''}</span>
        <button
          type="button"
          className="nt-icon-btn"
          onClick={async () => {
            await signOut();
            navigate('/login', { replace: true });
          }}
        >
          Sign out
        </button>
      </div>
    </header>
  );
}
