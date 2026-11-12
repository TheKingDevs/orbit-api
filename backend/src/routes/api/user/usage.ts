import { sessionAuthMiddleware } from '@middlewares/authMiddleware';
import { BASIC_MONTHLY_LIMIT, db, FREE_DAILY_LIMIT } from '@utils/db.util';

export async function userUsageRoute(req: Request, url: URL): Promise<Response> {
  const user = db.refreshUserPlan(sessionAuthMiddleware(req));
  const requestedDays = Number(url.searchParams.get('days') ?? 14);
  const days = Number.isFinite(requestedDays) ? requestedDays : 14;
  const requestedPage = Number(url.searchParams.get('page') ?? 1);
  const requestedLimit = Number(url.searchParams.get('limit') ?? 10);
  const usage = await db.getUsageStats(user.id, days, {
    page: Number.isFinite(requestedPage) ? requestedPage : 1,
    limit: Number.isFinite(requestedLimit) ? requestedLimit : 10
  });
  const limit = user.plan === 'free'
    ? FREE_DAILY_LIMIT
    : user.plan === 'basic'
      ? BASIC_MONTHLY_LIMIT
      : null;
  const requestsUsed = user.plan === 'free' ? user.dailyRequests : user.monthlyRequests;

  return Response.json({
    success: true,
    summary: {
      email: user.email,
      name: user.name ?? null,
      picture: user.picture ?? null,
      plan: user.plan,
      role: user.role,
      dailyRequestsUsed: user.dailyRequests,
      monthlyRequestsUsed: user.monthlyRequests,
      requestsUsed,
      limit,
      limitPeriod: user.plan === 'free' ? 'day' : 'month',
      planExpiresAt: user.planExpiresAt ?? null,
      remainingRequests: limit === null ? null : Math.max(0, limit - requestsUsed),
      isSuspended: Boolean(user.isSuspended),
      lastResetDate: user.lastResetDate
    },
    usage
  }, {
    status: 200,
    headers: { 'Cache-Control': 'no-store' }
  });
}
