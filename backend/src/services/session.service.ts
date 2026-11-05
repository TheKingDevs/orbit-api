import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import type { Collection } from 'mongodb';
import { getDatabase } from '@services/mongo.service';
import { Logger } from '@utils/logger';

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

interface SessionDocument extends SessionRecord {
  _id: string;
  expiresAtDate: Date;
}

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const SESSION_TOUCH_INTERVAL_MS = 5 * MINUTE;

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
  private lastPersistedAt = new Map<string, number>();
  private collection: Collection<SessionDocument> | null = null;

  public async init(): Promise<void> {
    const mongoDatabase = getDatabase();

    if (!mongoDatabase) return;

    this.collection = mongoDatabase.collection<SessionDocument>('sessions');

    await Promise.all([
      this.collection.createIndex({ expiresAtDate: 1 }, { expireAfterSeconds: 0 }),
      this.collection.createIndex({ userId: 1 })
    ]);

    const now = Date.now();
    const documents = await this.collection.find({ expiresAt: { $gt: now } }).toArray();

    this.sessions.clear();
    this.lastPersistedAt.clear();

    for (const document of documents) {
      if (now - document.lastSeenAt >= SESSION_IDLE_MS) {
        void this.collection.deleteOne({ _id: document._id }).catch(() => undefined);
        continue;
      }

      this.sessions.set(document._id, {
        userId: document.userId,
        csrfHash: document.csrfHash,
        createdAt: document.createdAt,
        lastSeenAt: document.lastSeenAt,
        expiresAt: document.expiresAt
      });
      this.lastPersistedAt.set(document._id, now);
    }

    Logger.success(
      `${this.sessions.size} sessão(ões) restaurada(s) do MongoDB.`,
      'MongoDB'
    );
  }

  public async create(userId: string): Promise<CreatedSession> {
    this.cleanup();

    const id = randomToken();
    const csrfToken = randomToken();
    const now = Date.now();
    const sessionHash = sha256(id);

    const record: SessionRecord = {
      userId,
      csrfHash: sha256(csrfToken),
      createdAt: now,
      lastSeenAt: now,
      expiresAt: now + SESSION_TTL_MS
    };

    this.sessions.set(sessionHash, record);
    this.lastPersistedAt.set(sessionHash, now);

    if (this.collection) {
      try {
        await this.collection.insertOne({
          _id: sessionHash,
          ...record,
          expiresAtDate: new Date(record.expiresAt)
        });
      } catch (error) {
        this.sessions.delete(sessionHash);
        this.lastPersistedAt.delete(sessionHash);
        throw error;
      }
    }

    return { id, csrfToken, expiresAt: record.expiresAt };
  }

  public authenticate(id: string): AuthenticatedSession | null {
    const sessionHash = sha256(id);
    const record = this.sessions.get(sessionHash);

    if (!record) return null;

    const now = Date.now();

    if (now >= record.expiresAt || now - record.lastSeenAt >= SESSION_IDLE_MS) {
      this.destroy(id);
      return null;
    }

    record.lastSeenAt = now;
    this.touch(sessionHash, record);

    return { record, sessionHash };
  }

  public async rotate(id: string): Promise<CreatedSession | null> {
    const sessionHash = sha256(id);
    const record = this.sessions.get(sessionHash);

    if (!record) return null;

    const created = await this.create(record.userId);

    this.sessions.delete(sessionHash);
    this.lastPersistedAt.delete(sessionHash);

    if (this.collection) {
      void this.collection.deleteOne({ _id: sessionHash }).catch(error => {
        const message = error instanceof Error ? error.message : String(error);
        Logger.error(`Falha ao remover sessão antiga: ${message}`, 'MongoDB');
      });
    }

    return created;
  }

  public needsRotation(record: SessionRecord): boolean {
    return Date.now() - record.createdAt >= SESSION_ROTATE_MS;
  }

  public destroy(id: string): void {
    const sessionHash = sha256(id);
    this.sessions.delete(sessionHash);
    this.lastPersistedAt.delete(sessionHash);

    if (this.collection) {
      void this.collection.deleteOne({ _id: sessionHash }).catch(error => {
        const message = error instanceof Error ? error.message : String(error);
        Logger.error(`Falha ao remover sessão: ${message}`, 'MongoDB');
      });
    }
  }

  public async destroyByUserId(userId: string): Promise<void> {
    for (const [hash, record] of this.sessions.entries()) {
      if (record.userId === userId) {
        this.sessions.delete(hash);
        this.lastPersistedAt.delete(hash);
      }
    }

    if (this.collection) {
      await this.collection.deleteMany({ userId });
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

  private touch(sessionHash: string, record: SessionRecord): void {
    if (!this.collection) return;

    const now = Date.now();
    const lastPersisted = this.lastPersistedAt.get(sessionHash) ?? 0;

    if (now - lastPersisted < SESSION_TOUCH_INTERVAL_MS) return;

    this.lastPersistedAt.set(sessionHash, now);

    void this.collection.updateOne(
      { _id: sessionHash },
      { $set: { lastSeenAt: record.lastSeenAt } }
    ).catch(error => {
      const message = error instanceof Error ? error.message : String(error);
      Logger.error(`Falha ao atualizar sessão: ${message}`, 'MongoDB');
    });
  }

  private cleanup(): void {
    const now = Date.now();

    for (const [hash, record] of this.sessions.entries()) {
      if (now >= record.expiresAt || now - record.lastSeenAt >= SESSION_IDLE_MS) {
        this.sessions.delete(hash);
        this.lastPersistedAt.delete(hash);

        if (this.collection) {
          void this.collection.deleteOne({ _id: hash }).catch(() => undefined);
        }
      }
    }
  }
}

export const sessionManager = new SessionManager();
