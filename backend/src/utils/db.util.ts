import { createHash, randomBytes, randomUUID } from 'node:crypto';
import type { Collection } from 'mongodb';
import { User } from '@models/User';
import { IUserService } from '@interface/IUser';
import { UnauthorizedError, ForbiddenError, RateLimitError } from '@errors/index';
import { Logger } from '@utils/logger';
import { sessionManager } from '@services/session.service';
import { getDatabase } from '@services/mongo.service';
import {
  decryptSensitive,
  encryptSensitive,
  ensureDataSecurityConfigured,
  hashEmail,
  hashSensitive,
  normalizeEmail
} from '@utils/dataCrypto.util';

interface RateLimitTracker {
  timestamps: number[];
  tempBlockUntil: number;
  violations: number;
  lastSeenAt: number;
  lastViolationAt: number;
}

const MAX_RATE_LIMIT_TRACKERS = 50_000;
const RATE_LIMIT_TRACKER_TTL_MS = 60 * 60 * 1000;
const RATE_LIMIT_CLEANUP_INTERVAL_MS = 60 * 1000;
const LEGACY_AUTOBAN_REASON = 'Banido permanentemente por 3 tentativas de ataques DDoS / RateLimit violado.';

interface RequestRecordInput {
  method: string;
  path: string;
  status: number;
  timestamp: number;
  durationMs: number;
}

export interface RequestRecord extends RequestRecordInput {
  id: string;
}

export interface UsageStats {
  daily: Array<{ date: string; count: number }>;
  recent: RequestRecord[];
  topEndpoints: Array<{ path: string; count: number }>;
  totalRequests: number;
}

interface UserDocument {
  _id: string;
  plan: User['plan'];
  role: User['role'];
  dailyRequests: number;
  lastResetDate: string;
  violationCount: number;
  apiKeyHash?: string;
  apiKeyEnc?: string;
  tokenHash?: string;
  tokenEnc?: string;
  emailHash?: string;
  emailEnc?: string;
  nameEnc?: string;
  pictureEnc?: string;
  googleSubjectHash?: string;
  isSuspended?: boolean;
  suspensionReasonEnc?: string;
  docsPreviewDate?: string;
  docsPreviewCount?: number;
  createdAt?: Date;
  updatedAt?: Date;
  apiKey?: string;
  token?: string;
  email?: string;
  name?: string;
  picture?: string;
  googleSubject?: string;
  suspensionReason?: string;
}

interface PersistedUserFields {
  apiKeyHash: string;
  apiKeyEnc: string;
  emailHash: string;
  emailEnc: string;
  plan: User['plan'];
  role: User['role'];
  dailyRequests: number;
  lastResetDate: string;
  violationCount: number;
  nameEnc?: string;
  pictureEnc?: string;
  googleSubjectHash?: string;
  isSuspended?: boolean;
  suspensionReasonEnc?: string;
  docsPreviewDate?: string;
  docsPreviewCount?: number;
}

type MutableUserFields = Omit<
  PersistedUserFields,
  'apiKeyHash' | 'apiKeyEnc' | 'emailHash' | 'emailEnc' | 'nameEnc' | 'pictureEnc' | 'googleSubjectHash'
>;

interface RequestRecordDocument {
  _id: string;
  userId: string;
  method: string;
  path: string;
  status: number;
  timestamp: Date;
  durationMs: number;
}

const REQUEST_RETENTION_SECONDS = 30 * 24 * 60 * 60;

const LEGACY_USER_FIELDS = {
  token: '',
  tokenHash: '',
  tokenEnc: '',
  apiKey: '',
  email: '',
  name: '',
  picture: '',
  googleSubject: '',
  suspensionReason: ''
} as const;

function buildMutableFields(user: User): MutableUserFields {
  const fields: MutableUserFields = {
    plan: user.plan,
    role: user.role,
    dailyRequests: user.dailyRequests,
    lastResetDate: user.lastResetDate,
    violationCount: user.violationCount ?? 0
  };

  if (user.isSuspended !== undefined) fields.isSuspended = user.isSuspended;
  if (user.suspensionReason !== undefined) {
    fields.suspensionReasonEnc = encryptSensitive(user.suspensionReason);
  }
  if (user.docsPreviewDate !== undefined) fields.docsPreviewDate = user.docsPreviewDate;
  if (user.docsPreviewCount !== undefined) fields.docsPreviewCount = user.docsPreviewCount;

  return fields;
}

function buildUserFields(user: User): PersistedUserFields {
  const key = user.apiKey || user.token || '';
  return {
    ...buildMutableFields(user),
    apiKeyHash: hashSensitive(key),
    apiKeyEnc: encryptSensitive(key),
    emailHash: hashEmail(user.email),
    emailEnc: encryptSensitive(user.email),
    ...(user.name !== undefined ? { nameEnc: encryptSensitive(user.name) } : {}),
    ...(user.picture !== undefined ? { pictureEnc: encryptSensitive(user.picture) } : {}),
    ...(user.googleSubjectHash !== undefined
      ? { googleSubjectHash: user.googleSubjectHash }
      : {})
  };
}

function fromUserDocument(document: UserDocument): User {
  const apiKey = document.apiKeyEnc
    ? decryptSensitive(document.apiKeyEnc)
    : document.apiKey
    ? document.apiKey
    : document.tokenEnc
    ? decryptSensitive(document.tokenEnc)
    : document.token;

  const email = document.emailEnc
    ? decryptSensitive(document.emailEnc)
    : document.email;

  if (!apiKey) {
    throw new Error(`API Key ausente no usuário ${document._id}.`);
  }

  if (!email) {
    throw new Error(`E-mail ausente no usuário ${document._id}.`);
  }

  return {
    id: document._id,
    email,
    apiKey,
    token: apiKey,
    plan: document.plan,
    role: document.role,
    dailyRequests: document.dailyRequests,
    lastResetDate: document.lastResetDate,
    violationCount: document.violationCount ?? 0,
    ...(document.nameEnc
      ? { name: decryptSensitive(document.nameEnc) }
      : document.name != null
        ? { name: document.name }
        : {}),
    ...(document.pictureEnc
      ? { picture: decryptSensitive(document.pictureEnc) }
      : document.picture != null
        ? { picture: document.picture }
        : {}),
    ...(document.googleSubjectHash
      ? { googleSubjectHash: document.googleSubjectHash }
      : document.googleSubject
        ? { googleSubjectHash: hashSensitive(document.googleSubject) }
        : {}),
    ...(document.isSuspended != null ? { isSuspended: document.isSuspended } : {}),
    ...(document.suspensionReasonEnc
      ? { suspensionReason: decryptSensitive(document.suspensionReasonEnc) }
      : document.suspensionReason != null
        ? { suspensionReason: document.suspensionReason }
        : {}),
    ...(document.docsPreviewDate != null ? { docsPreviewDate: document.docsPreviewDate } : {}),
    ...(document.docsPreviewCount != null ? { docsPreviewCount: document.docsPreviewCount } : {})
  };
}

function needsUserMigration(document: UserDocument): boolean {
  const hasLegacyField = (Object.keys(LEGACY_USER_FIELDS) as Array<keyof typeof LEGACY_USER_FIELDS>)
    .some(key => document[key] !== undefined);

  return (
    hasLegacyField ||
    !document.apiKeyHash ||
    !document.apiKeyEnc ||
    !document.emailHash ||
    !document.emailEnc
  );
}

function getDocsPreviewDailyLimit(): number {
  const parsed = Number(process.env.DOCS_PREVIEW_DAILY_LIMIT);

  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 100;
}

class UserDatabase implements IUserService {
  private users: Map<string, User> = new Map();
  private tokenRateLimits: Map<string, RateLimitTracker> = new Map();
  private fingerprintRateLimits: Map<string, RateLimitTracker> = new Map();
  private lastRateLimitCleanupAt = 0;
  private requestHistory: Map<string, RequestRecord[]> = new Map();
  private requestDailyUsage: Map<string, Map<string, number>> = new Map();
  private requestEndpointUsage: Map<string, Map<string, number>> = new Map();
  private usersCollection: Collection<UserDocument> | null = null;
  private requestCollection: Collection<RequestRecordDocument> | null = null;

  constructor() {
    this.seedDefaultUsersInMemory();
  }

  private getDefaultSeeds(): User[] {
    const isProduction = process.env.NODE_ENV === 'production';
    const ownerEmail = process.env.OWNER_EMAIL?.trim().toLowerCase();

    const seeds: User[] = [
      ...(ownerEmail ? [{
        id: 'usr-owner-01',
        email: ownerEmail,
        apiKey: process.env.OWNER_API_KEY ?? (isProduction ? '' : 'secret-owner-token'),
        token: process.env.OWNER_API_KEY ?? (isProduction ? '' : 'secret-owner-token'),
        plan: 'gold' as const,
        role: 'owner' as const,
        dailyRequests: 0,
        lastResetDate: this.getTodayDateString(),
        violationCount: 0
      }] : []),
      {
        id: 'usr-admin-01',
        email: 'admin@orbit.com',
        apiKey: process.env.ADMIN_API_KEY ?? (isProduction ? '' : 'secret-admin-token'),
        token: process.env.ADMIN_API_KEY ?? (isProduction ? '' : 'secret-admin-token'),
        plan: 'basic',
        role: 'admin',
        dailyRequests: 0,
        lastResetDate: this.getTodayDateString(),
        violationCount: 0
      },
      {
        id: 'usr-free-01',
        email: 'user@free.com',
        apiKey: process.env.PUBLIC_API_KEY ?? (isProduction ? '' : 'public-token'),
        token: process.env.PUBLIC_API_KEY ?? (isProduction ? '' : 'public-token'),
        plan: 'free',
        role: 'public',
        dailyRequests: 0,
        lastResetDate: this.getTodayDateString(),
        violationCount: 0
      }
    ];

    return seeds.filter(seed => Boolean(seed.apiKey || seed.token));
  }

  private seedDefaultUsersInMemory(): void {
    for (const seed of this.getDefaultSeeds()) {
      this.addUserInMemory(seed);
    }
  }

  private addUserInMemory(user: User): User {
    user.violationCount = user.violationCount || 0;
    const key = user.apiKey || user.token || '';
    user.apiKey = key;
    user.token = key;
    this.users.set(key, user);
    return user;
  }

  public async init(): Promise<void> {
    const mongoDatabase = getDatabase();

    if (!mongoDatabase) {
      Logger.warning('Persistência MongoDB desativada; usando memória.', 'MongoDB');
      return;
    }

    ensureDataSecurityConfigured();

    this.usersCollection = mongoDatabase.collection<UserDocument>('users');
    this.requestCollection = mongoDatabase.collection<RequestRecordDocument>('request_records');

    await this.dropLegacyIndexes();

    const documents = await this.usersCollection.find({}).toArray();

    this.users.clear();

    for (const document of documents) {
      const user = fromUserDocument(document);
      const wasRateLimitAutoBanned = user.isSuspended && user.suspensionReason === LEGACY_AUTOBAN_REASON;
      if (wasRateLimitAutoBanned) {
        user.isSuspended = false;
        user.suspensionReason = undefined;
        user.violationCount = 0;
      }
      this.addUserInMemory(user);

      if (wasRateLimitAutoBanned || needsUserMigration(document)) {
        await this.persistUser(user);
      }
    }

    await this.createIndexes();

    const ownerEmail = process.env.OWNER_EMAIL?.trim().toLowerCase();
    if (ownerEmail) {
      for (const user of this.users.values()) {
        const isConfiguredOwner = user.email.trim().toLowerCase() === ownerEmail;
        const nextRole = isConfiguredOwner ? 'owner' : user.role === 'owner' ? 'public' : user.role;
        const nextPlan = isConfiguredOwner ? 'gold' : user.plan;
        if (user.role === nextRole && user.plan === nextPlan) continue;
        user.role = nextRole;
        user.plan = nextPlan;
        await this.saveUser(user);
      }
    }

    for (const seed of this.getDefaultSeeds()) {
      if (this.findById(seed.id) || this.findByEmail(seed.email)) continue;
      await this.addUser(seed);
    }

    Logger.success(
      `MongoDB pronto: ${this.users.size} usuário(s) carregado(s).`,
      'MongoDB'
    );
  }

  private async dropLegacyIndexes(): Promise<void> {
    if (!this.usersCollection) return;

    for (const indexName of ['token_1', 'tokenHash_1', 'email_1', 'googleSubject_1']) {
      try {
        await this.usersCollection.dropIndex(indexName);
      } catch (error) {
        const code = (error as { code?: number }).code;

        if (code !== 26 && code !== 27) throw error;
      }
    }
  }

  private async createIndexes(): Promise<void> {
    if (!this.usersCollection || !this.requestCollection) return;

    await Promise.all([
      this.usersCollection.createIndex({ apiKeyHash: 1 }, { unique: true }),
      this.usersCollection.createIndex({ emailHash: 1 }),
      this.usersCollection.createIndex(
        { googleSubjectHash: 1 },
        {
          unique: true,
          partialFilterExpression: { googleSubjectHash: { $type: 'string' } }
        }
      ),
      this.requestCollection.createIndex({ userId: 1, timestamp: -1 }),
      this.requestCollection.createIndex(
        { timestamp: 1 },
        { expireAfterSeconds: REQUEST_RETENTION_SECONDS }
      )
    ]);
  }

  public async addUser(user: User): Promise<User> {
    this.addUserInMemory(user);

    try {
      await this.persistUser(user);
    } catch (error) {
      this.users.delete(user.apiKey || user.token);
      throw error;
    }

    return user;
  }

  public async saveUser(user: User): Promise<void> {
    const key = user.apiKey || user.token;
    user.apiKey = key;
    user.token = key;
    this.users.set(key, user);
    await this.persistUser(user);
  }

  private async persistUser(user: User, includeSensitive: boolean = true): Promise<void> {
    if (!this.usersCollection) return;

    const now = new Date();
    const fields = includeSensitive
      ? buildUserFields(user)
      : buildMutableFields(user);
    const unsetFields: Record<string, ''> = { ...LEGACY_USER_FIELDS };

    if (includeSensitive) {
      if (user.name === undefined) unsetFields.nameEnc = '';
      if (user.picture === undefined) unsetFields.pictureEnc = '';
      if (user.googleSubjectHash === undefined) unsetFields.googleSubjectHash = '';
      if (user.suspensionReason === undefined) unsetFields.suspensionReasonEnc = '';
    }

    await this.usersCollection.updateOne(
      { _id: user.id },
      {
        $set: {
          ...fields,
          updatedAt: now
        },
        $setOnInsert: {
          createdAt: now
        },
        $unset: unsetFields
      },
      { upsert: includeSensitive }
    );
  }

  private scheduleUserSave(user: User): void {
    if (!this.usersCollection) return;

    void this.persistUser(user, false).catch(error => {
      const message = error instanceof Error ? error.message : String(error);
      Logger.error(`Falha ao salvar usuário ${user.id}: ${message}`, 'MongoDB');
    });
  }

  private getTodayDateString(): string {
    return new Date().toISOString().split('T')[0];
  }

  public findByApiKey(apiKey: string): User | undefined {
    return this.users.get(apiKey);
  }

  public findByToken(token: string): User | undefined {
    return this.findByApiKey(token);
  }

  public findById(id: string): User | undefined {
    return Array.from(this.users.values()).find(u => u.id === id);
  }

  public findByEmail(email: string): User | undefined {
    const normalized = normalizeEmail(email);

    return Array.from(this.users.values()).find(
      u => normalizeEmail(u.email) === normalized
    );
  }

  public findByGoogleSubject(subject: string): User | undefined {
    const subjectHash = hashSensitive(subject);

    return Array.from(this.users.values()).find(
      u => u.googleSubjectHash === subjectHash
    );
  }

  public generateApiKey(): string {
    return `orb_${randomBytes(32).toString('base64url')}`;
  }

  public generateToken(): string {
    return this.generateApiKey();
  }

  public generateId(): string {
    return `usr-${randomUUID()}`;
  }

  public getAllUsers(): User[] {
    return Array.from(this.users.values());
  }

  public async deleteUserById(id: string): Promise<boolean> {
    const user = this.findById(id);

    if (!user) return false;

    if (this.usersCollection) {
      await this.usersCollection.deleteOne({ _id: id });
    }

    if (this.requestCollection) {
      await this.requestCollection.deleteMany({ userId: id });
    }

    await sessionManager.destroyByUserId(id);

    this.users.delete(user.apiKey || user.token);
    this.requestHistory.delete(id);
    this.requestDailyUsage.delete(id);
    this.requestEndpointUsage.delete(id);

    return true;
  }

  public recordRequest(userId: string, input: RequestRecordInput): void {
    const record: RequestRecord = {
      id: `req_${randomUUID()}`,
      ...input
    };

    const history = this.requestHistory.get(userId) ?? [];
    history.push(record);

    if (history.length > 200) {
      history.splice(0, history.length - 200);
    }

    this.requestHistory.set(userId, history);

    const date = new Date(input.timestamp).toISOString().split('T')[0];
    let daily = this.requestDailyUsage.get(userId);

    if (!daily) {
      daily = new Map();
      this.requestDailyUsage.set(userId, daily);
    }

    daily.set(date, (daily.get(date) ?? 0) + 1);

    let endpoints = this.requestEndpointUsage.get(userId);

    if (!endpoints) {
      endpoints = new Map();
      this.requestEndpointUsage.set(userId, endpoints);
    }

    endpoints.set(input.path, (endpoints.get(input.path) ?? 0) + 1);

    if (!this.requestCollection) return;

    void this.requestCollection.insertOne({
      _id: record.id,
      userId,
      method: record.method,
      path: record.path,
      status: record.status,
      timestamp: new Date(record.timestamp),
      durationMs: record.durationMs
    }).catch(error => {
      const message = error instanceof Error ? error.message : String(error);
      Logger.error(`Falha ao salvar histórico de requisições: ${message}`, 'MongoDB');
    });
  }

  public async getUsageStats(userId: string, days: number = 14): Promise<UsageStats> {
    const normalizedDays = Number.isFinite(days) ? Math.floor(days) : 14;
    const safeDays = Math.min(30, Math.max(1, normalizedDays));

    if (this.requestCollection) {
      try {
        return await this.getUsageStatsFromMongo(userId, safeDays);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        Logger.error(`Falha ao consultar uso no MongoDB: ${message}`, 'MongoDB');
      }
    }

    return this.getUsageStatsFromMemory(userId, safeDays);
  }

  private async getUsageStatsFromMongo(userId: string, safeDays: number): Promise<UsageStats> {
    if (!this.requestCollection) {
      return this.getUsageStatsFromMemory(userId, safeDays);
    }

    const since = new Date();
    since.setUTCHours(0, 0, 0, 0);
    since.setUTCDate(since.getUTCDate() - (safeDays - 1));

    const [dailyRows, recentDocuments, topRows, totalRequests] = await Promise.all([
      this.requestCollection.aggregate<{ _id: string; count: number }>([
        { $match: { userId, timestamp: { $gte: since } } },
        {
          $group: {
            _id: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$timestamp',
                timezone: 'UTC'
              }
            },
            count: { $sum: 1 }
          }
        }
      ]).toArray(),
      this.requestCollection
        .find({ userId })
        .sort({ timestamp: -1 })
        .limit(20)
        .toArray(),
      this.requestCollection.aggregate<{ _id: string; count: number }>([
        { $match: { userId } },
        { $group: { _id: '$path', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 6 }
      ]).toArray(),
      this.requestCollection.countDocuments({ userId })
    ]);

    const dailyCounts = new Map(dailyRows.map(row => [row._id, row.count]));
    const daily: Array<{ date: string; count: number }> = [];
    const cursor = new Date();
    cursor.setUTCHours(0, 0, 0, 0);

    for (let offset = safeDays - 1; offset >= 0; offset--) {
      const date = new Date(cursor);
      date.setUTCDate(cursor.getUTCDate() - offset);
      const key = date.toISOString().split('T')[0];
      daily.push({ date: key, count: dailyCounts.get(key) ?? 0 });
    }

    const recent: RequestRecord[] = recentDocuments.map(document => ({
      id: document._id,
      method: document.method,
      path: document.path,
      status: document.status,
      timestamp: document.timestamp.getTime(),
      durationMs: document.durationMs
    }));

    return {
      daily,
      recent,
      topEndpoints: topRows.map(row => ({ path: row._id, count: row.count })),
      totalRequests
    };
  }

  private getUsageStatsFromMemory(userId: string, safeDays: number): UsageStats {
    const dailyUsage = this.requestDailyUsage.get(userId) ?? new Map<string, number>();
    const daily: Array<{ date: string; count: number }> = [];
    const cursor = new Date();
    cursor.setUTCHours(0, 0, 0, 0);

    for (let offset = safeDays - 1; offset >= 0; offset--) {
      const date = new Date(cursor);
      date.setUTCDate(cursor.getUTCDate() - offset);
      const key = date.toISOString().split('T')[0];
      daily.push({ date: key, count: dailyUsage.get(key) ?? 0 });
    }

    const recent = [...(this.requestHistory.get(userId) ?? [])]
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 20);

    const topEndpoints = Array.from(
      (this.requestEndpointUsage.get(userId) ?? new Map<string, number>()).entries()
    )
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([path, count]) => ({ path, count }));

    const totalRequests = Array.from(dailyUsage.values()).reduce(
      (total, count) => total + count,
      0
    );

    return { daily, recent, topEndpoints, totalRequests };
  }

  public generateFingerprint(req: Request): string {
    // Render overwrites CF-Connecting-IP at its edge. Do not trust client-controlled X-Forwarded-For.
    const cfIp = req.headers.get('cf-connecting-ip') || 'unknown-client';
    const userAgent = req.headers.get('user-agent') || 'unknown-ua';
    const acceptLang = req.headers.get('accept-language') || 'unknown-lang';
    const acceptEnc = req.headers.get('accept-encoding') || 'unknown-enc';
    const rawSignature = `${cfIp}|${userAgent}|${acceptLang}|${acceptEnc}`;
    return `fp_${createHash('sha256').update(rawSignature).digest('hex')}`;
  }

  private cleanupRateLimitTrackers(now: number): void {
    if (now - this.lastRateLimitCleanupAt < RATE_LIMIT_CLEANUP_INTERVAL_MS) return;
    this.lastRateLimitCleanupAt = now;

    for (const [key, tracker] of this.tokenRateLimits) {
      if (now - tracker.lastSeenAt > RATE_LIMIT_TRACKER_TTL_MS && now >= tracker.tempBlockUntil) {
        this.tokenRateLimits.delete(key);
      }
    }
    for (const [key, tracker] of this.fingerprintRateLimits) {
      if (now - tracker.lastSeenAt > RATE_LIMIT_TRACKER_TTL_MS && now >= tracker.tempBlockUntil) {
        this.fingerprintRateLimits.delete(key);
      }
    }
  }

  private getRateLimitTracker(
    trackers: Map<string, RateLimitTracker>,
    key: string,
    now: number
  ): RateLimitTracker {
    let tracker = trackers.get(key);
    if (tracker) {
      tracker.lastSeenAt = now;
      trackers.delete(key);
      trackers.set(key, tracker);
      return tracker;
    }

    while (trackers.size >= MAX_RATE_LIMIT_TRACKERS) {
      const oldest = trackers.keys().next().value;
      if (oldest === undefined) break;
      trackers.delete(oldest);
    }

    tracker = { timestamps: [], tempBlockUntil: 0, violations: 0, lastSeenAt: now, lastViolationAt: 0 };
    trackers.set(key, tracker);
    return tracker;
  }

  public checkRateLimitAndDDoS(user: User, limiterKey: string, fingerprint: string): void {
    const now = Date.now();
    this.cleanupRateLimitTrackers(now);
    const fpTracker = this.getRateLimitTracker(this.fingerprintRateLimits, fingerprint, now);

    if (now < fpTracker.tempBlockUntil) {
      const remainingSec = Math.ceil((fpTracker.tempBlockUntil - now) / 1000);
      throw new RateLimitError('Muitas requisições. Aguarde um pouco e tente novamente.', remainingSec);
    }

    const tokenTracker = this.getRateLimitTracker(this.tokenRateLimits, limiterKey, now);

    if (now < tokenTracker.tempBlockUntil) {
      const remainingSec = Math.ceil((tokenTracker.tempBlockUntil - now) / 1000);
      throw new RateLimitError('Muitas requisições. Aguarde um pouco e tente novamente.', remainingSec);
    }

    tokenTracker.timestamps = tokenTracker.timestamps.filter(t => now - t < 10000);
    fpTracker.timestamps = fpTracker.timestamps.filter(t => now - t < 10000);

    tokenTracker.timestamps.push(now);
    fpTracker.timestamps.push(now);

    if (tokenTracker.timestamps.length > 15 || fpTracker.timestamps.length > 20) {
      tokenTracker.violations += 1;
      fpTracker.violations += 1;
      if (now - tokenTracker.lastViolationAt > 30 * 60 * 1000) tokenTracker.violations = 1;
      if (now - fpTracker.lastViolationAt > 30 * 60 * 1000) fpTracker.violations = 1;
      tokenTracker.lastViolationAt = now;
      fpTracker.lastViolationAt = now;

      const violations = Math.max(tokenTracker.violations, fpTracker.violations);
      const blockDurationMs = Math.min(30 * 60 * 1000, 60_000 * 2 ** Math.min(violations - 1, 5));
      tokenTracker.tempBlockUntil = now + blockDurationMs;
      fpTracker.tempBlockUntil = now + blockDurationMs;
      Logger.warning(`Limite de requisições excedido para usuário ${user.id}; bloqueio temporário de ${Math.ceil(blockDurationMs / 1000)}s.`, 'RateLimit');
      throw new RateLimitError('Muitas requisições. Aguarde um pouco e tente novamente.', Math.ceil(blockDurationMs / 1000));
    }
  }

  public validateUserAccess(user: User, limiterKey: string, req: Request, consumeToken: boolean = true): User {
    if (user.isSuspended) {
      throw new ForbiddenError(`Este usuário está suspenso permanentemente. Motivo: ${user.suspensionReason || 'Violação das diretrizes'}`);
    }

    const fingerprint = this.generateFingerprint(req);
    this.checkRateLimitAndDDoS(user, limiterKey, fingerprint);

    if (!consumeToken) {
      return user;
    }

    const today = this.getTodayDateString();

    if (user.lastResetDate !== today) {
      user.dailyRequests = 0;
      user.lastResetDate = today;
    }

    if (user.plan === 'free' && user.dailyRequests >= 100) {
      throw new ForbiddenError('Limite diário de 100 requisições do plano Free atingido. Reseta às 00:00.');
    }

    user.dailyRequests += 1;
    this.scheduleUserSave(user);
    return user;
  }

  public validatePreviewAccess(user: User, req: Request): User {
    if (user.isSuspended) {
      throw new ForbiddenError(`Este usuário está suspenso permanentemente. Motivo: ${user.suspensionReason || 'Violação das diretrizes'}`);
    }

    const fingerprint = this.generateFingerprint(req);
    this.checkRateLimitAndDDoS(user, `preview:${user.id}`, fingerprint);

    const limit = getDocsPreviewDailyLimit();
    const today = this.getTodayDateString();

    if (user.docsPreviewDate !== today) {
      user.docsPreviewDate = today;
      user.docsPreviewCount = 1;
      this.scheduleUserSave(user);
      return user;
    }

    if ((user.docsPreviewCount ?? 0) >= limit) {
      throw new ForbiddenError(`Limite diário de ${limit} pré-visualizações da documentação atingido. Tente novamente amanhã.`);
    }

    user.docsPreviewCount = (user.docsPreviewCount ?? 0) + 1;
    this.scheduleUserSave(user);
    return user;
  }

  public validateAndIncrementApiKey(apiKey: string, req: Request, consumeToken: boolean = true): User {
    const user = this.findByApiKey(apiKey);

    if (!user) {
      throw new UnauthorizedError('API Key inválida.');
    }

    return this.validateUserAccess(user, `api:${apiKey}`, req, consumeToken);
  }

  public validateAndIncrementToken(token: string, req: Request, consumeToken: boolean = true): User {
    return this.validateAndIncrementApiKey(token, req, consumeToken);
  }
}

export const db = new UserDatabase();
