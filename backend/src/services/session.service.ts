import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

export const SESSION_COOKIE = 'orbit_session';
export const CSRF_COOKIE = 'orbit_csrf';
export const OAUTH_STATE_COOKIE = 'orbit_oauth_state';

export interface SessionRecord {
  userId: string;
  csrfHash: string;
  createdAt: number;
  lastSeenAt: number;
  expiresAt: number;
}

export interface CreatedSession {
  id: string;
  csrfToken: string;
  expiresAt: number;
}

export interface AuthenticatedSession {
  record: SessionRecord;
  sessionHash: string;
}

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

function envNumber(name: string, fallback: number): number {
  const parsed = Number(process.env[name]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

const SESSION_TTL_MS = envNumber('SESSION_TTL_HOURS', 168) * HOUR;
const SESSION_IDLE_MS = envNumber('SESSION_IDLE_MINUTES', 120) * MINUTE;
const SESSION_ROTATE_MS = envNumber('SESSION_ROTATE_HOURS', 24) * HOUR;

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function randomToken(): string {
  return randomBytes(32).toString('base64url');
}

class SessionManager {
  private sessions = new Map<string, SessionRecord>();

  public create(userId: string): CreatedSession {
    this.cleanup();

    const id = randomToken();
    const csrfToken = randomToken();
    const now = Date.now();

    const record: SessionRecord = {
      userId,
      csrfHash: sha256(csrfToken),
      createdAt: now,
      lastSeenAt: now,
      expiresAt: now + SESSION_TTL_MS
    };

    this.sessions.set(sha256(id), record);

    return { id, csrfToken, expiresAt: record.expiresAt };
  }

  public authenticate(id: string): AuthenticatedSession | null {
    const sessionHash = sha256(id);
    const record = this.sessions.get(sessionHash);

    if (!record) return null;

    const now = Date.now();

    if (now >= record.expiresAt || now - record.lastSeenAt >= SESSION_IDLE_MS) {
      this.sessions.delete(sessionHash);
      return null;
    }

    record.lastSeenAt = now;

    return { record, sessionHash };
  }

  public rotate(id: string): CreatedSession | null {
    const sessionHash = sha256(id);
    const record = this.sessions.get(sessionHash);

    if (!record) return null;

    this.sessions.delete(sessionHash);
    return this.create(record.userId);
  }

  public needsRotation(record: SessionRecord): boolean {
    return Date.now() - record.createdAt >= SESSION_ROTATE_MS;
  }

  public destroy(id: string): void {
    this.sessions.delete(sha256(id));
  }

  public destroyByUserId(userId: string): void {
    for (const [hash, record] of this.sessions.entries()) {
      if (record.userId === userId) {
        this.sessions.delete(hash);
      }
    }
  }

  public remainingLifetimeSeconds(record: SessionRecord): number {
    return Math.max(0, Math.floor((record.expiresAt - Date.now()) / 1000));
  }

  public verifyCsrf(token: string, csrfHash: string): boolean {
    if (!token) return false;

    const computed = createHash('sha256').update(token).digest();
    const expected = Buffer.from(csrfHash, 'hex');

    if (computed.length !== expected.length) return false;

    return timingSafeEqual(computed, expected);
  }

  private cleanup(): void {
    const now = Date.now();

    for (const [hash, record] of this.sessions.entries()) {
      if (now >= record.expiresAt || now - record.lastSeenAt >= SESSION_IDLE_MS) {
        this.sessions.delete(hash);
      }
    }
  }
}

export const sessionManager = new SessionManager();
