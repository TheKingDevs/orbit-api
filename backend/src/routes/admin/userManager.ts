import { authMiddleware } from '@middlewares/authMiddleware';
import { db } from '@utils/db.util';
import { ValidatorUtil } from '@utils/validator.util';
import { User } from '@models/User';

export async function userManagerRoute(req: Request): Promise<Response> {
  const adminUser = authMiddleware(req, ['admin', 'owner']);

  if (req.method === 'POST') {
    const body = await req.json().catch(() => ({}));
    const dto = ValidatorUtil.validateUserCreation(body);

    const newUser: User = {
      id: db.generateId(),
      email: dto.email,
      token: db.generateToken(),
      plan: dto.plan,
      role: dto.role,
      dailyRequests: 0,
      lastResetDate: new Date().toISOString().split('T')[0],
      violationCount: 0
    };

    db.addUser(newUser);

    return Response.json({
      success: true,
      message: 'Novo usuário criado com sucesso!',
      user: newUser
    }, { status: 201 });
  }

  return Response.json({
    success: true,
    users: db.getAllUsers(),
    requestedBy: adminUser.email
  });
}
