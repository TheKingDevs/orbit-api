import { randomBytes, randomUUID } from 'node:crypto';
import type { Collection } from 'mongodb';
import { User } from '@models/User';
import { IUserService } from '@interface/IUser';
import { UnauthorizedError, ForbiddenError } from '@errors/index';
import { Logger } from '@utils/logger';
import { sessionManager } from '@services/session.service';
import { getDatabase } from '@services/mongo.service';

interface RateLimitTracker {
  timestamps: number[];
  tempBlockUntil: number;
  violations: number;
}

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

type UserDocument = Omit<User, 'id'> & {
  _id: string;
  createdAt?: Date;
  updatedAt?: Date;
};

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

function buildUserFields(user: User): Omit<UserDocument, '_id' | 'createdAt' | 'updatedAt'> {
  const fields: Omit<UserDocument, '_id' | 'createdAt' | 'updatedAt'> = {
    email: user.email,
    token: user.token,
    plan: user.plan,
    role: user.role,
    dailyRequests: user.dailyRequests,
    lastResetDate: user.lastResetDate,
    violationCount: user.violationCount ?? 0
  };

  if (user.name !== undefined) fields.name = user.name;
  if (user.picture !== undefined) fields.picture = user.picture;
  if (user.googleSubject !== undefined) fields.googleSubject = user.googleSubject;
  if (user.isSuspended !== undefined) fields.isSuspended = user.isSuspended;
  if (user.suspensionReason !== undefined) fields.suspensionReason = user.suspensionReason;
  if (user.docsPreviewDate !== undefined) fields.docsPreviewDate = user.docsPreviewDate;
  if (user.docsPreviewCount !== undefined) fields.docsPreviewCount = user.docsPreviewCount;

  return fields;
}

function fromUserDocument(document: UserDocument): User {
  return {
    id: document._id,
    email: document.email,
    token: document.token,
    plan: document.plan,
    role: document.role,
    dailyRequests: document.dailyRequests,
    lastResetDate: document.lastResetDate,
    violationCount: document.violationCount ?? 0,
    ...(document.name != null ? { name: document.name } : {}),
    ...(document.picture != null ? { picture: document.picture } : {}),
    ...(document.googleSubject != null ? { googleSubject: document.googleSubject } : {}),
    ...(document.isSuspended != null ? { isSuspended: document.isSuspended } : {}),
    ...(document.suspensionReason != null ? { suspensionReason: document.suspensionReason } : {}),
    ...(document.docsPreviewDate != null ? { docsPreviewDate: document.docsPreviewDate } : {}),
    ...(document.docsPreviewCount != null ? { docsPreviewCount: document.docsPreviewCount } : {})
  };
}

function getDocsPreviewDailyLimit(): number {
  const parsed = Number(process.env.DOCS_PREVIEW_DAILY_LIMIT);

  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 100;
}

class UserDatabase implements IUserService {
  private users: Map<string, User> = new Map();
  private tokenRateLimits: Map<string, RateLimitTracker> = new Map();
  private fingerprintRateLimits: Map<string, RateLimitTracker> = new Map();
  private bannedFingerprints: Set<string> = new Set();
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

    const seeds: User[] = [
      {
        id: 'usr-owner-01',
        email: 'owner@orbit.com',
        token: process.env.OWNER_API_KEY ?? (isProduction ? '' : 'secret-owner-token'),
        plan: 'gold',
        role: 'owner',
        dailyRequests: 0,
        lastResetDate: this.getTodayDateString(),
        violationCount: 0
      },
      {
        id: 'usr-admin-01',
        email: 'admin@orbit.com',
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
        token: process.env.PUBLIC_API_KEY ?? (isProduction ? '' : 'public-token'),
        plan: 'free',
        role: 'public',
        dailyRequests: 0,
        lastResetDate: this.getTodayDateString(),
        violationCount: 0
      }
    ];

    return seeds.filter(seed => Boolean(seed.token));
  }

  private seedDefaultUsersInMemory(): void {
    for (const seed of this.getDefaultSeeds()) {
      this.addUserInMemory(seed);
    }
  }

  private addUserInMemory(user: User): User {
    user.violationCount = user.violationCount || 0;
    this.users.set(user.token, user);
    return user;
  }

  public async init(): Promise<void> {
    const mongoDatabase = getDatabase();

    if (!mongoDatabase) {
      Logger.warning('Persistência MongoDB desativada; usando memória.', 'MongoDB');
      return;
    }

    this.usersCollection = mongoDatabase.collection<UserDocument>('users');
    this.requestCollection = mongoDatabase.collection<RequestRecordDocument>('request_records');

    await Promise.all([
      this.usersCollection.createIndex({ token: 1 }, { unique: true }),
      this.usersCollection.createIndex({ email: 1 }),
      this.usersCollection.createIndex(
        { googleSubject: 1 },
        {
          unique: true,
          partialFilterExpression: { googleSubject: { $type: 'string' } }
        }
      ),
      this.requestCollection.createIndex({ userId: 1, timestamp: -1 }),
      this.requestCollection.createIndex(
        { timestamp: 1 },
        { expireAfterSeconds: REQUEST_RETENTION_SECONDS }
      )
    ]);

    const documents = await this.usersCollection.find({}).toArray();

    this.users.clear();

    for (const document of documents) {
      const user = fromUserDocument(document);
      this.users.set(user.token, user);
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

  public async addUser(user: User): Promise<User> {
    this.addUserInMemory(user);

    try {
      await this.persistUser(user);
    } catch (error) {
      this.users.delete(user.token);
      throw error;
    }

    return user;
  }

  public async saveUser(user: User): Promise<void> {
    this.users.set(user.token, user);
    await this.persistUser(user);
  }

  private async persistUser(user: User): Promise<void> {
    if (!this.usersCollection) return;

    const now = new Date();

    await this.usersCollection.updateOne(
      { _id: user.id },
      {
        $set: {
          ...buildUserFields(user),
          updatedAt: now
        },
        $setOnInsert: {
          createdAt: now
        }
      },
      { upsert: true }
    );
  }

  private scheduleUserSave(user: User): void {
    if (!this.usersCollection) return;

    void this.persistUser(user).catch(error => {
      const message = error instanceof Error ? error.message : String(error);
      Logger.error(`Falha ao salvar usuário ${user.id}: ${message}`, 'MongoDB');
    });
  }

  private getTodayDateString(): string {
    return new Date().toISOString().split('T')[0];
  }

  public findByToken(token: string): User | undefined {
    return this.users.get(token);
  }

  public findById(id: string): User | undefined {
    return Array.from(this.users.values()).find(u => u.id === id);
  }

  public findByEmail(email: string): User | undefined {
    return Array.from(this.users.values()).find(u => u.email === email);
  }

  public findByGoogleSubject(subject: string): User | undefined {
    return Array.from(this.users.values()).find(u => u.googleSubject === subject);
  }

  public generateToken(): string {
    return `orb_${randomBytes(32).toString('base64url')}`;
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

    this.users.delete(user.token);
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
    const cfIp = req.headers.get('cf-connecting-ip') || '';
    const xForwarded = req.headers.get('x-forwarded-for') || '';
    const userAgent = req.headers.get('user-agent') || 'unknown-ua';
    const acceptLang = req.headers.get('accept-language') || 'unknown-lang';
    const acceptEnc = req.headers.get('accept-encoding') || 'unknown-enc';

    const rawSignature = `${cfIp}|${xForwarded}|${userAgent}|${acceptLang}|${acceptEnc}`;
    let hash = 0;
    for (let i = 0; i < rawSignature.length; i++) {
      hash = (hash << 5) - hash + rawSignature.charCodeAt(i);
      hash |= 0;
    }
    return `fp_${Math.abs(hash)}_${userAgent.substring(0, 15)}`;
  }

  public checkRateLimitAndDDoS(user: User, limiterKey: string, fingerprint: string): void {
    const now = Date.now();

    if (this.bannedFingerprints.has(fingerprint)) {
      throw new ForbiddenError('Seu dispositivo/rede foi banido permanentemente devido a tentativas repetidas de ataque DDoS.');
    }

    let fpTracker = this.fingerprintRateLimits.get(fingerprint);
    if (!fpTracker) {
      fpTracker = { timestamps: [], tempBlockUntil: 0, violations: 0 };
      this.fingerprintRateLimits.set(fingerprint, fpTracker);
    }

    if (now < fpTracker.tempBlockUntil) {
      const remainingSec = Math.ceil((fpTracker.tempBlockUntil - now) / 1000);
      throw new ForbiddenError(`Dispositivo bloqueado temporariamente por atividade suspeita. Tente novamente em ${remainingSec} segundos.`);
    }

    let tokenTracker = this.tokenRateLimits.get(limiterKey);
    if (!tokenTracker) {
      tokenTracker = { timestamps: [], tempBlockUntil: 0, violations: 0 };
      this.tokenRateLimits.set(limiterKey, tokenTracker);
    }

    if (now < tokenTracker.tempBlockUntil) {
      const remainingSec = Math.ceil((tokenTracker.tempBlockUntil - now) / 1000);
      throw new ForbiddenError(`Acesso temporariamente bloqueado por disparos simultâneos excessivos (Anti-DDoS). Aguarde ${remainingSec}s.`);
    }

    tokenTracker.timestamps = tokenTracker.timestamps.filter(t => now - t < 10000);
    fpTracker.timestamps = fpTracker.timestamps.filter(t => now - t < 10000);

    tokenTracker.timestamps.push(now);
    fpTracker.timestamps.push(now);

    if (tokenTracker.timestamps.length > 15 || fpTracker.timestamps.length > 20) {
      tokenTracker.violations += 1;
      fpTracker.violations += 1;

      const isPublicUser = user.role === 'public';

      if (tokenTracker.violations >= 3 || fpTracker.violations >= 3) {
        if (isPublicUser) {
          this.bannedFingerprints.add(fingerprint);
        }
        user.isSuspended = true;
        user.suspensionReason = 'Banido permanentemente por 3 tentativas de ataques DDoS / RateLimit violado.';
        this.scheduleUserSave(user);
        Logger.error(`Usuário ${user.id} (Fingerprint: ${fingerprint}) SUSPENSO PERMANENTEMENTE após 3 violações de DDoS.`, 'Anti-DDoS');
        throw new ForbiddenError('Acesso revogado permanentemente. Este acesso e seu dispositivo foram banidos por excederem as violações de segurança.');
      }

      const blockDurationMs = 5 * 60 * 1000;
      tokenTracker.tempBlockUntil = now + blockDurationMs;
      fpTracker.tempBlockUntil = now + blockDurationMs;

      user.violationCount = (user.violationCount || 0) + 1;
      this.scheduleUserSave(user);

      Logger.warning(`Atividade suspeita de DDoS detectada! Usuário: ${user.id} | Violação #${tokenTracker.violations}/3. Bloqueado por 5 minutos.`, 'Anti-DDoS');
      throw new ForbiddenError(`Muitas requisições simultâneas detectadas. Atividade marcada como suspeita. Acesso bloqueado por 5 minutos (Infração ${tokenTracker.violations}/3).`);
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

  public validateAndIncrementToken(token: string, req: Request, consumeToken: boolean = true): User {
    const user = this.findByToken(token);

    if (!user) {
      throw new UnauthorizedError('Token de acesso é inválido ou não foi encontrado no banco de dados.');
    }

    return this.validateUserAccess(user, `api:${token}`, req, consumeToken);
  }
}

export const db = new UserDatabase();
