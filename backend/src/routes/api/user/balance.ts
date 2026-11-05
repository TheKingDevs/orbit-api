import { authMiddleware } from '@middlewares/authMiddleware';

export async function userBalanceRoute(req: Request): Promise<Response> {
  const user = authMiddleware(req, undefined, false);

  const limit = user.plan === 'free' ? 100 : 'Ilimitado';
  const remaining = user.plan === 'free' ? Math.max(0, 100 - user.dailyRequests) : 'Ilimitado';

  return Response.json({
    success: true,
    email: user.email,
    plan: user.plan,
    dailyRequestsUsed: user.dailyRequests,
    limit,
    remainingRequests: remaining,
    isSuspended: user.isSuspended || false,
    lastResetDate: user.lastResetDate
  }, { status: 200 });
}
