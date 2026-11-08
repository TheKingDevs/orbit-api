import { sessionAuthMiddleware } from '@middlewares/authMiddleware';
import { db } from '@utils/db.util';

export async function userUsageRoute(req: Request, url: URL): Promise<Response> {
  const user = sessionAuthMiddleware(req);
  const requestedDays = Number(url.searchParams.get('days') ?? 14);
  const days = Number.isFinite(requestedDays) ? requestedDays : 14;
  const usage = await db.getUsageStats(user.id, days);
  const limit = user.plan === 'free' ? 100 : null;

  return Response.json({
    success: true,
    summary: {
      email: user.email,
      name: user.name ?? null,
      picture: user.picture ?? null,
      plan: user.plan,
      role: user.role,
      dailyRequestsUsed: user.dailyRequests,
      limit,
      remainingRequests: limit === null ? null : Math.max(0, limit - user.dailyRequests),
      isSuspended: Boolean(user.isSuspended),
      lastResetDate: user.lastResetDate
    },
    usage
  }, {
    status: 200,
    headers: { 'Cache-Control': 'no-store' }
  });
}
