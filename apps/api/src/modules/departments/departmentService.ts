import type { DepartmentDTO } from '@naratala/shared';
import { AuthError, NotFoundError, ValidationError } from '../../shared/errors/index.js';
import type { DepartmentRepo, DepartmentRow } from './departmentRepo.js';

export interface DepartmentService {
  list(): Promise<DepartmentDTO[]>;
  create(name: string): Promise<DepartmentDTO>;
  update(id: number, name: string): Promise<DepartmentDTO>;
  remove(id: number): Promise<void>;
}

export function createDepartmentService(repo: DepartmentRepo): DepartmentService {
  async function list(): Promise<DepartmentDTO[]> {
    return (await repo.list()).map(toDto);
  }
  async function create(name: string): Promise<DepartmentDTO> {
    const existing = await repo.findByName(name);
    if (existing) throw new AuthError('EMAIL_TAKEN', 'department name already exists');
    const id = await repo.create(name);
    const row = await repo.findById(id);
    return toDto(row!);
  }
  async function update(id: number, name: string): Promise<DepartmentDTO> {
    const row = await repo.findById(id);
    if (!row) throw new NotFoundError('department not found');
    const conflict = await repo.findByName(name);
    if (conflict && conflict.id !== id) throw new AuthError('EMAIL_TAKEN', 'name in use');
    await repo.updateName(id, name);
    const updated = await repo.findById(id);
    return toDto(updated!);
  }
  async function remove(id: number): Promise<void> {
    const row = await repo.findById(id);
    if (!row) throw new NotFoundError('department not found');
    const n = await repo.countEmployees(id);
    if (n > 0)
      throw new ValidationError('department is referenced by employees', { employees: n });
    await repo.delete(id);
  }
  return { list, create, update, remove };
}

function toDto(row: DepartmentRow): DepartmentDTO {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
