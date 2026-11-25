import { InvalidParameterError } from '@errors/index';
import { sessionAuthMiddleware } from '@middlewares/authMiddleware';
import { db } from '@utils/db.util';

export async function deleteUserRoute(req: Request, url: URL): Promise<Response> {
  if (req.method !== 'DELETE' && req.method !== 'POST') {
    throw new InvalidParameterError('Método não suportado. Use DELETE ou POST.');
  }

  const ownerUser = sessionAuthMiddleware(req, ['owner']);

  let userIdToDelete = url.searchParams.get('id');
  if (!userIdToDelete && (req.method === 'POST' || req.headers.get('content-type')?.includes('json'))) {
    const body = await req.json().catch(() => null) as { id?: unknown } | null;
    if (typeof body?.id === 'string') userIdToDelete = body.id;
  }

  if (typeof userIdToDelete !== 'string' || !userIdToDelete.trim()) {
    throw new InvalidParameterError('ID do usuário não fornecido.');
  }

  const normalizedId = userIdToDelete.trim();
  const deleted = await db.deleteUserById(normalizedId);

  return Response.json({
    success: deleted,
    message: deleted ? `Usuário ID '${normalizedId}' excluído.` : 'Usuário não encontrado.',
    executedBy: ownerUser.email
  }, { status: deleted ? 200 : 404, headers: { 'Cache-Control': 'no-store' } });
}
