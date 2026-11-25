import { InvalidParameterError, NotFoundError } from '@errors/index';
import { sessionAuthMiddleware } from '@middlewares/authMiddleware';
import type { PlanType } from '@models/User';
import { db } from '@utils/db.util';
import { addOneCalendarMonth } from '@utils/plan.util';

const ALLOWED_PLANS = new Set<PlanType>(['free', 'basic', 'gold']);

export async function updatePlanRoute(req: Request, url: URL): Promise<Response> {
  if (req.method !== 'POST' && req.method !== 'PATCH') {
    throw new InvalidParameterError('Método não suportado. Use POST ou PATCH.');
  }

  const ownerUser = sessionAuthMiddleware(req, ['owner']);

  const contentType = req.headers.get('content-type') || '';
  const body = contentType.includes('json')
    ? await req.json().catch(() => null) as Record<string, unknown> | null
    : null;

  const targetApiKeyRaw = body?.targetApiKey ?? body?.targetToken ?? url.searchParams.get('targetApiKey') ?? url.searchParams.get('targetToken');
  const planRaw = body?.plan ?? url.searchParams.get('plan') ?? 'free';

  if (typeof targetApiKeyRaw !== 'string' || !targetApiKeyRaw.trim()) {
    throw new InvalidParameterError('targetApiKey é obrigatório.');
  }
  if (typeof planRaw !== 'string' || !ALLOWED_PLANS.has(planRaw as PlanType)) {
    throw new InvalidParameterError('Plano inválido. Use free, basic ou gold.');
  }

  const newPlan = planRaw as PlanType;
  const user = db.findByApiKey(targetApiKeyRaw.trim());
  if (!user) throw new NotFoundError('Usuário não encontrado.');

  user.plan = newPlan;
  if (newPlan === 'free') {
    user.planExpiresAt = undefined;
  } else if (!user.planExpiresAt || Date.parse(user.planExpiresAt) <= Date.now()) {
    user.planExpiresAt = addOneCalendarMonth().toISOString();
  }

  await db.saveUser(user);
  const safeUser = db.refreshUserPlan(user);

  return Response.json({
    success: true,
    message: `Plano atualizado para '${newPlan}'.`,
    user: {
      id: safeUser.id,
      email: safeUser.email,
      plan: safeUser.plan,
      planExpiresAt: safeUser.planExpiresAt ?? null,
      role: safeUser.role,
      isSuspended: Boolean(safeUser.isSuspended)
    },
    executedBy: ownerUser.email
  }, { headers: { 'Cache-Control': 'no-store' } });
}
