import { InvalidParameterError } from '@errors/index';
import { sessionAuthMiddleware } from '@middlewares/authMiddleware';
import { BASIC_MONTHLY_LIMIT, db, FREE_DAILY_LIMIT } from '@utils/db.util';

export async function managerKeysRoute(req: Request): Promise<Response> {
  if (req.method !== 'GET') {
    throw new InvalidParameterError('Método não suportado. Use GET.');
  }

  const adminUser = sessionAuthMiddleware(req, ['admin', 'owner']);

  const keys = db.getAllUsers().map(u => ({
    email: u.email,
    apiKey: u.apiKey || u.token,
    token: u.apiKey || u.token,
    plan: u.plan,
    dailyRequests: u.dailyRequests,
    monthlyRequests: u.monthlyRequests,
    requestsUsed: u.plan === 'free' ? u.dailyRequests : u.monthlyRequests,
    limit: u.plan === 'free'
      ? FREE_DAILY_LIMIT
      : u.plan === 'basic'
        ? BASIC_MONTHLY_LIMIT
        : 'Ilimitado',
    limitPeriod: u.plan === 'free' ? 'day' : 'month',
    planExpiresAt: u.planExpiresAt ?? null,
    isSuspended: u.isSuspended || false,
    violations: u.violationCount || 0
  }));

  return Response.json({
    success: true,
    keys,
    requestedBy: adminUser.email
  }, { headers: { 'Cache-Control': 'no-store' } });
}
