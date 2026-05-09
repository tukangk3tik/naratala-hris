import { NavLink } from 'react-router-dom';
import { useAuth } from '../auth/useAuth.js';
import { hasPermission, type Permission } from '@naratala/shared';

interface Item {
  to: string;
  label: string;
  perm?: Permission;
}

const ITEMS: Item[] = [
  { to: '/employees', label: 'Employees', perm: 'employees:read:any' },
  { to: '/departments', label: 'Departments' },
  { to: '/absence/me', label: 'My time off', perm: 'absence:read:self' },
  { to: '/absence', label: 'Absence queue', perm: 'absence:approve:reports' },
  { to: '/absence/calendar', label: 'Calendar', perm: 'absence:read:self' },
  { to: '/absence/settings/policies', label: 'Leave policies', perm: 'absence:configure' },
  { to: '/absence/settings/holidays', label: 'Holidays', perm: 'absence:configure' },
  { to: '/absence/settings/schedule', label: 'Working schedule', perm: 'absence:configure' },
  { to: '/users', label: 'Users', perm: 'users:read' },
  { to: '/audit', label: 'Audit', perm: 'audit:read' },
  { to: '/settings/profile', label: 'Profile' },
];

export function Sidebar(): JSX.Element {
  const { user } = useAuth();
  const visible = ITEMS.filter((it) => !it.perm || (user && hasPermission(user.role, it.perm)));
  return (
    <aside className="nt-sidebar">
      <div className="nt-brand">
        <div className="nt-brand-text">
          <div className="nt-brand-name">Naratala</div>
          <div className="nt-brand-sub">People Studio</div>
        </div>
      </div>
      <nav className="nt-nav" aria-label="primary">
        {visible.map((it) => (
          <NavLink key={it.to} to={it.to} className="nt-nav-item">
            <span className="nt-nav-label">{it.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
