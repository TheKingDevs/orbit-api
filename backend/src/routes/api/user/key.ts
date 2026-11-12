import { sessionAuthMiddleware } from '@middlewares/authMiddleware';
import { db } from '@utils/db.util';

export async function userKeyRoute(req: Request): Promise<Response> {
  const user = db.refreshUserPlan(sessionAuthMiddleware(req));

  return Response.json({
    success: true,
    apiKey: user.apiKey || user.token,
    token: user.apiKey || user.token,
    plan: user.plan
  }, {
    status: 200,
    headers: { 'Cache-Control': 'no-store' }
  });
}
