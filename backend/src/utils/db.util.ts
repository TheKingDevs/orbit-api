import { randomBytes, randomUUID } from 'node:crypto';
import { User } from '@models/User';
import { IUserService } from '@interface/IUser';
import { UnauthorizedError, ForbiddenError } from '@errors/index';
import { Logger } from '@utils/logger';
import { sessionManager } from '@services/session.service';

interface RateLimitTracker {
  timestamps: number[];
  tempBlockUntil: number;
  violations: number;
}

interface DailyUsage {
  date: string;
  count: number;
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

function getDocsPreviewDailyLimit(): number {
  const parsed = Number(process.env.DOCS_PREVIEW_DAILY_LIMIT);

  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 100;
}

class UserDatabase implements IUserService {
  private users: Map<string, User> = new Map();
  private tokenRateLimits: Map<string, RateLimitTracker> = new Map();
  private fingerprintRateLimits: Map<string, RateLimitTracker> = new Map();
  private bannedFingerprints: Set<string> = new Set();
  private docsPreviewUsage: Map<string, DailyUsage> = new Map();
  private requestHistory: Map<string, RequestRecord[]> = new Map();
  private requestDailyUsage: Map<string, Map<string, number>> = new Map();
  private requestEndpointUsage: Map<string, Map<string, number>> = new Map();
  private requestSequence = 0;

  constructor() {
    this.seedDefaultUsers();
  }

  private seedDefaultUsers() {
    const isProduction = process.env.NODE_ENV === 'production';

    const seeds = [
      {
        id: 'usr-owner-01',
        email: 'owner@orbit.com',
        token: process.env.OWNER_API_KEY ?? (isProduction ? '' : 'secret-owner-token'),
        plan: 'gold' as const,
        role: 'owner' as const
      },
      {
        id: 'usr-admin-01',
        email: 'admin@orbit.com',
        token: process.env.ADMIN_API_KEY ?? (isProduction ? '' : 'secret-admin-token'),
        plan: 'basic' as const,
        role: 'admin' as const
      },
      {
        id: 'usr-free-01',
        email: 'user@free.com',
        token: process.env.PUBLIC_API_KEY ?? (isProduction ? '' : 'public-token'),
        plan: 'free' as const,
        role: 'public' as const
      }
    ];

    for (const seed of seeds) {
      if (!seed.token) continue;

      this.addUser({
        id: seed.id,
        email: seed.email,
        token: seed.token,
        plan: seed.plan,
        role: seed.role,
        dailyRequests: 0,
        lastResetDate: this.getTodayDateString(),
        violationCount: 0
      });
    }
  }

  private getTodayDateString(): string {
    return new Date().toISOString().split('T')[0];
  }

  public addUser(user: User): User {
    user.violationCount = user.violationCount || 0;
    this.users.set(user.token, user);
    return user;
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

  public deleteUserById(id: string): boolean {
    for (const [token, user] of this.users.entries()) {
      if (user.id === id) {
        this.users.delete(token);
        this.requestHistory.delete(id);
        this.requestDailyUsage.delete(id);
        this.requestEndpointUsage.delete(id);
        sessionManager.destroyByUserId(id);
        return true;
      }
    }
    return false;
  }

  public recordRequest(userId: string, input: RequestRecordInput): void {
    const record: RequestRecord = {
      id: `req_${Date.now()}_${++this.requestSequence}`,
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
  }

  public getUsageStats(userId: string, days: number = 14): UsageStats {
    const normalizedDays = Number.isFinite(days) ? Math.floor(days) : 14;
    const safeDays = Math.min(30, Math.max(1, normalizedDays));
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
        Logger.error(`Usuário ${user.id} (Fingerprint: ${fingerprint}) SUSPENSO PERMANENTEMENTE após 3 violações de DDoS.`, 'Anti-DDoS');
        throw new ForbiddenError('Acesso revogado permanentemente. Este acesso e seu dispositivo foram banidos por excederem as violações de segurança.');
      }

      const blockDurationMs = 5 * 60 * 1000;
      tokenTracker.tempBlockUntil = now + blockDurationMs;
      fpTracker.tempBlockUntil = now + blockDurationMs;

      user.violationCount = (user.violationCount || 0) + 1;

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
    const usage = this.docsPreviewUsage.get(user.id);

    if (!usage || usage.date !== today) {
      this.docsPreviewUsage.set(user.id, { date: today, count: 1 });
      return user;
    }

    if (usage.count >= limit) {
      throw new ForbiddenError(`Limite diário de ${limit} pré-visualizações da documentação atingido. Tente novamente amanhã.`);
    }

    usage.count += 1;
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
