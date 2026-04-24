import type { Role, UserDTO } from '@naratala/shared';
import { NotFoundError, ValidationError } from '../../shared/errors/index.js';
import type { UserRepo, UserStatus } from '../auth/userRepo.js';
import type { RefreshTokenService } from '../auth/refreshTokenService.js';
import { toUserDTO } from '../auth/userDto.js';

interface Deps {
  users: UserRepo;
  refresh: RefreshTokenService;
}

export interface UserService {
  list(
    page: number,
    pageSize: number,
  ): Promise<{ data: UserDTO[]; page: number; pageSize: number; total: number }>;
  patch(
    actorId: number,
    targetId: number,
    input: { role?: Role; status?: UserStatus; language?: 'id' | 'en' },
  ): Promise<UserDTO>;
  forceLogout(targetId: number): Promise<void>;
}

export function createUserService(deps: Deps): UserService {
  async function list(page: number, pageSize: number) {
    const { rows, total } = await deps.users.listPaginated({ page, pageSize });
    return { data: rows.map(toUserDTO), page, pageSize, total };
  }

  async function patch(
    actorId: number,
    targetId: number,
    input: { role?: Role; status?: UserStatus; language?: 'id' | 'en' },
  ): Promise<UserDTO> {
    const target = await deps.users.findById(targetId);
    if (!target) throw new NotFoundError('user not found');

    const willDemoteAdmin =
      target.role === 'admin' && input.role !== undefined && input.role !== 'admin';
    const willDisable = target.status === 'active' && input.status === 'disabled';

    if (actorId === targetId && input.status === 'disabled') {
      throw new ValidationError('cannot disable yourself');
    }
    if (willDemoteAdmin || (willDisable && target.role === 'admin')) {
      const admins = await deps.users.countAdmins();
      if (admins <= 1) throw new ValidationError('cannot remove the last admin');
    }

    await deps.users.patch(targetId, input);
    const updated = await deps.users.findById(targetId);
    return toUserDTO(updated!);
  }

  async function forceLogout(targetId: number): Promise<void> {
    const target = await deps.users.findById(targetId);
    if (!target) throw new NotFoundError('user not found');
    await deps.refresh.revokeAllForUser(targetId);
  }

  return { list, patch, forceLogout };
}
