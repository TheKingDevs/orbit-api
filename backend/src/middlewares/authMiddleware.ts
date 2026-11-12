import { UserRole, User } from '@models/User';
import { db } from '@utils/db.util';
import { AccountSuspendedError, ForbiddenError, UnauthorizedError } from '@errors/index';
import { parseCookies } from '@utils/cookies.util';
import { CSRF_COOKIE, SESSION_COOKIE, sessionManager } from '@services/session.service';
import { markAuthenticatedRequest } from '@services/requestTrace.service';
import { normalizeBaseUrl } from '@utils/url.util';
import { getConfiguredCorsOrigins } from '@utils/cors.util';
import { recordFailedApiKeyAttempt } from '@utils/authRateLimit.util';

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
    [
      normalizeBaseUrl(process.env.FRONTEND_URL),
      normalizeBaseUrl(process.env.BACKEND_URL),
      ...getConfiguredCorsOrigins()
    ]
      .filter((value): value is string => Boolean(value))
  );

  if (!allowed.has(origin)) {
    throw new ForbiddenError('Origem da requisição não permitida.');
  }
}

function getSessionId(req: Request): string | null {
  return parseCookies(req.headers.get('cookie'))[SESSION_COOKIE] ?? null;
}

/**
 * Autenticação estrita por sessão (Cookie).
 * Utilizada exclusivamente em rotas de usuário/painel (key, usage, balance),
 * e rotas de administração (admin, owner).
 * A API Key (token) NUNCA deve ser aceita para autenticação ou login nessas rotas.
 */
export function sessionAuthMiddleware(req: Request, requiredRoles?: UserRole[]): User {
  const sessionId = getSessionId(req);

  if (!sessionId) {
    throw new UnauthorizedError('Autenticação necessária. Faça login para continuar.');
  }

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

  db.refreshUserSuspension(sessionUser);
  if (sessionUser.isSuspended) {
    throw new AccountSuspendedError(`Esta conta está suspensa${sessionUser.suspensionType === 'temporary' ? ' temporariamente' : ' permanentemente'}. Motivo: ${(sessionUser.suspensionReason || 'Violação das diretrizes').slice(0, 500)}`, sessionUser.suspensionType !== 'temporary');
  }

  db.refreshUserPlan(sessionUser);

  if (requiredRoles && requiredRoles.length > 0 && !requiredRoles.includes(sessionUser.role)) {
    throw new ForbiddenError(`Seu cargo (${sessionUser.role}) não possui autorização para este recurso.`);
  }

  return sessionUser;
}

/**
 * Middleware para consumo dos recursos da API.
 * A API Key é destinada exclusivamente para execução das rotas da API (downloads, IA, stickers, etc.).
 *
 * Suporta:
 * 1. Sessão ativa via cookie (para pré-visualização e testes pela interface web)
 * 2. Header `x-apikey` (ou `x-api-key`)
 * 3. API keys não são aceitas em query strings para evitar exposição em logs/histórico.
 *
 * Os parâmetros `token` e o header `Authorization: Bearer` foram removidos propositalmente para mitigar vulnerabilidades,
 * garantindo que a API Key não seja tratada como credencial de autenticação de sessão.
 */
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

    user = db.refreshUserSuspension(db.refreshUserPlan(sessionUser));
    limiterKey = `session:${authenticated.sessionHash}`;
  } else {
    const apiKeyHeader = req.headers.get('x-apikey') || req.headers.get('x-api-key');
    const apiKey = apiKeyHeader?.trim();

    if (!apiKey) {
      recordFailedApiKeyAttempt(req);
      throw new UnauthorizedError('API Key necessária. Envie a chave no header x-apikey ou x-api-key.');
    }

    if (preview.requested) {
      throw new ForbiddenError('A pré-visualização da documentação exige uma sessão autenticada.');
    }

    try {
      user = db.validateAndIncrementApiKey(apiKey, req, consumeToken);
    } catch (error) {
      if (error instanceof UnauthorizedError) recordFailedApiKeyAttempt(req);
      throw error;
    }

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
