import { sessionAuthMiddleware } from '@middlewares/authMiddleware';
import { db } from '@utils/db.util';
import { ValidatorUtil } from '@utils/validator.util';
import { User } from '@models/User';
import { ForbiddenError } from '@errors/index';

export async function userManagerRoute(req: Request): Promise<Response> {
  const adminUser = sessionAuthMiddleware(req, ['admin', 'owner']);

  if (req.method === 'POST') {
    const body = await req.json().catch(() => ({}));
    const dto = ValidatorUtil.validateUserCreation(body);

    if (dto.role === 'owner') {
      const ownerEmail = process.env.OWNER_EMAIL?.trim().toLowerCase();
      if (adminUser.role !== 'owner' || !ownerEmail || dto.email.trim().toLowerCase() !== ownerEmail) {
        throw new ForbiddenError('O cargo owner é reservado ao e-mail configurado em OWNER_EMAIL.');
      }
    }

    const newKey = db.generateApiKey();
    const newUser: User = {
      id: db.generateId(),
      email: dto.email,
      apiKey: newKey,
      token: newKey,
      plan: dto.plan,
      role: dto.role,
      dailyRequests: 0,
      lastResetDate: new Date().toISOString().split('T')[0],
      violationCount: 0
    };

    await db.addUser(newUser);

    return Response.json({
      success: true,
      message: 'Novo usuário criado com sucesso!',
      user: newUser
    }, { status: 201 });
  }

  const users = db.getAllUsers().map(user => ({
    id: user.id,
    email: user.email,
    name: user.name ?? null,
    picture: user.picture ?? null,
    plan: user.plan,
    role: user.role,
    dailyRequests: user.dailyRequests,
    limit: user.plan === 'free' ? 100 : null,
    isSuspended: Boolean(user.isSuspended)
  }));

  return Response.json({
    success: true,
    users,
    requestedBy: adminUser.email
  }, { headers: { 'Cache-Control': 'no-store' } });
}
