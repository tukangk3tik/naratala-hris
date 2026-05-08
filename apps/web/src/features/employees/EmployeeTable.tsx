import type { EmployeeDTO } from '@naratala/shared';
import { useNavigate } from 'react-router-dom';
import { Avatar } from '../../shared/ui/Avatar.js';
import { Pill } from '../../shared/ui/Pill.js';

export function EmployeeTable({ rows }: { rows: EmployeeDTO[] }): JSX.Element {
  const nav = useNavigate();
  return (
    <table className="nt-table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Position</th>
          <th>Department</th>
          <th>Type</th>
          <th>Status</th>
          <th>Hired</th>
          <th>Salary</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((e) => (
          <tr key={e.id} onClick={() => nav(`/employees/${e.id}`)} className="nt-tr-clickable">
            <td>
              <div className="nt-cell-with-avatar">
                <Avatar name={e.fullName} hue={e.avatarColorHue} size={28} />
                <span>{e.fullName}</span>
              </div>
            </td>
            <td>{e.position}</td>
            <td>{e.departmentName ?? '—'}</td>
            <td>{e.employmentType.replace('_', ' ')}</td>
            <td>
              <Pill tone={e.employmentStatus === 'active' ? 'good' : 'neutral'}>
                {e.employmentStatus}
              </Pill>
            </td>
            <td>{e.hireDate}</td>
            <td>{e.salaryAmount ?? '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
