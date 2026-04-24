import { randomUUID } from 'node:crypto';
import { AuthError } from '../../shared/errors/index.js';
import { newOpaqueToken, sha256Hex } from './opaqueToken.js';
import type { RefreshTokenRepo } from './refreshTokenRepo.js';

export interface IssueResult {
  rawToken: string;
  expiresAt: Date;
  familyId: string;
}

interface Config {
  repo: RefreshTokenRepo;
  ttlMs: number;
}

export interface RefreshTokenService {
  issueNew: (input: {
    userId: number;
    familyId?: string;
    userAgent?: string | null;
    ip?: string | null;
  }) => Promise<IssueResult>;
  rotate: (input: {
    rawToken: string;
    userAgent?: string | null;
    ip?: string | null;
  }) => Promise<IssueResult & { userId: number }>;
  revokeByToken: (rawToken: string) => Promise<void>;
  revokeAllForUser: (userId: number) => Promise<void>;
}

export function createRefreshTokenService(cfg: Config): RefreshTokenService {
  async function issueNew(input: {
    userId: number;
    familyId?: string;
    userAgent?: string | null;
    ip?: string | null;
  }): Promise<IssueResult> {
    const rawToken = newOpaqueToken();
    const tokenHash = sha256Hex(rawToken);
    const issuedAt = new Date();
    const expiresAt = new Date(issuedAt.getTime() + cfg.ttlMs);
    const familyId = input.familyId ?? randomUUID();
    await cfg.repo.insert({
      userId: input.userId,
      familyId,
      tokenHash,
      issuedAt,
      expiresAt,
      userAgent: input.userAgent ?? null,
      ip: input.ip ?? null,
    });
    return { rawToken, expiresAt, familyId };
  }

  async function rotate(input: {
    rawToken: string;
    userAgent?: string | null;
    ip?: string | null;
  }): Promise<IssueResult & { userId: number }> {
    const hash = sha256Hex(input.rawToken);
    const row = await cfg.repo.findByHash(hash);
    if (!row) throw new AuthError('TOKEN_EXPIRED', 'unknown refresh token');
    if (row.expiresAt.getTime() < Date.now())
      throw new AuthError('TOKEN_EXPIRED', 'refresh expired');
    if (row.revokedAt) {
      await cfg.repo.revokeFamily(row.familyId);
      throw new AuthError('TOKEN_REUSED', 'refresh token reuse detected');
    }

    const issued = await issueNew({
      userId: row.userId,
      familyId: row.familyId,
      userAgent: input.userAgent ?? null,
      ip: input.ip ?? null,
    });
    const newRow = await cfg.repo.findByHash(sha256Hex(issued.rawToken));
    if (newRow) await cfg.repo.markReplaced(row.id, newRow.id);
    return { ...issued, userId: row.userId };
  }

  async function revokeByToken(rawToken: string): Promise<void> {
    const row = await cfg.repo.findByHash(sha256Hex(rawToken));
    if (row) await cfg.repo.revokeFamily(row.familyId);
  }

  async function revokeAllForUser(userId: number): Promise<void> {
    await cfg.repo.revokeAllForUser(userId);
  }

  return { issueNew, rotate, revokeByToken, revokeAllForUser };
}
