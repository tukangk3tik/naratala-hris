import { z } from 'zod';

export const DepartmentCreate = z
  .object({
    name: z.string().trim().min(1).max(80),
  })
  .strict();

export const DepartmentUpdate = DepartmentCreate.partial();

export interface DepartmentDTO {
  id: number;
  name: string;
  createdAt: string;
  updatedAt: string;
}
