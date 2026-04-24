import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createTestDb, type TestDb } from '../../test/db.js';
import { createRefreshTokenRepo } from './refreshTokenRepo.js';
import { createRefreshTokenService } from './refreshTokenService.js';
import { users } from '../../shared/db/schema.js';
import { AuthError } from '../../shared/errors/index.js';

describe('refreshTokenService', () => {
  let ctx: TestDb;
  let userId = 0;

  beforeAll(async () => {
    ctx = await createTestDb();
    const [row] = await ctx.db
      .insert(users)
      .values({
        email: 'rt@naratala.local',
        passwordHash: 'x',
        role: 'employee',
        status: 'active',
      })
      .$returningId();
    userId = row!.id;
  });
  afterAll(async () => {
    await ctx.drop();
  });
  beforeEach(async () => {
    const conn = await ctx.pool.getConnection();
    await conn.query('DELETE FROM refresh_tokens');
    conn.release();
  });

  function build() {
    const repo = createRefreshTokenRepo(ctx.db);
    return { repo, svc: createRefreshTokenService({ repo, ttlMs: 1000 * 60 * 60 * 24 * 30 }) };
  }

  it('issue → rotate produces a new token and invalidates the old', async () => {
    const { svc } = build();
    const first = await svc.issueNew({ userId });
    const second = await svc.rotate({ rawToken: first.rawToken });
    expect(second.rawToken).not.toBe(first.rawToken);

    await expect(svc.rotate({ rawToken: first.rawToken })).rejects.toMatchObject({
      code: 'TOKEN_REUSED',
    });
  });

  it('reuse-detection revokes the entire family', async () => {
    const { svc } = build();
    const a = await svc.issueNew({ userId });
    const b = await svc.rotate({ rawToken: a.rawToken });
    const c = await svc.rotate({ rawToken: b.rawToken });

    // attacker reuses `a`
    await expect(svc.rotate({ rawToken: a.rawToken })).rejects.toMatchObject({
      code: 'TOKEN_REUSED',
    });

    // legitimate user tries `c` — should also fail because family was revoked
    await expect(svc.rotate({ rawToken: c.rawToken })).rejects.toBeInstanceOf(AuthError);
  });

  it('rejects expired tokens', async () => {
    const repo = createRefreshTokenRepo(ctx.db);
    const svc = createRefreshTokenService({ repo, ttlMs: -1 });
    const expired = await svc.issueNew({ userId });
    await expect(svc.rotate({ rawToken: expired.rawToken })).rejects.toMatchObject({
      code: 'TOKEN_EXPIRED',
    });
  });

  it('rejects unknown tokens', async () => {
    const { svc } = build();
    await expect(svc.rotate({ rawToken: 'unknown-token' })).rejects.toMatchObject({
      code: 'TOKEN_EXPIRED',
    });
  });
});
