import { authMiddleware } from '@middlewares/authMiddleware';
import { db } from '@utils/db.util';
import { PlanType } from '@models/User';

export async function updatePlanRoute(req: Request, url: URL): Promise<Response> {
  const ownerUser = authMiddleware(req, ['owner']);
  const targetToken = url.searchParams.get('targetToken');
  const newPlan = (url.searchParams.get('plan') || 'free') as PlanType;

  if (!targetToken) {
    return Response.json({ success: false, message: 'targetToken é obrigatório.' }, { status: 400 });
  }

  const user = db.findByToken(targetToken);
  if (!user) {
    return Response.json({ success: false, message: 'Usuário não encontrado.' }, { status: 404 });
  }

  user.plan = newPlan;

  return Response.json({
    success: true,
    message: `Plano atualizado para '${newPlan}'.`,
    user,
    executedBy: ownerUser.email
  });
}
