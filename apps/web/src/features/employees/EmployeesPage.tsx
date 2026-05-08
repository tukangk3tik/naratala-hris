import { useParams } from 'react-router-dom';
import { useState } from 'react';
import { useEmployeesQuery, type EmployeeFilters } from './hooks.js';
import { EmployeeFilters as Filters } from './EmployeeFilters.js';
import { EmployeeTable } from './EmployeeTable.js';
import { EmployeeDrawer } from './EmployeeDrawer.js';
import { Card } from '../../shared/ui/Card.js';

export function EmployeesPage(): JSX.Element {
  const params = useParams<{ id?: string }>();
  const [filters, setFilters] = useState<EmployeeFilters>({ page: 1, pageSize: 25 });
  const q = useEmployeesQuery(filters);
  return (
    <div className="nt-employees-page">
      <Card title="Employees">
        <Filters value={filters} onChange={setFilters} />
        {q.isLoading && <p>Loading…</p>}
        {q.data && <EmployeeTable rows={q.data.data} />}
      </Card>
      {params.id && <EmployeeDrawer id={Number(params.id)} />}
    </div>
  );
}
