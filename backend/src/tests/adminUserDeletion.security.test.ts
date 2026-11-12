import { afterAll, describe, expect, test } from 'bun:test';
import { adminUserDetailRoute } from '@routes/admin/userDetail';
import { SESSION_COOKIE, CSRF_COOKIE, sessionManager } from '@services/session.service';
import { getDatabase } from '@services/mongo.service';
import { db } from '@utils/db.util';
import type { User } from '@models/User';

const createdIds: string[] = [];

function testUser(role: User['role'], email: string): User {
  const apiKey = db.generateApiKey();
  return {
    id: db.generateId(),
    email,
    apiKey,
    token: apiKey,
    plan: 'free',
    role,
    dailyRequests: 0,
    lastResetDate: new Date().toISOString().slice(0, 10),
    monthlyRequests: 0,
    lastMonthlyResetMonth: new Date().toISOString().slice(0, 7),
    violationCount: 0
  };
}

describe('security: admin user deletion', () => {
  test('owner can delete a disposable account and its request access is revoked', async () => {
    // This check prevents this destructive-path validation from ever touching a connected database.
    expect(getDatabase()).toBeNull();

    const owner = testUser('owner', `security-owner-${crypto.randomUUID()}@example.invalid`);
    const disposable = testUser('public', `security-delete-${crypto.randomUUID()}@example.invalid`);
    createdIds.push(owner.id, disposable.id);
    await db.addUser(owner);
    await db.addUser(disposable);

    const session = await sessionManager.create(owner.id);
    const request = new Request(`http://localhost/api/admin/users/${disposable.id}`, {
      method: 'DELETE',
      headers: {
        cookie: `${SESSION_COOKIE}=${session.id}; ${CSRF_COOKIE}=${session.csrfToken}`,
        'x-csrf-token': session.csrfToken
      }
    });

    try {
      const response = await adminUserDetailRoute(request, new URL(request.url));
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ success: true });
      expect(db.findById(disposable.id)).toBeUndefined();
    } finally {
      await sessionManager.destroy(session.id);
      if (db.findById(disposable.id)) await db.deleteUserById(disposable.id);
      await db.deleteUserById(owner.id);
    }
  });

  afterAll(async () => {
    // Test-only records live in memory because the database guard above refuses a Mongo connection.
    for (const id of createdIds) {
      const user = db.findById(id);
      if (user && (user.email.startsWith('security-owner-') || user.email.startsWith('security-delete-'))) {
        await db.deleteUserById(id);
      }
    }
  });
});
