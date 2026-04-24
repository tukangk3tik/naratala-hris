import type { UserDTO } from '@naratala/shared';
import type { UserRow } from './userRepo.js';

export function toUserDTO(row: UserRow): UserDTO {
  return {
    id: row.id,
    email: row.email,
    role: row.role,
    status: row.status,
    language: row.language,
    mfaEnabled: row.mfaEnabled,
    mustChangePassword: row.mustChangePassword,
    lastLoginAt: row.lastLoginAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
