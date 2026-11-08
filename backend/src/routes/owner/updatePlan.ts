import { sessionAuthMiddleware } from '@middlewares/authMiddleware';
import { db } from '@utils/db.util';
import { PlanType } from '@models/User';

export async function updatePlanRoute(req: Request, url: URL): Promise<Response> {
  const ownerUser = sessionAuthMiddleware(req, ['owner']);
  const targetApiKey = url.searchParams.get('targetApiKey') || url.searchParams.get('targetToken');
  const newPlan = (url.searchParams.get('plan') || 'free') as PlanType;

  if (!targetApiKey) {
    return Response.json({ success: false, message: 'targetApiKey é obrigatório.' }, { status: 400 });
  }

  const user = db.findByApiKey(targetApiKey);
  if (!user) {
    return Response.json({ success: false, message: 'Usuário não encontrado.' }, { status: 404 });
  }

  user.plan = newPlan;
  await db.saveUser(user);

  return Response.json({
    success: true,
    message: `Plano atualizado para '${newPlan}'.`,
    user,
    executedBy: ownerUser.email
  });
}
