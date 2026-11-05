import { authMiddleware } from '@middlewares/authMiddleware';

export async function userKeyRoute(req: Request): Promise<Response> {
  const user = authMiddleware(req, undefined, false);

  return Response.json({
    success: true,
    apiKey: user.token,
    plan: user.plan
  }, {
    status: 200,
    headers: { 'Cache-Control': 'no-store' }
  });
}
