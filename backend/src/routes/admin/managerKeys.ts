import { sessionAuthMiddleware } from '@middlewares/authMiddleware';
import { db } from '@utils/db.util';

export async function managerKeysRoute(req: Request): Promise<Response> {
  const adminUser = sessionAuthMiddleware(req, ['admin', 'owner']);

  const keys = db.getAllUsers().map(u => ({
    email: u.email,
    apiKey: u.apiKey || u.token,
    token: u.apiKey || u.token,
    plan: u.plan,
    dailyRequests: u.dailyRequests,
    limit: u.plan === 'free' ? 100 : 'Ilimitado',
    isSuspended: u.isSuspended || false,
    violations: u.violationCount || 0
  }));

  return Response.json({
    success: true,
    keys,
    requestedBy: adminUser.email
  });
}
