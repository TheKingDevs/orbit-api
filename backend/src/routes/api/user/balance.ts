import { authMiddleware } from '@middlewares/authMiddleware';
import { BASIC_MONTHLY_LIMIT, db, FREE_DAILY_LIMIT } from '@utils/db.util';

export async function userBalanceRoute(req: Request): Promise<Response> {
  const user = db.refreshUserPlan(authMiddleware(req, undefined, false));

  const numericLimit = user.plan === 'free'
    ? FREE_DAILY_LIMIT
    : user.plan === 'basic'
      ? BASIC_MONTHLY_LIMIT
      : null;
  const requestsUsed = user.plan === 'free' ? user.dailyRequests : user.monthlyRequests;
  const limit = numericLimit ?? 'Ilimitado';
  const remaining = numericLimit === null
    ? 'Ilimitado'
    : Math.max(0, numericLimit - requestsUsed);

  return Response.json({
    success: true,
    email: user.email,
    plan: user.plan,
    dailyRequestsUsed: user.dailyRequests,
    monthlyRequestsUsed: user.monthlyRequests,
    requestsUsed,
    limit,
    limitPeriod: user.plan === 'free' ? 'day' : 'month',
    planExpiresAt: user.planExpiresAt ?? null,
    remainingRequests: remaining,
    isSuspended: user.isSuspended || false,
    lastResetDate: user.lastResetDate
  }, { status: 200 });
}
