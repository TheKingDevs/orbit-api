import { db } from '@utils/db.util';
import {
  CSRF_COOKIE,
  SESSION_COOKIE,
  sessionManager
} from '@services/session.service';
import {
  isSecureRequest,
  parseCookies,
  serializeCookie,
  withCookies
} from '@utils/cookies.util';

function sessionCookies(req: Request, id: string, csrfToken: string, expiresAt: number): string[] {
  const secure = isSecureRequest(req);
  const maxAge = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));

  return [
    serializeCookie(SESSION_COOKIE, id, {
      maxAge,
      path: '/',
      httpOnly: true,
      secure,
      sameSite: 'Lax'
    }),
    serializeCookie(CSRF_COOKIE, csrfToken, {
      maxAge,
      path: '/',
      httpOnly: false,
      secure,
      sameSite: 'Lax'
    })
  ];
}

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

function noStore(response: Response): Response {
  response.headers.set('Cache-Control', 'no-store');
  return response;
}

export async function authSessionRoute(req: Request): Promise<Response> {
  const cookies = parseCookies(req.headers.get('cookie'));
  const sessionId = cookies[SESSION_COOKIE];

  if (!sessionId) {
    return noStore(withCookies(
      Response.json({ success: false, message: 'Não autenticado.' }, { status: 401 }),
      []
    ));
  }

  const authenticated = sessionManager.authenticate(sessionId);

  if (!authenticated) {
    return noStore(withCookies(
      Response.json({ success: false, message: 'Sessão expirada.' }, { status: 401 }),
      clearedCookies(req)
    ));
  }

  const user = db.findById(authenticated.record.userId);

  if (!user || user.isSuspended) {
    sessionManager.destroy(sessionId);

    return noStore(withCookies(
      Response.json({ success: false, message: 'Sessão inválida.' }, { status: 401 }),
      clearedCookies(req)
    ));
  }

  const responseCookies: string[] = [];

  if (sessionManager.needsRotation(authenticated.record)) {
    const rotated = await sessionManager.rotate(sessionId);

    if (rotated) {
      responseCookies.push(...sessionCookies(req, rotated.id, rotated.csrfToken, rotated.expiresAt));
    }
  }

  return noStore(withCookies(
    Response.json({
      success: true,
      user: {
        email: user.email,
        name: user.name ?? null,
        picture: user.picture ?? null,
        plan: user.plan,
        role: user.role,
        dailyRequests: user.dailyRequests,
        limit: user.plan === 'free' ? 100 : null
      }
    }),
    responseCookies
  ));
}
