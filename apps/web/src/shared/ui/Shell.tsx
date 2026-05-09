import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar.js';
import { TopBar } from './TopBar.js';

const TITLES: Record<string, string> = {
  '/employees': 'Employees',
  '/departments': 'Departments',
  '/users': 'Users',
  '/audit': 'Audit',
  '/settings/profile': 'Profile',
  '/absence/me': 'My time off',
  '/absence/calendar': 'Calendar',
  '/absence/settings/policies': 'Leave policies',
  '/absence/settings/holidays': 'Holidays',
  '/absence/settings/schedule': 'Working schedule',
  '/absence': 'Absence queue',
  '/payroll/me': 'My payslips',
  '/payroll/runs': 'Pay run detail',
  '/payroll': 'Payroll',
};

export function Shell(): JSX.Element {
  const loc = useLocation();
  const key = Object.keys(TITLES).find((k) => loc.pathname.startsWith(k)) ?? '/employees';
  return (
    <div className="nt-shell">
      <Sidebar />
      <main className="nt-main">
        <TopBar title={TITLES[key] ?? ''} />
        <div className="nt-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
