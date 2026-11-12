import { sessionAuthMiddleware } from '@middlewares/authMiddleware';
import { BASIC_MONTHLY_LIMIT, db, FREE_DAILY_LIMIT } from '@utils/db.util';
import { ValidatorUtil } from '@utils/validator.util';
import { User } from '@models/User';
import { ForbiddenError } from '@errors/index';
import { addOneCalendarMonth } from '@utils/plan.util';

export async function userManagerRoute(req: Request): Promise<Response> {
  const adminUser = sessionAuthMiddleware(req, ['admin', 'owner']);

  if (req.method === 'POST') {
    const body = await req.json().catch(() => ({}));
    const dto = ValidatorUtil.validateUserCreation(body);

    if (dto.role === 'admin' && adminUser.role !== 'owner') {
      throw new ForbiddenError('Somente o owner pode criar contas administrativas.');
    }

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
      monthlyRequests: 0,
      lastMonthlyResetMonth: new Date().toISOString().slice(0, 7),
      ...(dto.plan !== 'free' && dto.role !== 'owner'
        ? { planExpiresAt: addOneCalendarMonth().toISOString() }
        : {}),
      violationCount: 0
    };

    await db.addUser(newUser);

    return Response.json({
      success: true,
      message: 'Novo usuário criado com sucesso!',
      user: newUser
    }, { status: 201 });
  }

  const users = db.getAllUsers().map(rawUser => {
    const user = db.refreshUserSuspension(db.refreshUserPlan(rawUser));
    return {
      id: user.id,
      email: user.email,
      name: user.name ?? null,
      picture: user.picture ?? null,
      plan: user.plan,
      role: user.role,
      dailyRequests: user.dailyRequests,
      monthlyRequests: user.monthlyRequests,
      requestsUsed: user.plan === 'free' ? user.dailyRequests : user.monthlyRequests,
      limit: user.plan === 'free' ? FREE_DAILY_LIMIT : user.plan === 'basic' ? BASIC_MONTHLY_LIMIT : null,
      limitPeriod: user.plan === 'free' ? 'day' : 'month',
      planExpiresAt: user.planExpiresAt ?? null,
      isSuspended: Boolean(user.isSuspended)
    };
  });

  return Response.json({
    success: true,
    users,
    requestedBy: adminUser.email
  }, { headers: { 'Cache-Control': 'no-store' } });
}
