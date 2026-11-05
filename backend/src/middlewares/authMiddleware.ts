import { UserRole, User } from '@models/User';
import { db } from '@utils/db.util';
import { ForbiddenError, UnauthorizedError } from '@errors/index';
import { parseCookies } from '@utils/cookies.util';
import { CSRF_COOKIE, SESSION_COOKIE, sessionManager } from '@services/session.service';
import { markAuthenticatedRequest } from '@services/requestTrace.service';
import { normalizeBaseUrl } from '@utils/url.util';

const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const PREVIEW_QUERY = 'docs';
const PREVIEWABLE_PATHS = new Set([
  '/api/canvas/welcome',
  '/api/canvas/goodbye',
  '/api/canvas/effects',
  '/api/sticker/ttp',
  '/api/sticker/attp',
  '/api/sticker/brat',
  '/api/sticker/abrat'
]);

function getPreviewState(req: Request): { requested: boolean; allowed: boolean } {
  const url = new URL(req.url);

  return {
    requested: url.searchParams.get('preview') === PREVIEW_QUERY,
    allowed: req.method === 'GET' && PREVIEWABLE_PATHS.has(url.pathname)
  };
}

function assertTrustedOrigin(req: Request): void {
  const origin = normalizeBaseUrl(req.headers.get('origin'));
  if (!origin) return;

  const allowed = new Set(
    [normalizeBaseUrl(process.env.FRONTEND_URL), normalizeBaseUrl(process.env.BACKEND_URL)]
      .filter((value): value is string => Boolean(value))
  );

  if (!allowed.has(origin)) {
    throw new ForbiddenError('Origem da requisição não permitida.');
  }
}

function getSessionId(req: Request): string | null {
  return parseCookies(req.headers.get('cookie'))[SESSION_COOKIE] ?? null;
}

export function authMiddleware(req: Request, requiredRoles?: UserRole[], consumeToken: boolean = true): User {
  const sessionId = getSessionId(req);
  const preview = getPreviewState(req);

  let user: User;
  let limiterKey: string;

  if (sessionId) {
    const authenticated = sessionManager.authenticate(sessionId);

    if (!authenticated) {
      throw new UnauthorizedError('Sessão expirada ou inválida. Faça login novamente.');
    }

    if (UNSAFE_METHODS.has(req.method.toUpperCase())) {
      assertTrustedOrigin(req);

      const csrfToken = req.headers.get('x-csrf-token') ?? '';
      const csrfCookie = parseCookies(req.headers.get('cookie'))[CSRF_COOKIE] ?? '';

      if (!csrfToken || csrfToken !== csrfCookie || !sessionManager.verifyCsrf(csrfToken, authenticated.record.csrfHash)) {
        throw new ForbiddenError('Token CSRF inválido ou ausente.');
      }
    }

    const sessionUser = db.findById(authenticated.record.userId);

    if (!sessionUser) {
      sessionManager.destroy(sessionId);
      throw new UnauthorizedError('Usuário da sessão não encontrado.');
    }

    user = sessionUser;
    limiterKey = `session:${authenticated.sessionHash}`;
  } else {
    const url = new URL(req.url);
    const tokenFromQuery = url.searchParams.get('token');
    const authHeader = req.headers.get('authorization');

    let token = tokenFromQuery;

    if (!token && authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.slice('Bearer '.length).trim();
    }

    if (!token) {
      throw new ForbiddenError('Autenticação necessária. Faça login para continuar.');
    }

    if (preview.requested) {
      throw new ForbiddenError('A pré-visualização da documentação exige uma sessão autenticada.');
    }

    user = db.validateAndIncrementToken(token, req, consumeToken);

    if (requiredRoles && requiredRoles.length > 0 && !requiredRoles.includes(user.role)) {
      throw new ForbiddenError(`Seu cargo (${user.role}) não possui autorização para este recurso.`);
    }

    if (consumeToken) {
      markAuthenticatedRequest(req, user);
    }

    return user;
  }

  if (requiredRoles && requiredRoles.length > 0) {
    if (!requiredRoles.includes(user.role)) {
      throw new ForbiddenError(`Seu cargo (${user.role}) não possui autorização para este recurso.`);
    }
  }

  if (preview.requested) {
    if (!preview.allowed) {
      throw new ForbiddenError('Pré-visualização disponível apenas para endpoints de imagem da documentação.');
    }

    return db.validatePreviewAccess(user, req);
  }

  const validatedUser = db.validateUserAccess(user, limiterKey, req, consumeToken);

  if (consumeToken) {
    markAuthenticatedRequest(req, validatedUser);
  }

  return validatedUser;
}
