import { NavLink } from 'react-router-dom';
import {
  Users,
  Building2,
  UmbrellaOff,
  ClipboardList,
  CalendarDays,
  FileText,
  Sun,
  Clock,
  ShieldCheck,
  ScrollText,
  UserCircle,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '../auth/useAuth.js';
import { hasPermission, type Permission } from '@naratala/shared';

interface Item {
  to: string;
  label: string;
  icon: LucideIcon;
  perm?: Permission;
}

const ITEMS: Item[] = [
  { to: '/employees', label: 'Employees', icon: Users, perm: 'employees:read:any' },
  { to: '/departments', label: 'Departments', icon: Building2 },
  { to: '/absence/me', label: 'My time off', icon: UmbrellaOff, perm: 'absence:read:self' },
  { to: '/absence', label: 'Absence queue', icon: ClipboardList, perm: 'absence:approve:reports' },
  { to: '/absence/calendar', label: 'Calendar', icon: CalendarDays, perm: 'absence:read:self' },
  { to: '/absence/settings/policies', label: 'Leave policies', icon: FileText, perm: 'absence:configure' },
  { to: '/absence/settings/holidays', label: 'Holidays', icon: Sun, perm: 'absence:configure' },
  { to: '/absence/settings/schedule', label: 'Working schedule', icon: Clock, perm: 'absence:configure' },
  { to: '/users', label: 'Users', icon: ShieldCheck, perm: 'users:read' },
  { to: '/audit', label: 'Audit', icon: ScrollText, perm: 'audit:read' },
  { to: '/settings/profile', label: 'Profile', icon: UserCircle },
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
          <NavLink key={it.to} to={it.to} className="nt-nav-item" end={it.to === '/absence'}>
            <span className="nt-nav-icon"><it.icon size={16} strokeWidth={1.75} /></span>
            <span className="nt-nav-label">{it.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
