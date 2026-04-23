import { z } from 'zod';
import { RoleEnum } from './common.js';

export const UserStatus = z.enum(['pending', 'active', 'disabled']);
export const Language = z.enum(['id', 'en']);

export const UserUpdate = z
  .object({
    role: RoleEnum.optional(),
    status: UserStatus.optional(),
    language: Language.optional(),
  })
  .strict();

export interface UserDTO {
  id: number;
  email: string;
  role: z.infer<typeof RoleEnum>;
  status: z.infer<typeof UserStatus>;
  language: z.infer<typeof Language>;
  mfaEnabled: boolean;
  mustChangePassword: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}
