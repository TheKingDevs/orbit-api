import {
  CSRF_COOKIE,
  SESSION_COOKIE,
  sessionManager
} from '@services/session.service';
import { ForbiddenError } from '@errors/index';
import {
  isSecureRequest,
  parseCookies,
  serializeCookie,
  withCookies
} from '@utils/cookies.util';

function clearedCookies(req: Request): string[] {
  const secure = isSecureRequest(req);

  return [
    serializeCookie(SESSION_COOKIE, '', {
      maxAge: 0,
      path: '/',
      httpOnly: true,
      secure,
      sameSite: 'Lax'
    }),
    serializeCookie(CSRF_COOKIE, '', {
      maxAge: 0,
      path: '/',
      httpOnly: false,
      secure,
      sameSite: 'Lax'
    })
  ];
}

export async function authLogoutRoute(req: Request): Promise<Response> {
  const cookies = parseCookies(req.headers.get('cookie'));
  const sessionId = cookies[SESSION_COOKIE];

  if (sessionId) {
    const authenticated = sessionManager.authenticate(sessionId);

    if (authenticated) {
      const csrfToken = req.headers.get('x-csrf-token') ?? '';
      const csrfCookie = cookies[CSRF_COOKIE] ?? '';

      const validCsrf =
        csrfToken &&
        csrfToken === csrfCookie &&
        sessionManager.verifyCsrf(csrfToken, authenticated.record.csrfHash);

      if (!validCsrf) {
        throw new ForbiddenError('Token CSRF inválido ou ausente.');
      }
    }

    sessionManager.destroy(sessionId);
  }

  const response = withCookies(
    Response.json({ success: true, message: 'Sessão encerrada.' }),
    clearedCookies(req)
  );

  response.headers.set('Cache-Control', 'no-store');
  return response;
}
