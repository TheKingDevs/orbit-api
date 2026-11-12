import { sessionAuthMiddleware } from '@middlewares/authMiddleware';
import { ForbiddenError, InvalidParameterError, NotFoundError } from '@errors/index';
import type { PlanType, UserRole } from '@models/User';
import { db, BASIC_MONTHLY_LIMIT, FREE_DAILY_LIMIT } from '@utils/db.util';
import { addOneCalendarMonth } from '@utils/plan.util';
import { normalizeEmail } from '@utils/dataCrypto.util';

const plans = new Set<PlanType>(['free', 'basic', 'gold']);
const roles = new Set<UserRole>(['public', 'admin']);

function canManage(actorRole: UserRole, targetRole: UserRole): boolean {
  return actorRole === 'owner' ? targetRole !== 'owner' : actorRole === 'admin' && targetRole === 'public';
}

function serializeUser(user: NonNullable<ReturnType<typeof db.findById>>) {
  const current = db.refreshUserSuspension(db.refreshUserPlan(user));
  return {
    id: current.id,
    email: current.email,
    name: current.name ?? null,
    picture: current.picture ?? null,
    role: current.role,
    plan: current.plan,
    planExpiresAt: current.planExpiresAt ?? null,
    isSuspended: Boolean(current.isSuspended),
    suspensionType: current.isSuspended ? current.suspensionType ?? 'permanent' : null,
    suspendedUntil: current.isSuspended && current.suspensionType === 'temporary' ? current.suspendedUntil ?? null : null,
    suspensionReason: current.suspensionReason ?? '',
    dailyRequests: current.dailyRequests,
    monthlyRequests: current.monthlyRequests,
    requestsUsed: current.plan === 'free' ? current.dailyRequests : current.monthlyRequests,
    limit: current.plan === 'free' ? FREE_DAILY_LIMIT : current.plan === 'basic' ? BASIC_MONTHLY_LIMIT : null,
    apiKey: current.apiKey
  };
}

export async function adminUserDetailRoute(req: Request, url: URL): Promise<Response> {
  const actor = sessionAuthMiddleware(req, ['admin', 'owner']);
  const id = decodeURIComponent(url.pathname.slice('/api/admin/users/'.length));
  if (!id || id.includes('/')) throw new InvalidParameterError('Identificador do usuário inválido.');

  const existingTarget = db.findById(id);
  if (!existingTarget) throw new NotFoundError('Usuário não encontrado.');
  if (!canManage(actor.role, existingTarget.role) || existingTarget.id === actor.id) {
    throw new ForbiddenError('Você não tem permissão para gerenciar esta conta.');
  }

  if (req.method === 'GET') {
    return Response.json({ success: true, user: serializeUser(existingTarget) }, { headers: { 'Cache-Control': 'no-store' } });
  }

  if (req.method === 'DELETE') {
    const deleted = await db.deleteUserById(existingTarget.id);
    return Response.json({ success: deleted });
  }

  if (req.method !== 'PATCH') throw new InvalidParameterError('Método não suportado.');
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') throw new InvalidParameterError('Dados do usuário inválidos.');
  const target = { ...existingTarget };

  if (typeof body.email === 'string') {
    const email = normalizeEmail(body.email);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new InvalidParameterError('Informe um e-mail válido.');
    const existing = db.findByEmail(email);
    if (existing && existing.id !== target.id) throw new InvalidParameterError('Este e-mail já está em uso.');
    target.email = email;
  }

  if (body.plan !== undefined) {
    if (!plans.has(body.plan)) throw new InvalidParameterError('Plano inválido.');
    target.plan = body.plan;
    if (body.plan === 'free') {
      target.planExpiresAt = undefined;
    } else if (typeof body.planExpiresAt === 'string' && body.planExpiresAt) {
      const expiry = new Date(body.planExpiresAt);
      if (Number.isNaN(expiry.getTime())) throw new InvalidParameterError('Data de validade inválida.');
      target.planExpiresAt = expiry.toISOString();
    } else if (!target.planExpiresAt || Date.parse(target.planExpiresAt) <= Date.now()) {
      target.planExpiresAt = addOneCalendarMonth().toISOString();
    }
  } else if (typeof body.planExpiresAt === 'string') {
    const expiry = new Date(body.planExpiresAt);
    if (Number.isNaN(expiry.getTime())) throw new InvalidParameterError('Data de validade inválida.');
    target.planExpiresAt = expiry.toISOString();
  }

  if (body.role !== undefined) {
    if (actor.role !== 'owner' || !roles.has(body.role)) throw new ForbiddenError('Somente o owner pode alterar cargos para Admin ou Usuário.');
    target.role = body.role;
  }
  if (typeof body.isSuspended === 'boolean') {
    target.isSuspended = body.isSuspended;
    if (body.isSuspended) {
      const type = body.suspensionType === undefined ? (target.suspensionType ?? 'permanent') : body.suspensionType;
      if (type !== 'temporary' && type !== 'permanent') throw new InvalidParameterError('Tipo de suspensão inválido.');
      target.suspensionType = type;
      target.suspensionReason = typeof body.suspensionReason === 'string'
        ? body.suspensionReason.trim().slice(0, 500)
        : target.suspensionReason || 'Suspenso pela administração';
      if (type === 'temporary') {
        if (typeof body.suspendedUntil !== 'string') throw new InvalidParameterError('Informe a data e hora para o fim da suspensão temporária.');
        const expiry = Date.parse(body.suspendedUntil);
        if (!Number.isFinite(expiry) || expiry <= Date.now()) throw new InvalidParameterError('O fim da suspensão deve ser uma data futura válida.');
        target.suspendedUntil = new Date(expiry).toISOString();
      } else {
        target.suspendedUntil = undefined;
      }
    } else {
      target.suspensionType = undefined;
      target.suspendedUntil = undefined;
      target.suspensionReason = undefined;
    }
  }
  if (body.rotateApiKey === true) {
    const nextKey = db.generateApiKey();
    target.apiKey = nextKey;
    target.token = nextKey;
  }
  for (const field of ['dailyRequests', 'monthlyRequests'] as const) {
    if (body[field] !== undefined) {
      const value = Number(body[field]);
      if (!Number.isSafeInteger(value) || value < 0) throw new InvalidParameterError(`Valor inválido para ${field}.`);
      target[field] = value;
    }
  }

  await db.saveUser(target);
  return Response.json({ success: true, user: serializeUser(target) }, { headers: { 'Cache-Control': 'no-store' } });
}
