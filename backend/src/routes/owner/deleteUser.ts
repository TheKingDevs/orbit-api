import { sessionAuthMiddleware } from '@middlewares/authMiddleware';
import { db } from '@utils/db.util';

export async function deleteUserRoute(req: Request, url: URL): Promise<Response> {
  const ownerUser = sessionAuthMiddleware(req, ['owner']);
  const userIdToDelete = url.searchParams.get('id');

  if (!userIdToDelete) {
    return Response.json({ success: false, message: 'ID do usuário não fornecido.' }, { status: 400 });
  }

  const deleted = await db.deleteUserById(userIdToDelete);

  return Response.json({
    success: deleted,
    message: deleted ? `Usuário ID '${userIdToDelete}' excluído.` : `Usuário não encontrado.`,
    executedBy: ownerUser.email
  });
}
