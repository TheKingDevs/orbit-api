import { sessionAuthMiddleware } from '@middlewares/authMiddleware';
import { billingService } from '@modules/billing/billing.service';
import { db } from '@utils/db.util';

export async function billingCheckoutRoute(req: Request): Promise<Response> {
  const user = db.refreshUserPlan(sessionAuthMiddleware(req));
  const body = await req.json().catch(() => null);
  const checkout = await billingService.createCheckout(user, body?.plan);
  return Response.json({ success: true, ...checkout }, { headers: { 'Cache-Control': 'no-store' } });
}
